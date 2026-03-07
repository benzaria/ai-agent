
type PropertyDescriptorMap = {
    [key: PropertyKey]: PropertyDescriptor & {
			hidden?: boolean
		}
	}

type DefineProperties<O,
	P extends PropertyDescriptorMap
> = Prettify<O &
	{
		[K in keyof P as
			P[K]['hidden'] extends true
					? never
					: K
		]:
			'get' extends keyof P[K]
				? Returns<P[K]['get']>
				: P[K]['value']
	}
>

type Spacer =
	| string
	| number

type Replacer<K extends PropertyKey, V> =
	| null
	| Spacer[]
	| SyncFn<[key: K, value: V], any>

type Entries<K, V> = [K, V][]

type ObjInput<K extends PropertyKey, V> =
	| Entries<K, V>
	| Record<K, V>

const defineProperties = <T, P extends PropertyDescriptorMap>(o: T, p: P) =>
	Object.defineProperties(o, p) as DefineProperties<T, P>

const fromEntries = <K extends PropertyKey, V>(entries: Entries<K, V>) =>
	Object.fromEntries(entries) as Record<K, V>

const keys = <K extends PropertyKey>(o: Record<K, unknown>) =>
	Object.keys(o) as K[]

const values = <V>(o: Record<PropertyKey, V>) =>
	Object.values(o) as V[]

const entries = <K extends PropertyKey, V>(o: Record<K, V>) =>
	Object.entries(o) as Entries<K, V>


type IterateCb<K extends PropertyKey, V, U = void> =
	SyncFn<[value: V, key: K, store: Record<K, V>], U>

class Obj<K extends PropertyKey, V> implements Iterable<[K, V]> {
	constructor(store?: ObjInput<K, V>) {
		this.clear(store)
	}

	/* Init */

	clear(store: ObjInput<K, V> | EmptyObject = {}) {
		this.#store = Array.isArray(store)
			? fromEntries(store)
			: { ...store } as any

		//? Set `#cache` as well
		this.#dirty = true
		this.#size = this.entries().length

		return this
	}

	#store: Record<K, V> = {} as any
	#cache: Entries<K, V> = []
	#dirty: boolean = false
	#size: number = 0

	/* Utils */

	json(spacer?: Spacer): string
	json(replacer?: Replacer<K, V>, spacer?: Spacer): string
	json(
		spacer_replacer?: Replacer<K, V> | Spacer,
		spacer?: Spacer
	) {
		let _replacer: Replacer<K, V> | undefined
		let _spacer: Spacer | undefined

		if (
			typeof spacer_replacer === 'function' ||
			Array.isArray(spacer_replacer) ||
			spacer_replacer === null
		) {
			_replacer = spacer_replacer
			_spacer = spacer
		}

		else {
			_spacer = spacer_replacer
			_replacer = null
		}

		return JSON.stringify(this.#store, _replacer as any, _spacer)
	}

	clone() {
		return new Obj(this.#store)
	}

	get store() {
		return { ...this.#store }
	}

	get size() {
		return this.#size
	}

	/* Core */

	has(key: K) {
		return key in this.#store
	}

	get(key: K): V | undefined {
		return this.#store[key]
	}

	set(key: K, value: V) {
		if (!this.has(key)) this.#size++
		this.#store[key] = value
		this.#dirty = true
		return this
	}

	delete(key: K) {
		if (this.has(key)) {
			delete this.#store[key]
			this.#dirty = true
			this.#size--
			return true
		}

		return false
	}

	/* Iteration */

	keys = () => keys(this.#store)
	values = () => values(this.#store)
	entries() {
		if (this.#dirty) {
			this.#cache = entries(this.#store)
			this.#dirty = false
		}

		return this.#cache
	}

	forEach(callback: IterateCb<K, V>, thisArg?: any) {
		for (const key in this.#store) {
			const value = this.#store[key]

			callback.call(thisArg, value, key, this.#store)
		}

		return this
	}

	*[Symbol.iterator](): Iterator<[K, V]> {
		for (const key in this.#store) {
			const value = this.#store[key]

			yield [key, value]
		}
	}

	/* Functional */

	/** @private */
	_map<U>(callback: IterateCb<K, V, U>, thisArg?: any) {
		const result: Record<K, U> = {} as any

		for (const key in this.#store) {
			const value = this.#store[key]

			result[key] =
				callback.call(thisArg, value, key, this.#store)
		}

		return result
	}

	/** @private */
	_filter(callback: IterateCb<K, V, unknown>, thisArg?: any) {
		const result: Record<K, V> = {} as any

		for (const key in this.#store) {
			const value = this.#store[key]

			if (callback.call(thisArg, value, key, this.#store))
				result[key] = value
		}

		return result
	}

	map<U>(callback: IterateCb<K, V, U>, thisArg?: any) {
		return new Obj(this._map(callback, thisArg))
	}

	filter(callback: IterateCb<K, V, unknown>, thisArg?: any) {
		return new Obj(this._filter(callback, thisArg))
	}

	mapThis(callback: IterateCb<K, V, V>, thisArg?: any) {
		return this.clear(this._map(callback, thisArg))
	}

	filterThis(callback: IterateCb<K, V, unknown>, thisArg?: any) {
		return this.clear(this._filter(callback, thisArg))
	}
}

export type { ObjInput }
export {
	defineProperties,
	fromEntries,
	entries,
	values,
	keys,
	Obj,
}
