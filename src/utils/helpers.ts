import { AbortablePromise } from './promise.ts'
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

function voidFn(..._args: AnyArray) {}

type TimerId = Returns<typeof setTimeout>
type TimerObj = { timer: TimerId, clear: SyncFn }

function makeTimer<P extends AnyArray>(
	method: 'Timeout' | 'Interval',
	callback: SyncFn<P, void, TimerObj>,
	delay?: number,
	args: P = [] as unknown as P,
): TimerObj {

	const clear = () => timers[`clear${method}`](timer)
	const timer = timers[`set${method}`](
		function (..._args: P) {
			callback.apply(
				{ timer, clear },
				_args
			)
		},
		delay,
		...args
	) as unknown as TimerId

	return { timer, clear }
}

function delay(timeout: number): Promise<TimerObj>
function delay(callback: SyncFn<AnyArray, void, TimerObj>, timeout?: number, args?: AnyArray ): TimerObj
function delay<P extends AnyArray>(
	timeout_callback: number | SyncFn<P, void, TimerObj>,
	timeout?: number,
	args?: P
) {
	return (
		typeof timeout_callback === 'function'
			? makeTimer('Timeout', timeout_callback, timeout, args)
			: new Promise(res => delay(res, timeout_callback, args))
	)
}

function repeat<P extends AnyArray>(
	callback: SyncFn<P, void, TimerObj>,
	interval: number = '.5'.s,
	args?: P
) {
	return makeTimer('Interval', callback, interval, args)
}

function until<P extends AnyArray>(
	predicate: SyncFn<P, boolean | void>,
	interval: number = '.5'.s,
	timeout: number = '2'.m,
	args: P = [] as unknown as P
) {
	return new AbortablePromise<void>(
		function (resolve, reject, onAbort) {

			const delayTimer = delay(
				function () {
					repeatTimer.clear()
					reject(new Error(`Timeout after ${timeout}`))
				},
				timeout
			)

			const repeatTimer = repeat(
				function () {
					if (!predicate(...args)) return

					delayTimer.clear()
					this.clear()
					resolve()
				},
				interval
			)

			onAbort(
				function (this) {
					delayTimer.clear()
					repeatTimer.clear()
					reject(this.reason)
				}
			)
		},
	)
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

const ROOT = Symbol('import-root')

type HotImport = {
	(path: string, opt?: ImportCallOptions): Promise<any>
	bind(opts: { root: string }): HotImport
	root: string
}

const HotImport = function (root?: string) {

	const self: any = async function (path: string, opt?: ImportCallOptions) {
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
	}

	return defineProperties(self,
		{
			[ROOT]: {
				hidden: true,
				writable: true,
				value: root ?? __rootdir,
			},
			root: { get: () => self[ROOT] },
			bind: { value:
				function ({ root }: { root: string }) {
					self[ROOT] = root
					return self
				}
			},
		}
	)
} as unknown as {
	new(root?: string): HotImport
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
