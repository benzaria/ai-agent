import {
  createWASocket,
  type CreateSocketOpts,
  type WS,
} from './wa-socket.ts'

import {
  jidNormalizedUser,
  isJidBroadcast,
  isJidGroup,
  isLidUser,
  isPnUser,
  type WAMessage,
} from 'baileys'

import { echo, queue } from '../../utils/helpers.ts'
import { parser } from '../../agent/interaction.ts'
import { reply } from '../../agent/actions.ts'
import { env } from '../../utils/config.ts'
import { chat } from '../../model/bot.ts'
import { inspect } from 'node:util'

type MsgData = Prettify<
  & {
    msg: WAMessage
  }
  & {
    uJid: string
    gJid?: string
    request: string
    mentions: string[]
  }
>

const qchat = queue(chat)

async function initWASocket(
  opts?: CreateSocketOpts | null,
  callback?: SyncFn<[ws?: WS]>
) {
  global.ws = await createWASocket(opts ?? {
    logger: 'none',
    printQr: true,

    onQr(qr) {
      echo('Received QR string length:', qr.length)
    }
  }, initWASocket)

  await connection()
    .then(callback ?? initListeners)
    .catch(echo.err)

  return global.ws
}

const connection = () => new Promise((res: (value: WS) => void) => {
  ws.ev.on('connection.update', function ({ connection }) {
    if (connection === 'open') res(global.ws)
  })
})

function initListeners(ws: WS = global.ws) {

  ws.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      // ignore bot messages and broadcasts
      if (msg.key.fromMe || isJidBroadcast(msg.key.remoteJid!)) continue

      // Get message uJid
      const uJid = jidNormalizedUser(msg.key.remoteJidAlt || msg.key.remoteJid!)
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const request = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

      const isp = args.verbose && inspect(msg,
        {
          depth: 5,
          colors: true
        }
      )

      const data = {
        msg,
        uJid,
        request,
        mentions,
      }

      if (isLidUser(uJid) || isPnUser(uJid)) {
        echo.vrb([94, 'user'], isp)
        userHandler(data)
      }
      else if (isJidGroup(uJid) && (
        mentions.length
          ? mentions.includes(env.bot_lid)
          : request.includes(`@${env.bot_name}`)
      )) {
        echo.vrb([94, 'group'], isp)
        groupHandler(data)
      }

    }
  })

  //? ws.ev.on('')

}

async function userHandler(data: MsgData) {

  await makeReply(data)
}

async function groupHandler(data: MsgData) {

  const _data = {
    ...data,
    gJid: data.uJid,
    uJid: jidNormalizedUser(data.msg.key?.participant || data.msg.key?.participantAlt),
  }

  await makeReply(_data)
}

async function makeReply(data: MsgData) {
  const { uJid, gJid, msg: { key }, request, mentions } = data

  // Seen and typing
  ws.readMessages([key!])
    .then(() => ws.sendPresenceUpdate('composing', uJid))

  // Handle ping/pong
  if (request.toLowerCase() === 'ping'){
    reply({ uJid }, 'pong 🏓')
  }
  else {
   const response = await qchat({
    request,
    chat: gJid,
    from: uJid,
    mentions,
   })
   
    parser({ ...data, response })
      .finally(() => ws.sendPresenceUpdate('paused', uJid))
  }

}

export {
  initListeners,
  initWASocket,
  connection,
}

export type {
  MsgData
}

export * from 'baileys'
export * from './wa-socket.ts'
