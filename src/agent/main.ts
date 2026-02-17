import '../cli/arguments.ts'

import { initWASocket } from '../channels/whatsapp/ws.ts'
import { initBot } from '../model/bot.ts'

async function initAgent() {

	await initWASocket()
	await initBot()

}

initAgent()

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', shutdown)
