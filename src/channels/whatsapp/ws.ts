import {
	createWASocket,
	connection,
	type CreateSocketOpts,
} from './wa-socket.ts'

import {
	jidNormalizedUser,
	isLidUser,
	isPnUser,
	type WAMessage,
} from 'baileys'

import { queue, delay } from '../../utils/helpers.ts'
import { parser } from '../../agent/interaction.ts'
import { autoReply } from '../../agent/actions.ts'
import { Color, echo } from '../../utils/tui.ts'
import { ask } from '../../model/bot.ts'
import {} from './wa-listeners.ts'

type MsgData = Prettify<
	& HandlerData
	& {
		uid: string
		gid?: string
		request: string
		mentions?: string[]
		quoted?: {
			from?: string
			text?: string
		}
	}
>

type HandlerData = Prettify<{
	jid: string
	msg: WAMessage
	m: NonNullable<WAMessage['message']>
}>

async function initWASocket(opts?: CreateSocketOpts) {
	global.ws = await createWASocket(opts ?? {
		logger: 'none',
		printQr: true,

		onQr(qr) {
			echo('Received QR string length:', qr.length)
		}
	}, initWASocket)

	return global.ws
}

const reply = queue(
	async function (_this: MsgData) {
		const { uid, gid, msg: { key }, request, mentions, quoted } = _this

		// Mark as Read
		ws.readMessages([key!])

		// Handle ping/pong
		if (request.toLowerCase() === 'ping') {
			autoReply(_this, 'pong 🏓')
			return
		}
		// echo.isp({
		// 	request,
		// 	chat: gid,
		// 	from: uid,
		// 	mentions,
		// 	quoted,
		// })
		// Mark as Typing
		const typing = startTyping(gid ?? uid)

		// Handle ask and parser
		const response = await ask({
			request,
			chat: gid,
			from: uid,
			mentions,
			quoted,
		})

		parser({ ..._this, response })
			.finally(typing.stop)
	}
)

function startTyping(jid: string, interval = '.5'.s, timeout = '5'.s) {

	const start = () => {
		ws.sendPresenceUpdate('composing', jid)
		echo.vrb([Color.BR_GREEN, 'typing'], 'started')
		global.typing = timeout
	}

	const stop = () => {
		clearInterval(id)
		ws.sendPresenceUpdate('paused', jid)
		!global.typing || echo.vrb([Color.BR_GREEN, 'typing'], 'stoped')
		global.typing = 0
	}

	const id = setInterval(() => {
		if (global.typing <= 0 || !global.typing) start()
		global.typing -= interval
	}, interval)

	delay('2'.m, stop)

	return { stop }
}

function isJidUser(jid?: string) { return isLidUser(jid) || isPnUser(jid) }
function getID (jid: string) { return +jidNormalizedUser(jid).split('@')[0] }
function getJid({ key }: WAMessage) { return jidNormalizedUser(key.remoteJidAlt || key.remoteJid!) }
function getUid({ key }: WAMessage) { return jidNormalizedUser(key?.participant || key?.participantAlt) }

export {
	initWASocket,
	startTyping,
	connection,
	isJidUser,
	getUid,
	getJid,
	getID,
	reply,
}

export type {
	HandlerData,
	MsgData
}

export * from 'baileys'
export * from './wa-socket.ts'
