
import type { InstructionsType } from './src/agent/instructions.ts'
import type { WS } from './src/channels/whatsapp/wa-socket.ts'
import type { Actions, Job } from './src/agent/actions.ts'
import type { lazy } from './src/utils/helpers.ts'
import type { Obj } from './src/utils/object.ts'
import type { Page, Browser } from 'puppeteer'

type __providers = typeof import('./src/utils/config.ts')['providers']
type __personas = typeof import('./src/agent/instructions.ts')
type __secrets = typeof import('./agent-files/secrets.json')

type __contacts = typeof import('./agent-files/contact.json')
// type __jobs = typeof import('./agent-files/jobs.json')

declare const lazedActions = lazy<[], Actions>()
declare const _: unique symbol

declare global {

  var ws: WS
  var page: Page
  var model: LLMs
  var typing: number
  var isCLI: boolean
  var isReady: boolean
  var browser: Browser
  var persona: Personas
  var provider: Providers
  var isReloading: boolean
  var jobs: Obj<string, Job>
  var shutdown: AsyncFn<[], never>
  var actions: typeof lazedActions
  var instructions: InstructionsType
  var contacts: Obj<Literal<keyof __contacts, string>, number>

  type Prettify<T> = T extends AnyFunction ? T : {[K in keyof T]: T[K]}
  type ValueOf<T> = T extends readonly any[] ? T[number] : T[keyof T]
  type Returns<T> = T extends SyncFn<AnyArray, infer R> ? R : never
  type Literal<T extends U, U> = T | (U & Prettify<{}>)

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
    IsUnknown<T> extends true
      ? (...args: P) => R
      : (this: T, ...args: P) => R

  type AsyncFn<P extends AnyArray = [], R = void, T = unknown> = SyncFn<P, Promise<R>, T>

  type Constructor<P extends AnyArray = [], R = any> = new (...args: P) => R

  type Dictionary<K, V> = Record<K, V> | EmptyObject

  type _ = typeof _
  type AnyArray = any[]
  type AnyEntries = [any, any][]
  type AnyRecord = {[x in any]: any}
  type AnyFunction = SyncFn<AnyArray, any>
  type VoidFn = SyncFn<AnyArray>
  type EmptyObject = { [_]?: never }
  type EmptyArray = readonly [] | []

  type Secrets = __secrets
  type Providers = keyof __providers
  type Personas = Exclude<keyof __personas, 'instructions'>
  type LLMs = __providers[Providers]['models'][number]
  type Models = ValueOf<{ [K in Providers]: `${K}/${ValueOf<__providers[K]['models']>}` }>

}
