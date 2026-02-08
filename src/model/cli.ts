import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { initPage, initModel, chat } from './bot.ts'
import { echo } from './helpers.ts'

import chatgpt_init from '../../config/chatgpt-init.json' with { type: 'json' }

const rl = readline.createInterface({ input, output })

async function collectMultiline(prompt: string): Promise<string> {
  echo(`${prompt}`)
  let lines = []

  while (true) {
    const line = await rl.question('')
    if (line.trim() === "") break
    lines.push(line)
  }

  return lines.join('\n')
}

async function startCLI() {
  await initPage({
    headless: args.headless,
    temp: args.temp
  })
  await initModel(chatgpt_init)

  echo.inf('Bot Ready! Type your prompt below (or "exit" to quit):\n')

  while (true) {
    const userInput = (await collectMultiline('--- Question ---')).trim()
    // const userContext = (await collectMultiline('--- Context ---')).trim()

    if (userInput.toLowerCase() === 'exit') break
    if (!userInput) continue

    try {
      await chat(userInput)
    } catch (err) {
      echo.err('Error during ask:', err)
    }
  }

  rl.close()
  shutdown()
}

startCLI()
