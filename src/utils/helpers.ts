import { setTimeout } from 'node:timers/promises'
import { ask_instructions } from './config.ts'

const delay = setTimeout
const colors = (id: number | string, str: string) => `\x1b[${id}m${str}\x1b[0m`
const ansi256 = (id: number | string, str: string) => colors(`38;5;${id}`, str)
const voidFn: any = (...args: any[]) => {}
const clearLine = () => console.log('\x1b[1A\r\x1b[K\x1b[1A')

const echoMap = {
  inf: [94, 'INFO'],
  wrn: [93, 'WARN'],
  err: [91, 'ERROR'],
  scs: [32, 'SUCCESS'],
  unk: [35, 'UNKNOWN'],
} as const satisfies {[x: string]: [number, string]}


type EchoMap = typeof echoMap
type EchoMapProp = keyof EchoMap
type EchoArr = EchoMap[EchoMapProp] | [id: number, str: string]
type Echo =
  & {(...args: any[]): void}
  & Prettify<
    ValueOf<
      & {
        [O in Record<EchoMapProp | 'ln' | 'lr', (...args: any[]) => void> as _]: {
          [K in keyof O]: O[K] & {[_ in 'ln' | 'lr']: O[K]}
        }
      }
      & {
        [F in ((level: EchoMapProp | EchoArr, ...args: any[]) => void) as _]: {
          [_ in 'cst' | 'vrb']: F & {[_ in 'ln' | 'lr']: F}
        }
      }
    >
  >

const echo = new Proxy(
  (([id, str]: [number, string], ...args: any[]) =>
    console.log(`\x1b[K[${colors(`1;${id}`, str.toUpperCase())}]`, ...args)) as Echo,
  {
    apply: (_fn, _this, args) => console.log('\x1b[K', ...args),

    get(fn, prop) {
      if (prop === 'ln') return (...args: any[]) => echo(...args, '\n')
      if (prop === 'lr') return (...args: any[]) => echo(...args, '\x1b[1A\r')

      const echoProp = (echoMap as any)[prop] ?? echoMap.unk
      const fnc = (level: EchoMapProp | EchoArr, ...args: any[]) =>
        fn(typeof level === 'string' ? echoMap[level] : level, ...args)

      return new Proxy(
        prop as string === 'cst' ? fnc :
        prop as string === 'vrb' ? args?.verbose ? fnc : voidFn :
        prop === 'inf' && !args?.verbose ? voidFn :
        (...args: any[]) => fn(echoProp, ...args),
        {
          apply: (fn, _this, args) => fn(...args),

          get(fn, prop) {
            if (prop === 'ln') return (...args: any[]) => fn(...args, '\n')
            if (prop === 'lr') return (...args: any[]) => fn(...args, '\x1b[1A\r')

            return fn
          }
        }
      )
    }
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
  echoMap,
  colors,
  ansi256,
  delay,
  toHTML,
  template,
}
