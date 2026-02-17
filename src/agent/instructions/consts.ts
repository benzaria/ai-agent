
type InstructionsType = {
  [x: string]: any
  actions: {
    [x: string]: any
    name: string
    description: string
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
const stringArr: string[] = [string]
const code = string as never

export {
	code,
	string,
	stringArr,
}
