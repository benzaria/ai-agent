import '../cli/arguments.ts'
import { initWASocket } from '../channels/whatsapp/ws.ts'
import { chat, initBot } from '../model/bot.ts'
import { echo } from '../utils/helpers.ts'
import { env } from '../utils/config.ts'
import { parser } from './parser.ts'
import { reply } from './actions.ts'

async function initAgent() {

  await initWASocket()
  await initBot()
  
  ws.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      const jid = msg.key.remoteJid || env.owner_jid

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text || ''

      echo(`📩 ${jid}:`, text)

      if (text === 'ping') {
        return reply({jid}, 'pong 🏓')
      }

      parser({
        jid,
        request: text,
        response: await chat(text),
      })

    }
  })

}

initAgent()
