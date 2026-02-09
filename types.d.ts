
import { Page, Browser } from 'puppeteer'
import { providers } from './src/utils/config.ts'

type __providers = typeof providers

declare global {
  var browser: Browser
  var page: Page
  var provider: Providers
  var model: LLMs
  var instructions: object

  var shutdown: () => void

  type Prettify<T> = {[K in keyof T]: T[K]} & {}
  type Literal<T, U> = T | (U & Prettify<{}>)
  type ValueOf<T> = T extends readonly unknown[] ? T[number] : T[keyof T]

  type _ = '_'
  type VoidFn = (...args: any[]) => void
  type UnknownArray = readonly unknown[]

  type Config = {
    providers: {
      [x: string]: {
        api: string
        models: string[]
        selector: Record<string, string>
      }
    }

    env: {
      owner_name: string
      bot_name: string
      port: number
      timeout: number
      model: Models
      userAgent: string
      userData: string
    }

    ask_instructions: () => string
  }

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
