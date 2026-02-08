import { setTimeout } from 'node:timers/promises'
import { env } from './config.ts'

const delay = setTimeout
const colors = (id: number | string, str: string) => `\x1b[${id}m${str}\x1b[0m`
const ansi256 = (id: number | string, str: string) => colors(`38;5;${id}`, str)
const voidFn: VoidFn = (...args: any[]) => {}

const echoObj = {
  inf: [94, 'INFO'],
  wrn: [93, 'WARN'],
  err: [91, 'ERROR'],
  suc: [32, 'SUCCESS'],
  unk: [35, 'UNKNOWN'],
  cus: [0, '']
} as const satisfies {[x: string]: [number, Uppercase<string>]}

// const echoFn = (id: number, str: string, ...args: any[]) => 

type EchoObj = typeof echoObj
type EchoObjProp = keyof EchoObj
type EchoMap = EchoObj[EchoObjProp]
type Echo = {(...args: any[]): void} & Simplify<Record<EchoObjProp, VoidFn>>

const echo = new Proxy(
  (([id, str]: [number, Uppercase<string>], ...args: any[]) => console.log(`[${colors(`1;${id}`, str)}]`, ...args)) as Echo,
  {
    apply: (_fn, _this, args) => console.log(...args),

    get(fn, prop: EchoObjProp) {
      const echoProp = echoObj[prop] ?? echoObj.unk
      
      return prop == 'cus' ? fn
        : prop === 'inf' && !args.verbose ? voidFn
        : (...args: any[]) => fn(echoProp, ...args)
    },
  }
)

const toHTML = (text?: string) => {
  return text ? text
    .trim() // Remove trailing empty lines
    .split(/\r?\n/) // Split by any newline format
    .map(line => {
      // Escape special characters for security
      const safeLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

      // Wrap in <p> tag. Use &nbsp; if the line is empty so it takes up space.
      return `<p>${safeLine.trim() === '' ? '&nbsp;' : safeLine}</p>`;
    })
    .join('') : ''
}

const template = (q: Query, br: string = '<br>--------------------------------------------------<br>\n') => `
  ${toHTML(env.instruction(q.model))}
  ${q.context ? `${br}<p>[CONTEXT]</p>\n${toHTML(q.context)}` : ''}
  ${q.question ? `${br}<p>[QUESTION]</p>\n${toHTML(q.question)}` : ''}
`.trim()

export {
  echo,
  colors,
  ansi256,
  delay,
  toHTML,
  template,
}
