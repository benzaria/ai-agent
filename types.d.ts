
import { Page, Browser } from 'puppeteer'
import { providers } from './src/utils/config.ts'
import { WS } from './src/channels/whatsapp/wa-socket.ts'

type __providers = typeof providers

declare global {

  var browser: Browser
  var page: Page
  var provider: Providers
  var model: LLMs
  var instructions: object
  var ws: WS

  var shutdown: () => void

  type IsAny<T> = 0 extends (1 & T) ? true : false
  type IsNever<T> = [T] extends [never] ? true : false
  type Prettify<T> = {[K in keyof T]: T[K]} & {}
  type Literal<T, U> = T | (U & Prettify<{}>)
  type ValueOf<T> = T extends readonly unknown[] ? T[number] : T[keyof T]
  type SyncFn<P extends any[] = [], R = void> = (...args: P) => R
  type AsyncFn<P extends any[] = [], R = void> = (...args: P) => Promise<R>

  type _ = '_'
  type VoidFn = (...args: any[]) => void
  type AnyArray = readonly unknown[]
  type AnyRecord = {[x in any]: unknown}
  type AnyFunction = (...args: any[]) => any
  type EmptyObject = {}
  type EmptyArray = readonly []

  type Providers = keyof __providers
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
