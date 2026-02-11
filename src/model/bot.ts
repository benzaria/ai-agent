import '../cli/arguments.ts'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { template, echo, delay } from '../utils/helpers.ts'
import { instructions } from '../agent/instructions.ts'
import { providers, env } from '../utils/config.ts'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { parser, runAction } from '../agent/parser.ts'

// --- CLEANUP LOGIC ---
global.shutdown = async () => {
  echo.inf('Closing session...')
  await browser.close()
  await rm(join(env.userData, 'Default/Sessions'), { recursive: true, force: true })
    .catch(() => echo.vrb('err', 'No such file or directory: "/Default/Sessions"'))
  process.exit()
}

async function initPage(headless: boolean | 'new' = 'new') {
  puppeteer.use(StealthPlugin())

  echo.inf.lr('Initializing Puppeteer...' )
  global.browser = await puppeteer.launch({
    headless: headless as any,
    userDataDir: env.userData,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--no-default-browser-check',
      '--restore-last-session=false',
    ],
  })

  // --- TAB MANAGEMENT ---
  global.page = await browser.newPage()
  await page.setUserAgent(env.userAgent)

  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page()
      await newPage?.close()
    }
  })

  echo.scs('Puppeteer ready.')
}

async function initProvider(model: Models) {
  try {
    echo.inf.lr('Initializing Provider...')
    const spl = model.split('/') as [Providers, LLMs]
    global.provider = spl[0]
    global.model = spl[1]

    await page.goto(
      providers[provider]['api'],
      { waitUntil: 'networkidle2', timeout: env.timeout }
    )

    await page.bringToFront()
    await page.waitForSelector(providers[provider]['selector'].request, { timeout: env.timeout })

    echo.scs('Provider ready.')

  } catch (error) {
    echo.err('Provider initialization failed:', error)
    shutdown()
  } finally {
    browser.pages()
      .then(pages => pages.forEach(page =>  page !== global.page ? page.close() : null))
      .catch(echo.err)

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('uncaughtException', shutdown)
  }
}

async function initModel(instructions: object) {
  echo.inf.lr('Initializing Model...')
  global.instructions = instructions

  const verbose = args.verbose
  args.verbose = false
  const res = await chat({request: "status", ...instructions})
  args.verbose = verbose

  await delay(200)
  if (res?.includes('OK'))
    echo.scs("Model ready.")
  else
    echo.wrn('Model initialization failed:', res)
}

async function ask(q: Query) {
  if (!global.page) return initPrblm('Page', 'err'), 'Could not get response.'
  if (!global.provider) return initPrblm('Provider', 'err'), 'Could not get response.'

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

  echo.inf.lr('Waiting for AI response...')
  await page.waitForSelector(providers[provider]['selector'].stopBtn, { visible: true, timeout: env.timeout })

  const response = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector)
    const lastMessage = messages[messages.length - 1] as HTMLElement
    return lastMessage ? lastMessage.innerText.trim() : 'Could not find response.'
  }, providers[provider]['selector'].response)

  echo.vrb([32, "RESPONSE"],
    '\n-------------------------\n' +
    response +
    '\n-------------------------\n'
  )

  return response
}

async function chat(p: object | string) {
  if (!global.page) return initPrblm('Page', 'err')
  if (!global.provider) return initPrblm('Provider', 'err')
  if (!global.instructions) initPrblm('Model', 'wrn')

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

  echo.inf.lr('Waiting for AI response...')
  await page.waitForSelector(providers[provider]['selector'].stopBtn, { visible: true, timeout: env.timeout })

  const response = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector.response)
    const lastMessage = messages[messages.length - 1] as HTMLElement

    if (!lastMessage) return 'Could not get response.'

    const responseBlock = lastMessage.querySelector(selector.responseBlock) as HTMLElement
    return (responseBlock ? responseBlock.innerText : lastMessage.innerText).trim()
  }, providers[provider]['selector'])

  echo.vrb([32, "RESPONSE"],
    '\n-------------------------\n' +
    response +
    '\n-------------------------\n'
  )

  return response
}

const initPrblm = (step: 'Page' | 'Provider' | 'Model', level: 'err' | 'wrn') =>
  (echo[level](`${step} not initialized. Call \`init${step}\` first.`), 'Could not get response.')

async function initBot() {
  await initPage(args.headless)
  await initProvider(args.model)
  await initModel(instructions)
}

// This ensures it only runs if called directly
if (import.meta.main) {
  (async () => {
    // await initPage(args.headless)
    // await initProvider(args.model)
    // await initModel({})
    await initBot()

    await chat('write a poem about morocco')
    shutdown()
  })()
}

export {
  initPage,
  initProvider,
  initModel,
  initBot,
  ask,
  chat,
}
