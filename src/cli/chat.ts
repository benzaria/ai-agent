import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { initPage, initModel, chat, initProvider } from '../model/bot.ts'
import { echo } from '../utils/helpers.ts'
import { instructions } from '../parser/instructions.ts'


const rl = readline.createInterface({ input, output })

async function collectPrompt(prompt: string): Promise<string> {
  echo(`${prompt}`)
  let lines = []

  while (true) {
    const line = await rl.question('')
    if (line.trim() === "") break
    lines.push(line)
  }

  return lines.join('\n')
}

async function startCLI(callback?: (...args: any[]) => any) {
  await initPage(args.headless)
  await initProvider('openai/gpt-5-mini')
  await initModel(instructions)

  echo.inf('Bot Ready! Type your prompt below (or "exit" to quit):\n')
  let prompt, response

  while (true) {
    prompt = (await collectPrompt('--- Request ---')).trim()

    if (prompt.toLowerCase() === 'exit') break
    if (!prompt) continue

    try {
      response = await chat({request: prompt})
    } catch (err) {
      echo.err('Error during ask:', err)
    }

    callback ? callback(prompt, response) : null
  }

  rl.close()
  shutdown()
}

if (import.meta.main) startCLI()

export {
  startCLI
}
