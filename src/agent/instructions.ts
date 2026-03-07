
export * from './instructions/main.ts'
export * from './instructions/jarvis.ts'
export * from './instructions/strict.ts'

import type { Instructions, InstructionsType } from './instructions/consts.ts'
export type { Instructions, InstructionsType }

import { HotImport } from '../utils/helpers.ts'
const hotImport = new HotImport(import.meta.dirname + '/instructions')

// Cache buster imports for hot instruction reloads
const { main } = await hotImport('main.ts') as typeof import('./instructions/main.ts')
const { jarvis } = await hotImport('jarvis.ts') as typeof import('./instructions/jarvis.ts')
const { strict } = await hotImport('strict.ts') as typeof import('./instructions/strict.ts')

const instructions = {
	main,
	jarvis,
	strict,
} as const satisfies Instructions

export { instructions }
