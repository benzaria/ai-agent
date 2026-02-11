import { readFile, writeFile } from 'node:fs/promises'
import { instructions } from './instructions.ts'
import { echo } from '../utils/helpers.ts'
import { exec } from 'node:child_process'
import { env } from '../utils/config.ts'
import { promisify } from 'node:util'

const execute = promisify(exec)

type ActionsObj = typeof instructions.actions
type ActionsMap = Prettify<{
  [A in ActionsObj[number] as A['name']]: Prettify<
    ValueOf<
      & {
        [S in A['structure'] as string]: {
          [K in keyof S as[S[K]] extends [never] ? K : never]:
          ValueOf<A[`${K & string}_codes` & keyof A]>
        }
      }
      & {
        [S in A['structure'] as string]: {
          [K in keyof S as[S[K]] extends [never] ? never : K]: S[K]
        }
      }
    >
  >
}>

type ActionsType = ValueOf<{
  [K in keyof ActionsMap]: Prettify<
      & ActionsMap[K]
      & {
        readonly jid?: string
      }
    >
}>
type Actions = {
  [K in keyof ActionsMap]: (this: Prettify<
      & ActionsMap[K]
      & {
        readonly jid?: string
        readonly output: unknown
      }
    >
  ) => unknown
}

const reply = ({jid}: {jid?: string}, text: string) => (
  jid ? ws.sendMessage(jid, {text}) : null
)

const actions = {
  talk() {
    echo.cst.ln([32, this.action], this.text)
    reply(this, this.text)
  },

  async messenger() {
    const msg = `${this.platform} -> ${this.to}\n${this.message}`
    echo.cst([32, this.action], msg)

    const target = `${this.to}@s.whatsapp.net`

    ws.sendMessage(
      target,
      {
        text: this.message.replace(/[\+-\s]/, '')
      }
    )

    if (target !== env.owner_jid) {
      reply(this, msg)
    }
  },

  status() {
    echo.cst([32, this.action], this.state)
    echo.ln(this.details)
    reply(this, `*[STATUS]* ${this.state}\n${this.details}`)
  },

  error() {
    const msg = `${this.error}
      \rReason: ${this.text}
      ${
        this.missing_fields?.length
          ? `\n\rMissing fields:\n\r    ${this.missing_fields.join(',\n    ')}\n`
          : ''
      }
      \rSuggested fix: ${this.suggested_fix}`

    echo.err.ln(msg)
    reply(this, msg)
  },

  async execute() {
    echo.cst.ln([32, this.action], this.command)
    // return await execute(this.command)
  },

  async write() {
    echo.cst([32, this.action], this.path)
    // await writeFile(this.path, this.content, 'utf-8')
  },

  async read() {
    echo.cst([32, this.action], this.path)
    // return await readFile(this.path, 'utf-8')
  },

  calculate() {
    const result = Function(`return (${this.expression})`)()

    const msg = `${this.expression} = ${result}`
    echo.cst.ln([32, this.action], msg)
    reply(this, msg)

    return result
  },

  web_search() {
    echo.cst.ln([32, this.action])
    echo.ln(this.result)
  },

} as const satisfies Partial<Actions>


export {
  actions,
  reply,
}

export type {
  ActionsType,
  Actions,
}
