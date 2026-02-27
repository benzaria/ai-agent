import { pathToFileURL } from 'node:url'

const defineProperties = <T, P extends PropertyDescriptorMap>(o: T, p: P) =>
	Object.defineProperties(o, p) as DefineProperties<T, P>

function voidFn() {}

function lazy<P extends AnyArray, R, T>(factory: AsyncFn<P, R, T>) {
	let L: Promise<R> | null = null

	function lazed(this: T, ...args: P): Promise<R> {
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

function delay(timeout?: number, callback?: AnyFunction): Promise<void | number> {
	return (
		callback
			? Promise.resolve(setTimeout(callback, timeout))
			: new Promise(res => delay(timeout, res))
	)
}

const importJson = async (path: string) => (
	await import(
		pathToFileURL(path).href,
		{ with: { type: 'json' } }
	)
).default

export {
	voidFn,
	lazy,
	queue,
	delay,
	importJson,
}
