import { defineProperties } from './object.ts'
import { pathToFileURL } from 'node:url'
import { Color, echo } from './tui.ts'
import * as timers from 'node:timers'
import { resolve } from 'node:path'
import '@benzn/to-ms/extender'

declare global {
	const __rootdir: string
	const __agentdir: string
}

// @ts-expect-error Property '__rootdir' does not exist on type 'typeof globalThis'.
global.__rootdir = resolve(import.meta.dirname, '../..')
// @ts-expect-error Property '__agentdir' does not exist on type 'typeof globalThis'.
global.__agentdir = resolve(__rootdir, 'agent-files')

function voidFn() {}

type TimerId = ReturnType<typeof setTimeout>
type TimerObj = { timer: TimerId, clear: SyncFn }

function makeTimer<P extends AnyArray>(
	method: 'Timeout' | 'Interval',
	callback: SyncFn<P, void, TimerObj>,
	delay?: number,
	args?: P,
) {
	const clear = timers[`clear${method}`]
	const id = timers[`set${method}`](
		function (..._args: P) {
			callback.apply(
				{ timer: id, clear: () => clear(id) },
				_args
			)
		},
		delay,
		...(args ?? [])
	) as unknown as TimerId

	return { timer: id, clear: () => clear(id) }
}

function delay(timeout: number): Promise<TimerObj>
function delay(timeout: number, callback?: SyncFn<AnyArray, void, TimerObj>, args?: AnyArray ): TimerObj
function delay<P extends AnyArray>(timeout: number, callback?: SyncFn<P, void, TimerObj>, args?: P) {
	return (
		callback
			? makeTimer('Timeout', callback, timeout, args)
			: new Promise(res => delay(timeout, res, args))
	)
}

function repeat<P extends AnyArray>(interval: number, callback: SyncFn<P, void, TimerObj>, args?: P) {
	return makeTimer('Interval', callback, interval, args)
}

function until(
	predicate: SyncFn<[], boolean>,
	interval: number = '.5'.s,
	timeout: number = '2'.m,
) {
	return new Promise<void>((res, rej) => {

		const _delay = delay(timeout, function () {
			_repeat.clear()
			rej(new Error(`\`until\` Timeout after ${timeout}`))
		})

		const _repeat = repeat(interval, function () {
			if (!predicate()) return

			_delay.clear()
			this.clear()
			res()
		})

	})
}

function lazy<P extends AnyArray, R, T>(factory: AsyncFn<P, R, T>) {
	let L: Promise<R> | null = null, lastArgs: P | null = null

	function lazed(this: T, ...args: P): Promise<R> {
		lastArgs = args

		if (!L) {
			L = factory.call(this, ...args)
				.catch(err => {
					L = null // allow retry
					throw err
				})
		}

		return L
	}

	return defineProperties(lazed,
		{
			idle: { value: () => L },
			clear: { value: () => { L = null } },
			pending: { get: () => !!L },
			reload: { value:
				async function (this: T, ...args: P): Promise<R> {
					L = null
					return lazed.call(this, ...(args.length ? args : (lastArgs ?? [])) as P)
				}
			},
		}
	)
}

function queue<P extends AnyArray, R, T>(factory: AsyncFn<P, R, T>) {
	let Q: Promise<unknown> = Promise.resolve(), count = 0

	function queued(this: T, ...args: P): Promise<R> {
		count++

		const R = Q.then(() => factory.call(this, ...args)) // factory returns Promise<R>
		Q = R
			.finally(() => { count > 0 && count-- }) // reducing the pending count
			.catch(voidFn) // keep queue alive if factory throws

		return R // promise resolves with factory's value
	}

	return defineProperties(queued,
		{
			idle: { value: () => Q.then(voidFn) },
			clear: { value: () => { Q = Promise.resolve(), count = 0 } },
			pending: { get: () =>  !!count },
			count: { get: () => count },
		}
	)
}

const ROOT = Symbol('root')

type HotImport = {
	(path: string, opt?: ImportCallOptions): Promise<any>
	bind(opts: { root: string }): HotImport
	root: string
}

const HotImport = function (root?: string) {

	const self = async function (path: string, opt?: ImportCallOptions) {
		const url = pathToFileURL(resolve(self.root, path))
		url.searchParams.set('v', '' + Date.now())
		echo.vrb([Color[256][177], 'import'], url.pathname)

		if (path.endsWith('json'))
			return (
				await import(url.href, {
					...opt,
					with: {
						...opt?.with,
						type: 'json'
					}
				})
			).default

		return import(url.href, opt)
	} as HotImport

	return defineProperties(self,
		{
			[ROOT]: {
				hidden: true,
				writable: true,
				value: root ?? __rootdir,
			},
			root: { get: () => (self as any)[ROOT] },
			bind: { value:
				function ({ root }: { root: string }) {
					(self as any)[ROOT] = root
					return self
				}
			},
		}
	)
} as unknown as {
	new (root?: string): HotImport
}

const hotImport = new HotImport()

export {
	HotImport,
	hotImport,
	voidFn,
	repeat,
	until,
	delay,
	queue,
	lazy,
}
