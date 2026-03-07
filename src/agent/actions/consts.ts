import type { GetCode, IsCode, SplitActions } from '../instructions/consts.ts'
import type { MsgData } from '../../channels/whatsapp/ws.ts'
import { parser, runAction } from '../interaction.ts'
import { Color, echo } from '../../utils/tui.ts'
import { env } from '../../utils/config.ts'
import { ask } from '../../model/bot.ts'

type MsgResponse = Prettify<
	& MsgData
	& {
		response: string
		readonly output: unknown
	}
>

type ActionsObj = ValueOf<typeof import('../instructions.ts')['main']['actions']>

type ActionsMap = Prettify<{
  [A in ActionsObj as SplitActions<A['structure']['action']>]: Prettify<
		A['structure'] extends infer S
			? {
					-readonly [K in keyof S as K extends 'action' ? K : never]: SplitActions<S[K]>
				} & {
					-readonly [K in keyof S as K extends `${infer P}?` ? P : never]?: S[K]
				} & {
					-readonly [K in keyof S as IsCode<S[K]> extends true ? K : never]: GetCode<A, K>
				} & {
					-readonly [K in keyof S as
						IsCode<S[K]> extends true ? never
							: K extends `${string}?` ? never
								: K extends 'action' ? never
									: K
					]: S[K]
				}
			: never
  >
}>

type ActionsKeys = keyof ActionsMap

type ActionsType = Prettify<
	& Omit<MsgResponse, 'output'>
	& ValueOf<ActionsMap>
>

type Actions = Prettify<
	{
		[K in ActionsKeys]: (
			this: Prettify<
				& MsgResponse
				& ActionsMap[K]
			>
		) => unknown | Promise<unknown>
	} & {
		none: SyncFn<
			AnyArray, void,
			Prettify<
				& MsgResponse
				& { action: 'none' }
			>
		>
	}
>

type PActions = Partial<Actions>

const autoReply = (
	{ jid }: { jid: string},
	text: string,
	mentions: string[] = []
) => {
	if (global.isCLI) return

	text = text.replaceAll(env.home, '~')
	echo.vrb([Color.GREEN, 'reply'], { jid, text, mentions })

	return ws.send(jid, { text, mentions })
}

const errors = (
	ctx: ActionsType,
	err: {
		msg: string
		fix?: string
		missing?: string[]
		code?: ActionsMap['error']['error']
	},
) => {
	echo.err.ln(err)

	return runAction({
		...ctx,
		action: 'error',
		details: err.msg,
		suggested_fix: err.fix,
		missing_fields: err.missing,
		error: err.code ?? 'EXECUTION_FAILED',
	})
}

const returns = async (ctx: ActionsType, result: unknown) => {
	echo.scs.ln(result)
	if (result === null) return

	return parser({
		...ctx,
		response: await ask({
			action: 'result',
			result,
		})
	})
}

const mapKey = (keywords?: string[]) =>
	!keywords?.length ? ['']
		: keywords.map(key => key.toLowerCase())

export {
	autoReply,
	returns,
	errors,
	mapKey,
}

export type {
	ActionsType,
	PActions,
	Actions,
}
