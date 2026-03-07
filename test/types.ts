/* eslint-disable */

type Obj<
	P extends
		| PropertyKey
		| AnyRecord
	,

	V =
		P extends Record<any, infer T> ? T
			: never
	,

	K extends PropertyKey =
		P extends PropertyKey ? P
			: P extends Record<infer T, any> ? T
				: never
	,

> = [K, V]

type A = Obj<string, number>
//	  ^?

type B = Obj<Record<string, number>>
//	  ^?
