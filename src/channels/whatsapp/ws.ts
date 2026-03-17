import {
	createWASocket,
	type CreateSocketOpts,
} from './wa-socket.ts'

import {
	jidNormalizedUser,
	isLidUser,
	isPnUser,
	type WAMessage,
	type proto,
} from 'baileys'

//! Do not change imports to 'action.ts'
import { parser, runAction } from '../../agent/interaction.ts'
import { queue, delay, repeat } from '../../utils/helpers.ts'
import { autoReply } from '../../agent/actions/consts.ts'
import { Color, echo } from '../../utils/tui.ts'
import { ask } from '../../model/bot.ts'
import './wa-listeners.ts'

type MsgData = Prettify<
	& HandlerData
	& {
		uid: string
		gid?: string
	}
	& {
		type?: string
		media?: string
		request: string
		mentions?: string[]
		quoted?: {
			from?: string
			text?: string
			media?: string
		}
	}
>

type HandlerData = Prettify<{
	/** `gid ?? uid` */
	jid: string
	msg: WAMessage
	m: proto.IMessage
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

function slashCommand(_this: MsgData, command = _this.request): void | true {
	if (!command.startsWith('/')) return
	command = command
		.toLowerCase()
		.slice(1)

	switch (command) {
		case 'ping':
			autoReply(_this, 'pong 🏓')
			break

		case 'shutdown':
		case 'restart':
		case 'reload':
			runAction({
				..._this as any,
				action: `sys.${command}`,
				reason: 'Exec slash command'
			})
			break

			// case env.admin_key:

			// 	break

		default:
			return
	}

	return true
}

const reply = queue(
	async function (_this: MsgData) {
		const {
			uid, gid,
			msg: { key },
			mentions,
			request,
			quoted,
			media,
		} = _this

		// Mark as Read
		ws.readMessages([key!])
		echo.isp(_this)

		// Handle Slash Commands
		if (slashCommand(_this)) return

		// Mark as Typing
		const typing = startTyping(_this)

		// Handle Ask and Parser
		const response = await ask({
			request,
			chat: gid,
			from: uid,
			mentions,
			quoted,
			media,
		})

		parser({ ..._this, response })
			.finally(typing.stop)
	}
)

function startTyping({ jid }: MsgData, interval = '.5'.s, timeout = '5'.s) {

	const start = () => {
		ws.sendPresenceUpdate('composing', jid)
		echo.vrb([Color.BR_GREEN, 'typing'], 'started')
		global.typing = timeout
	}

	const stop = () => {
		timer.clear()
		ws.sendPresenceUpdate('paused', jid)
		!global.typing || echo.vrb([Color.BR_GREEN, 'typing'], 'stoped')
		global.typing = 0
	}

	const timer = repeat(
		function () {
			if (global.typing <= 0 || !global.typing) start()
			global.typing -= interval
		},
		interval
	)

	delay(stop, '2'.m)

	return { stop }
}

function isJidUser(jid?: string) { return isLidUser(jid) || isPnUser(jid) }
function getId (jid: string) { return +jidNormalizedUser(jid).split('@')[0] }
function getJid({ key }: WAMessage) { return jidNormalizedUser(key.remoteJidAlt || key.remoteJid!) }
function getUid({ key }: WAMessage) { return jidNormalizedUser(key?.participant || key?.participantAlt) }

export {
	initWASocket,
	startTyping,
	isJidUser,
	getUid,
	getJid,
	getId,
	reply,
}

export type {
	HandlerData,
	MsgData
}

export * from 'baileys'
export * from './wa-socket.ts'
