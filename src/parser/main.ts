import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { startCLI } from '../cli/chat.ts'
import { echo } from '../utils/helpers.ts'
import { instructions } from './instructions.ts'

const execute = promisify(exec)

type ActionsObj = typeof instructions.actions
type ActionsMap = Prettify<{
  [A in ActionsObj[number]as A['name']]: Prettify<
    ValueOf<
      & {
        [S in A['structure']as string]: {
          [K in keyof S as[S[K]] extends [never] ? K : never]:
          ValueOf<A[`${K & string}_codes` & keyof A]>
        }
      }
      & {
        [S in A['structure']as string]: {
          [K in keyof S as[S[K]] extends [never] ? never : K]: S[K]
        }
      }
    >
  >
}>

type ActionsType = ValueOf<ActionsMap>

startCLI(
  function parser(prompt: string | object, response: string) {
    try {
      const resJSON = JSON.parse(response)

      if (Array.isArray(resJSON)) {
        resJSON.reduce((acc, crr: ActionsType) => {
          echo.inf(crr, '\n')
          return runAction(crr, acc)
        }, undefined)
      } else runAction(resJSON)

    } catch (err) {
      echo.err(err)
    }
  }
)

async function runAction(obj: ActionsType, acc?: unknown) {
  return await (actions[obj.action] as any).apply({ ...obj, output: acc })
}

const actions = {
  talk() {
    echo.cst([32, 'TALK'], this)
  },
  async messenger() { },
  status() { },
  error() {
    echo.err(`${this.error}
            \rReason: ${this.text}
            ${this.missing_fields.length
        ? `\n\rMissing fields:\n\r    ${this.missing_fields.join(',\n    ')}\n`
        : ''
      }
            \rSuggested fix: ${this.suggested_fix}`
    )
  },
  async shell() {
    echo.cst([32, 'EXECUTE'], this.command)
    // return await execute(this.command)
  },
  write() { },
  read() { },
} as const satisfies {
  [K in keyof ActionsMap]:
  (this: Prettify<ActionsMap[K] & { readonly output: unknown }>) => unknown
}
