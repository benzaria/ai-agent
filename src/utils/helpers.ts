import { setTimeout } from 'node:timers/promises'
import { ask_instructions } from './config.ts'

const delay = setTimeout
const colors = (id: number | string, str: string) => `\x1b[${id}m${str}\x1b[0m`
const ansi256 = (id: number | string, str: string) => colors(`38;5;${id}`, str)
const voidFn: any = (...args: any[]) => {}

const echoObj = {
  inf: [94, 'INFO'],
  wrn: [93, 'WARN'],
  err: [91, 'ERROR'],
  scs: [32, 'SUCCESS'],
  unk: [35, 'UNKNOWN'],
} as const satisfies {[x: string]: [number, Uppercase<string>]}


type EchoObj = typeof echoObj
type EchoObjProp = keyof EchoObj
type EchoArr = EchoObj[EchoObjProp] | [number, Uppercase<string>]
type Echo =
  & {(...args: any[]): void}
  & Prettify<
    ValueOf<
      & {
        [O in Record<EchoObjProp | 'ln' | 'lr', (...args: any[]) => void> as _]: {
          [K in keyof O]: O[K] & {[_ in 'ln' | 'lr']: O[K]}
        }
      }
      & {
        [F in (([id, str]: EchoArr, ...args: any[]) => void) as _]: {
          [_ in 'cst' | 'vrb']: F & {[_ in 'ln' | 'lr']: F}
        }
      }
    >
  >

const echo = new Proxy(
  (([id, str]: [number, Uppercase<string>], ...args: any[]) =>
    console.log(`[${colors(`1;${id}`, str)}]`, ...args)) as Echo,
  {
    apply: (_fn, _this, args) => console.log(...args),

    get(fn, prop) {

      if (prop === 'ln') return (...args: any[]) => console.log(...args, '\n')
      if (prop === 'lr') return (...args: any[]) => console.log(...args, '\x1b[1A\r\x1b[K')
      const echoProp = (echoObj as any)[prop] ?? echoObj.unk

      return new Proxy(
        prop as string === 'cst' ? fn :
        prop as string === 'vrb' ? args.verbose ? fn : voidFn :
        prop === 'inf' && !args.verbose ? voidFn :
        (...args: any[]) => fn(echoProp, ...args),
        {
          apply: (fn, _this, args) => fn(...args),

          get(fn, prop) {

            if (prop === 'ln') return (...args: any[]) => fn(...args, '\n')
            if (prop === 'lr') return (...args: any[]) => fn(...args, '\x1b[1A\r\x1b[K')

            return fn
          }
        }
      )
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
  ${toHTML(ask_instructions())}
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
