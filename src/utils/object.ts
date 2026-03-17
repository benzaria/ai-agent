import type { _Event, _EventNames } from './event.ts'

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

type UpdateEvents<T extends string> = {
	[K in 'set' | 'map' | 'delete' | 'filter']: _EventNames
}

type IterateCb<K extends PropertyKey, V, U = void> =
	SyncFn<[value: V, key: K, store: Record<K, V>], U>

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

const eventKeys = ['set', 'map', 'delete', 'filter'] as const

class Obj<K extends PropertyKey, V, O extends Record<K, V> = Record<K ,V>, E extends string = ''> implements Iterable<[K, V]> {
	constructor(
		store?: ObjInput<K, V>,
		eventName?: E
	) {
		this.clear(store)

		const events = fromEntries(
			eventKeys.map(key => [key, `${eventName!}-${key}`])
		)

		this.#events = events as any
	}

	/* Init */

	clear(store?: ObjInput<K, V>) {
		this.#store = Array.isArray(store)
			? fromEntries(store)
			: { ...store } as any

		//? Set `#entries`
		this.#dirty = true
		this.#size = this.entries().length

		//? Set `#keys` and `#values`
		queueMicrotask(
			() => {
				this.keys()
				this.values()
			}
		)

		return this
	}

	#events!: UpdateEvents<E>
	#store!: Record<K, V>
	#dirty!: boolean
	#size!: number

	#entries: Entries<K, V> = []
	#values: V[] = []
	#keys: K[] = []

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

	get<P extends K>(key: P) {
		return this.#store[key] as (O & Record<K, V>)[P] | undefined
	}

	/** @private */
	private _setValue(key: K, value: V) {
		if (!this.has(key)) this.#size++
		this.#store[key] = value
	}

	/** @private */
	private _setRecord(obj: Partial<Record<K, V>>) {
		for (const key in obj) {
			this._setValue(key, obj[key]!)
		}
	}

	set(obj: Partial<O & Record<K, V>>): this
	set<P extends K>(key: P, value: (O & Record<K, V>)[P]): this
	set(key_obj: K | Partial<O & Record<K, V>>, value?: V) {

		if (typeof key_obj === 'object') {
			this._setRecord(key_obj)
		}
		else {
			this._setValue(key_obj, value!)
		}

		this.#dirty = true
		event.emit(this.#events.set)
		return this
	}

	/** @private */
	private _deleteValue(key: K) {
		if (this.has(key)) {
			delete this.#store[key]
			this.#dirty = true
			this.#size--
		}
	}

	/** @private */
	private _deleteRecord(keys: K[]) {
		for (const key of keys) {
			this._deleteValue(key)
		}
	}

	delete(key: K): this
	delete(keys: K[]): this
	delete(key_keys: K | K[]) {

		if (typeof key_keys === 'object') {
			this._deleteRecord(key_keys)
		}
		else {
			this._deleteValue(key_keys)
		}

		event.emit(this.#events.delete)
		return this
	}

	/* Iteration */

	keys() {
		if(this.#dirty)
			this.#keys = keys(this.#store)

		this.#dirty = false
		return this.#keys
	}
	values() {
		if(this.#dirty)
			this.#values = values(this.#store)

		this.#dirty = false
		return this.#values
	}
	entries() {
		if (this.#dirty)
			this.#entries = entries(this.#store)

		this.#dirty = false
		return this.#entries
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
		event.emit(this.#events.map)
		return this.clear(this._map(callback, thisArg))
	}

	filterThis(callback: IterateCb<K, V, unknown>, thisArg?: any) {
		event.emit(this.#events.filter)
		return this.clear(this._filter(callback, thisArg))
	}
}

export {
	defineProperties,
	fromEntries,
	entries,
	values,
	keys,
	Obj,
}

export type {
	PropertyDescriptorMap,
	DefineProperties,
	ObjInput,
	Entries,
}
