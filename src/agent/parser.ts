import { actions, type ActionsType } from './actions.ts'
import { echo } from '../utils/helpers.ts'

async function parser({
  jid,
  request,
  response
}: {
  jid: string
  request: string | object
  response: string
}) {
  try {
    const resJSON = JSON.parse(response)

    if (Array.isArray(resJSON)) {
      resJSON.reduce(
        async (out, action: ActionsType) => {
          echo.inf(action, '\n')
          
          return await runAction({ ...action, jid }, out)

        },
        undefined
      )
    }
    else await runAction(resJSON)

  } catch (err) {
    if (Error.isError(err) && err.message.includes('is not valid JSON')) {
      runAction({
        action: "talk",
        text: response,
        jid,
      })
    }
    else echo.err(err)
  }
}

async function runAction(obj: ActionsType, out?: unknown): Promise<unknown> {
  const fn = actions[obj.action as keyof typeof actions] as Function

  return fn
    ? fn.apply({ ...obj, output: out })
    : runAction({
      jid: obj.jid,
      action: "error",
      error: "UNSUPPORTED_ACTION",
      text: `Requested action '${obj.action}' is not inplemented yet!`,
      suggested_fix: "Write the corresponding TS code to acheive this behavior.",
      missing_fields: [''],
    }, out)
}

export {
  parser,
  runAction,
}
