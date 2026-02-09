import '../cli/arguments.ts'

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { template, echo, delay } from '../utils/helpers.ts'
import { providers, env } from '../utils/config.ts'

async function initPage(headless: boolean | 'new' = 'new') {
  puppeteer.use(StealthPlugin())

  echo.inf('Initializing Puppeteer...' + prvLine)
  globalThis.browser = await puppeteer.launch({
    headless: headless as any,
    userDataDir: env.userData,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--no-default-browser-check',
      // '--restore-last-session=false',
    ],
  })

  // --- TAB MANAGEMENT ---
  globalThis.page = await browser.newPage()
  await page.setUserAgent(env.userAgent)

  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page()
      await newPage?.close()
    }
  })

  echo.scs('Puppeteer ready.' + clrLine)
}

async function initProvider(model: Models) {
  try {
    echo.inf('Initializing Provider...' + prvLine)
    const spl = model.split('/') as [Providers, LLMs]
    globalThis.provider = spl[0]
    globalThis.model = spl[1]

    await page.goto(
      providers[provider]['api'],
      { waitUntil: 'networkidle2', timeout: env.timeout }
    )

    await page.bringToFront()
    await page.waitForSelector(providers[provider]['selector'].request, { timeout: env.timeout })

    echo.scs('Provider ready.' + clrLine)

  } catch (error) {
    echo.err('Provider initialization failed:', error)
    process.exit()
  } finally {
    // --- CLEANUP LOGIC ---
    browser.pages()
      .then(pages => pages.forEach(page =>  page !== globalThis.page ? page.close() : null))
      .catch(echo.err)

    globalThis.shutdown = async () => {
      echo.inf('Closing session...')
      await browser.close()
      process.exit()
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('uncaughtException', shutdown)
  }
}

async function initModel(instructions: object) {
  echo.inf('Initializing Model...' + prvLine)
  globalThis.instructions = instructions

  const verbose = args.verbose
  args.verbose = false
  const res = await chat(instructions)
  args.verbose = verbose

  await delay(200)
  if (res?.toLowerCase()?.includes('none'))
    echo.scs("Model ready." + clrLine)
  else
    echo.wrn('Model initialization failed:' + clrLine, res)
}

async function ask(q: Query) {
  if (!globalThis.page) return initPrblm('Page', 'err'), 'Could not get response.'
  if (!globalThis.provider) return initPrblm('Provider', 'err'), 'Could not get response.'

  echo.inf(`\nquestion: ${q.question}${q.context ? '\ncontext: ' + q.context : '' }\n`)
  const prompt = template(q)

  await page.evaluate((text: string, selector: string) => {
    const textarea = document.querySelector(selector) as HTMLTextAreaElement
    if (textarea) {
      textarea.innerHTML = text
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, prompt, providers[provider]['selector'].request)

  await delay(200)
  await page.click(providers[provider]['selector'].sendBtn)

  echo.inf('Waiting for AI response...' + prvLine)
  await page.waitForSelector(providers[provider]['selector'].stopBtn, { visible: true, timeout: env.timeout })

  const response = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector)
    const lastMessage = messages[messages.length - 1] as HTMLElement
    return lastMessage ? lastMessage.innerText.trim() : 'Could not find response.'
  }, providers[provider]['selector'].response)

  echo.vrb([35, 'RESPONSE'],
    clrLine +
    '\n-------------------------\n' +
    response +
    '\n-------------------------\n'
  )

  return response
}

async function chat(p: object | string) {
  if (!globalThis.page) return initPrblm('Page', 'err'), 'Could not get response.'
  if (!globalThis.provider) return initPrblm('Provider', 'err'), 'Could not get response.'
  if (!globalThis.instructions) initPrblm('Model', 'wrn')

  const prompt = JSON.stringify(typeof p === 'string' ? {request: p} : p)

  await page.evaluate((text: string, selector: string) => {
    const textarea = document.querySelector(selector) as HTMLTextAreaElement
    if (textarea) {
      textarea.innerHTML = text
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, prompt, providers[provider]['selector'].request)

  await delay(200)
  await page.click(providers[provider]['selector'].sendBtn)

  echo.inf('Waiting for AI response...' + prvLine)
  await page.waitForSelector(providers[provider]['selector'].stopBtn, { visible: true, timeout: env.timeout })

  const response = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector.response)
    const lastMessage = messages[messages.length - 1] as HTMLElement

    if (!lastMessage) return 'Could not get response.'

    const responseBlock = lastMessage.querySelector(selector.responseBlock) as HTMLElement
    return (responseBlock ? responseBlock.innerText : lastMessage.innerText).trim()
  }, providers[provider]['selector'])

  echo.vrb([32, "RESPONSE"],
    clrLine +
    '\n-------------------------\n' +
    response +
    '\n-------------------------\n'
  )

  return response
}

const initPrblm = (step: 'Page' | 'Provider' | 'Model', level: 'err' | 'wrn') =>
  echo[level](`${step} not initialized. Call \`init${step}\` first.`)

// This ensures it only runs if called directly
if (import.meta.main) {
  (async () => {
    await initPage(args.headless)
    await initProvider('openai/gpt-5-mini')
    await initModel({})

    await chat({request: 'write a poem about morocco'})

    shutdown()
  })()
}

export {
  initPage,
  initProvider,
  initModel,
  ask,
  chat,
}
