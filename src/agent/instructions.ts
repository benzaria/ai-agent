
export * from './instructions/main.ts'
export * from './instructions/jarvis.ts'
export * from './instructions/strict.ts'

import type { Instructions, InstructionsType } from './instructions/consts.ts'

import { main } from './instructions/main.ts'
import { jarvis } from './instructions/jarvis.ts'
import { strict } from './instructions/strict.ts'

const instructions = {
	main,
	jarvis,
	strict,
} as const satisfies Instructions

export { instructions }
export type { Instructions, InstructionsType }
