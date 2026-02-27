import { type MsgData } from '../../channels/whatsapp/ws.ts'
import { parser, runAction } from '../interaction.ts'
import * as instructions from '../instructions.ts'
import { Color, echo } from '../../utils/tui.ts'
import { env } from '../../utils/config.ts'
import { ask } from '../../model/bot.ts'


type ActionsObj = typeof instructions['main']['actions']

type ActionsMap = Prettify<{
  [A in ActionsObj[number] as A['name']]: Prettify<
		A['structure'] extends infer S
			? {
          [K in keyof S as
						IsNever<S[K]> extends true ? K : never
					]: ValueOf<A[`${K & string}_codes` & keyof A]>
        } & {
					[K in keyof S as
						K extends `${infer T}?` ? T : never
					]: S[K]
				} & {
					[K in keyof S as
						IsNever<S[K]> extends true ? never
							: K extends `${string}?` ? never
								: K
					]: S[K]
				}
			: never
  >
}>

type ActionsKeys = keyof ActionsMap

type ActionsType = Prettify<
	& MsgData
	& ValueOf<ActionsMap>
	& { response: string }
>

type Actions = {
  [K in ActionsKeys]: (this: Prettify<
      & MsgData
      & ActionsMap[K]
      & {
        response: string
        readonly output: unknown
      }
    >
  ) => unknown | Promise<unknown>
} & { none: VoidFn }

type PActions = Partial<Actions>

const autoReply = (
	{ uid, gid }: { uid: string, gid?: string },
	text: string,
	mentions: string[] = []
) => {
	if (global.isCLI) return

	text = text.replaceAll(env.home, '~')
	echo.vrb([Color.GREEN, 'reply'], { to: gid ?? uid, text })

	return ws.send(gid ?? uid, { text, mentions })
}

const errors = (
	ctx: ActionsType, err: Error,
	err_code: ActionsMap['error']['error'] = 'EXECUTION_FAILED'
) => {
	echo.err.ln(err)

	return runAction({
		...ctx as any,
		action: 'error',
		error: err_code,
		details: err.message,
	})
}

const returns = async (ctx: ActionsType, result: unknown) => {
	echo.scs.ln(result)

	return parser({
		...ctx as any,
		response: await ask({
			action: 'result',
			result,
		})
	})
}

export {
	autoReply,
	returns,
	errors,
}

export type {
	ActionsType,
	Actions,
	PActions,
}
