import type { MsgData } from '../channels/whatsapp/ws.ts'
import type { ActionsType } from './actions.ts'

import { lazy, hotImport } from '../utils/helpers.ts'
import { Color, echo } from '../utils/tui.ts'
import { env } from '../utils/config.ts'

global.actions = lazy(async () => (await hotImport('src/agent/actions.ts')).actions)
actions() //? preload

async function parser(data: MsgData & { response: string | ActionsType[] }) {
	const { response } = data

	try {
		const actions: ActionsType | ActionsType[] =
			typeof response === 'string'
				? JSON.parse(response)
				: response

		if (Array.isArray(actions)) {
			await actions.reduce(
				async (output: Promise<unknown[]> | unknown[], action: ActionsType, index) => {
					echo.vrb([Color.BR_BLUE, 'action'], action)
					output = await output

					output.push(
						await runAction({ ...data, ...action }, output, index)
					)

					return output
				},
				Promise.resolve([])
			)
		}
		else {
			await runAction({ ...data, ...actions })
		}
	} catch (err: any) {
		if (err.message.includes('is not valid JSON')) {
			await runAction({
				...data as any,
				action: 'talk',
				text: response,
			})
		}
		else {
			echo.err(err)
		}
	}
}

async function runAction(
	_this: ActionsType,
	output?: unknown[],
	_index?: number //! USE ME
): Promise<unknown> {
	const { action, uid, request } = _this

	if (!(
		env.safe_actions.includes(action) ||
    env.auth_users.includes(uid) ||
		request.startsWith('/' + env.admin_key)
	)) return authorizeError(_this, action)

	const fn = (await actions?.())?.[action] as AsyncFn<[], unknown, ActionsType>

	return fn
		? await fn.apply({ ..._this, output })
		: supportError(_this, action)
}

const authorizeError = (_this: ActionsType, action: string) =>
	runAction({
		..._this,
		action: 'error',
		error: 'UNAUTHORIZED_USER',
		details: `Unauthorized users can NOT preforme '${action}' actions!`,
		suggested_fix: `Ask agent owner '${env.owner_name}' for permission.`,
		missing_fields: ['admin_key'],
	})

const supportError = (_this: ActionsType, action: string) =>
	runAction({
		..._this,
		action: 'error',
		error: 'UNSUPPORTED_ACTION',
		details: `Requested action '${action}' is not inplemented yet!`,
		suggested_fix: 'Write the corresponding TS code to acheive this behavior.',
		missing_fields: ['code_block'],
	})

export {
	parser,
	runAction,
	supportError,
	authorizeError,
}
