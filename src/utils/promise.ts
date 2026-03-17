
type Resolve<T> = SyncFn<[value: T | PromiseLike<T>]>

type Reject = SyncFn<[reason?: any]>

type AbortListener = SyncFn<[evt: Event], any, AbortSignal>

type OnAbort = Prettify<
	& SyncFn<[listener: AbortListener]>
	& { signal: AbortSignal }
>

class AbortablePromise<T> extends Promise<T> {
	static get [Symbol.species]() { return Promise }

	constructor(
		executor: (
			resolve: Resolve<T>,
			reject: Reject,
			onAbort: OnAbort
		) => void,
		controller: AbortController = new AbortController()
	) {
		let listener!: AbortListener

		super((resolve, reject) => {

			if (controller.signal.aborted) {
				reject(controller.signal.reason)
				return
			}

			const onAbort = (fn: AbortListener) => listener = fn
			onAbort.signal = controller.signal

			executor(resolve, reject, onAbort)

			if (listener) controller.signal
				.addEventListener('abort', listener, { once: true })
		})

		this.listener ??= listener
		this.controller ??= controller
	}

	private listener: AbortListener
	private controller: AbortController

	private chain<U>(next: Promise<U>) {
		return new AbortablePromise<U>(
			(resolve, reject, onAbort) => {

				if (onAbort.signal.aborted) {
					reject(onAbort.signal.reason)
					return
				}

				onAbort(this.listener)
				next.then(resolve, reject)
			},
			this.controller
		)
	}

	abort<T>(reason?: NotFunction<T>): this
	abort<T>(reasonCb?: SyncFn<[], T>): this
	abort(reason: any = new Error('Aborted')) {
		this.controller.abort(
			typeof reason === 'function'
				? reason()
				: reason
		)

		return this
	}

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
	): AbortablePromise<TResult1 | TResult2> {
		return this.chain(
			super.then(onfulfilled, onrejected)
		)
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
	): AbortablePromise<T | TResult> {
		return this.chain(
			super.catch(onrejected)
		)
	}

	finally(
		onfinally?: (() => void) | null
	): AbortablePromise<T> {
		return this.chain(
			super.finally(onfinally)
		)
	}

}

export { AbortablePromise }

export type {
	AbortListener,
	OnAbort,
}
