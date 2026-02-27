
import type { WS } from './src/channels/whatsapp/wa-socket.ts'
import type { Page, Browser } from 'puppeteer'

type __providers = typeof import('./src/utils/config.ts').providers
type __personas = typeof import('./src/agent/instructions.ts')
type __contacts = typeof import('./agent-files/contact.json')

declare global {

  var ws: WS
  var page: Page
  var model: LLMs
  var isCLI: boolean
  var typing: number
  var browser: Browser
  var persona: Personas
  var provider: Providers
  var instructions: object
  var shutdown: AsyncFn<never, never>
  var contacts: Record<string, number> | __contacts

  type Prettify<T> = T extends AnyFunction ? T : {[K in keyof T]: T[K]}

  type Literal<T extends U, U> = T | (U & Prettify<{}>)
  type ValueOf<T> = T extends readonly any[] ? T[number] : T[keyof T]
  type Returns<T> = T extends SyncFn<AnyArray, infer R> ? R : never

  type Promisify<T extends AnyFunction> =
    T extends (this: infer T, ...args: infer P) => infer R
      ? SyncFn<P, Promise<R>, T>
      : never

  type IsNever<T> = [T] extends [never] ? true : false
  type IsAny<T> = 0 extends (1 & T) ? true : false

  type IsUnknown<T> =
    IsAny<T> extends false
      ? unknown extends T
        ? [T] extends [unknown]
          ? true
          : false
        : false
      : false

  type SyncFn<P extends AnyArray = [], R = void, T = unknown> =
    (IsNever<P> extends true ? [] : P) extends infer P extends AnyArray
      ? IsUnknown<T> extends true
        ? (...args: P) => R
        : (this: T, ...args: P) => R
      : never

  type AsyncFn<P extends AnyArray = [], R = void, T = unknown> = SyncFn<P, Promise<R>, T>

  type DefineProperties<O, P extends PropertyDescriptorMap> = Prettify<O &
    {
      [K in keyof P]:
        'get' extends keyof P[K]
          ? Returns<P[K]['get']>
          : P[K]['value']
    }
  >

  type _ = '_'
  type VoidFn = (...args: AnyArray) => void
  type AnyArray = any[]
  type AnyRecord = {[x in any]: any}
  type AnyFunction = (...args: AnyArray) => any
  type EmptyObject = {}
  type EmptyArray = readonly []

  type Providers = keyof __providers
  type Personas = Exclude<keyof __personas, 'instructions'>
  type LLMs = __providers[Providers]['models'][number]
  type Models = {
    [K in Providers]: `${K}/${__providers[K]['models'][number]}`
  }[Providers]

  type Query = {
    context: string
    question?: string
  } | {
    context?: string
    question: string
  }
}
