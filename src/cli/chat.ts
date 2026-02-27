import { createInterface } from 'node:readline/promises'
import { initBot, ask } from '../model/bot.ts'
import { stdin, stdout } from 'node:process'
import { echo } from '../utils/tui.ts'

const rl = createInterface({ input: stdin, output: stdout })

async function collectPrompt(prompt?: string): Promise<string> {
	prompt && echo(prompt)
	let lines = []

	while (true) {
		const line = await rl.question('')
		if (line.trim() === '') break
		lines.push(line)
	}

	return lines.join('\n')
}

async function initCLI(parser?: AnyFunction) {
	echo.inf.ln('Bot Ready! Type your prompt below (or "exit" to quit):')
	let request, response

	while (true) {
		request = (await collectPrompt('--- Request ---')).trim()

		if (request.toLowerCase() === 'exit') break
		if (!request) continue

		try {
			response = await ask({ request })
		} catch (err) {
			echo.err(err)
		}

		parser?.({ request, response })
	}

	rl.close()
}

if (import.meta.main) {
	(async () => {
		await initBot()
		await initCLI()
		shutdown()
	})()
}

export {
	initCLI
}
