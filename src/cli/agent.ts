import './args.ts'
import { initWASocket } from '../channels/whatsapp/ws.ts'
import { parser } from '../agent/interaction.ts'
import { initBot } from '../model/bot.ts'
import { echo } from '../utils/tui.ts'
import { initCLI } from './chat.ts'

async function initAgent() {

	global.isCLI = true

	await initWASocket()
	await initBot()
	await initCLI(parser)

}

initAgent()

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', err => {
	echo.err(err)
	shutdown()
})
