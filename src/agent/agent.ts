import '../utils/event.ts'
import '../cli/args.ts'
import { initWASocket } from '../channels/whatsapp/ws.ts'
import { initBot } from '../model/bot.ts'
import { echo } from '../utils/tui.ts'

async function initAgent() {

	await initWASocket()
	await initBot()

}

initAgent()

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', err => {
	echo.err(err)
	shutdown()
})
