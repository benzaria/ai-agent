import type { MsgData } from '../channels/whatsapp/ws.ts'
import type { Actions, ActionsType } from './actions.ts'
import { lazy, hotImport } from '../utils/helpers.ts'
import { Color, echo } from '../utils/tui.ts'
import { env } from '../utils/config.ts'

global.actions = lazy(async () => (await hotImport('src/agent/actions.ts')).actions as Actions)
actions() // preload

async function parser(data: MsgData & { response: string }) {
	const { response } = data

	try {
		const resJSON = JSON.parse(response) as ActionsType

		if (Array.isArray(resJSON)) {
			resJSON.reduce(
				async (output: AnyArray, action: ActionsType, index) => {
					echo.vrb([Color.BR_BLUE, 'action'], action)

					return await runAction({ ...data, ...action }, output, index)
				},
				undefined
			)
		}
		else {
			await runAction({ ...data, ...resJSON })
		}
	} catch (err: any) {
		if (err.message.includes('is not valid JSON')) {
			runAction({
				...data,
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
	output?: AnyArray,
	_index?: number //! USE ME
): Promise<unknown> {
	const { action, uid, request } = _this

	if (
		!env.safe_actions.includes(action) &&
    !env.auth_users.includes(uid) &&
		!request?.includes(env.admin_key)
	) return authorizeError(_this, action)

	const fn = Reflect.get(await actions?.(), action) as SyncFn<[], unknown>

	return fn
		? fn.apply({ ..._this, output })
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
