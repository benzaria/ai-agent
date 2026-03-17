
export * from './actions/file_system.ts'
export * from './actions/messenger.ts'
export * from './actions/internet.ts'
export * from './actions/command.ts'
export * from './actions/system.ts'
export * from './actions/math.ts'

import type { Actions, ActionsType } from './actions/consts.ts'
export type { Actions, ActionsType }

import { HotImport } from '../utils/helpers.ts'
const hotImport = new HotImport(import.meta.dirname + '/actions')

// Cache buster imports for hot actions reloads
const { autoReply, returns, errors } = await hotImport('consts.ts') as typeof import('./actions/consts.ts')
const { file_system_actions } = await hotImport('file_system.ts') as typeof import('./actions/file_system.ts')
const { messenger_actions } = await hotImport('messenger.ts') as typeof import('./actions/messenger.ts')
const { internet_actions } = await hotImport('internet.ts') as typeof import('./actions/internet.ts')
const { command_actions } = await hotImport('command.ts') as typeof import('./actions/command.ts')
const { system_actions } = await hotImport('system.ts') as typeof import('./actions/system.ts')
const { math_actions } = await hotImport('math.ts') as typeof import('./actions/math.ts')
const {} = await hotImport('events.ts') as typeof import('./actions/events.ts')

const actions = {

	...file_system_actions,
	...messenger_actions,
	...internet_actions,
	...command_actions,
	...system_actions,
	...math_actions,

} as const satisfies Actions

export { actions, autoReply, returns, errors }
