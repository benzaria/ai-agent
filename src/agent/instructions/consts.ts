
type InstructionsType = {
  [x: string]: any
  actions: {
    [x: string]: any
    name: string
    description: string
    returns_result?: boolean,
    structure: {
      [x: string]: any
      action: string
    }
    rules: string[]
  }[]
}

type Instructions = Record<Personas, InstructionsType>

export type {
	InstructionsType,
	Instructions,
}


const string: string = 'string'
const number: number = 'number' as any
const code: unique symbol = string as any
const stringArr: string[] = 'string[]' as any

type Code = typeof code
type IsCode<T> = T extends Code ? true : false
type GetCode<A, K> = ValueOf<A[`${K & string}_codes` & keyof A]>

type SplitActions<T> =
  T extends `${infer O}.{${infer P}}`
    ? P extends '' ? O
      : `${O}.${_SplitActions<P>}`
    : T

type _SplitActions<T> =
  T extends `${infer H}|${infer T}`
    ? T extends '' ? H
      : H | _SplitActions<T>
    : T

export {
	code,
	number,
	string,
	stringArr,
}

export type {
	Code,
	IsCode,
	GetCode,
	SplitActions,
}
