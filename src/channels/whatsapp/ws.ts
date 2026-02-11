import { createWASocket, type WS } from './wa-socket.ts'
import { parser } from '../../agent/parser.ts'
import { echo } from '../../utils/helpers.ts'
import { env } from '../../utils/config.ts'
import { chat } from '../../model/bot.ts'

async function initWASocket() {
  global.ws = await createWASocket({
    authDir: env.wsAuth,
    printQr: true,
    logger: 'silent',
  
    onQr(qr) {
      echo('Received QR string length:', qr.length)
    }
  })

  return new Promise((res) => {
    ws.ev.on('connection.update', function ({ connection }) {
      if (connection === 'open') res(global.ws)
    })
  })
}

function initListeners(ws: WS = global.ws) {
  // 🧩 Basic message listener
  ws.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      const jid = msg.key.remoteJid

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text || ''

      echo(`📩 ${jid}:`, text)


      if (text === 'ping') {
        return void(ws.sendMessage(jid!, { text: 'pong 🏓' }))
      }

      parser(text, await chat(text))

    }
  })
}

export {
  initWASocket,
  initListeners,
}
