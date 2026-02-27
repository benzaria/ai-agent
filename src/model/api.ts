import { Color, echo } from '../utils/tui.ts'
import { initBot, ask } from './bot.ts'

// @ts-expect-error Could not find a declaration file for module 'body-parser'.
import bodyParser from 'body-parser'
import express from 'express'


const app = express()
const PORT = args.port

app.use(bodyParser.json())

app.post('/chat', async (req, res) => {
	const prompt = req.body as { request: string }
	echo.vrb([Color.BR_GREEN, 'request'], prompt)

	try {
		const resBody = await ask(prompt)
		res.json(resBody)

	} catch (error) {
		echo.err('API Error:', error)
		res.status(500).json(
			{
				error: { message: 'Internal Server Error' }
			}
		)
	}
})

async function initAPI() {
	try {
		await initBot()

		app.listen(PORT, () => {
			echo(`✅ OpenAI-compatible API running at http://localhost:${PORT}`)
		})
	} catch (err) {
		echo.err('Initialization failed:', err)
		shutdown()
	}
}

if (import.meta.main) initAPI()

export {
	initAPI
}
