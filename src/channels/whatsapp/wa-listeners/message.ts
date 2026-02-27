import {
	reply,
	getID,
	getJid,
	getUid,
	isJidUser,
	isJidGroup,
	connection,
	isJidBroadcast,
	type MsgData,
	type WAMessage,
	type HandlerData,
} from '../ws.ts'

import { Color, echo } from '../../../utils/tui.ts'
import { env } from '../../../utils/config.ts'

const agentName = '@' + env.agent_name.toLowerCase()
const agentLid = '@' + getID(env.agent_lid)
const agentJid = '@' + getID(env.agent_jid)

connection(
	function () {
		this.ev.on('messages.upsert', async ({ messages, type }) => {
			if (type !== 'notify') return

			for (const msg of messages) {
				const { message: m, key } = msg
				const jid = getJid(msg)

				if (
					!m ||
					key.fromMe ||
					m.protocolMessage ||
					m.senderKeyDistributionMessage ||
					isJidBroadcast(jid)
				) continue

				const _this = { msg, m, jid }
				echo.isp(msg)

				if (isJidUser(jid)) {
					userHandler(_this)
				}
				else if (isJidGroup(jid)) {
					groupHandler(_this)
				}
				else {
					echo.wrn('Unknown jid:', jid)
				}
			}
		})

		this.ev.on('messages.reaction', async (reactions) => {
			reactions.forEach(({ key, reaction }) => {
				echo.cst([Color.BG_BLUE, 'reaction'], { key, reaction })
			})
		})
	}
)

type Message = NonNullable<WAMessage['message']>

type ParsedMessage = Prettify<{
  type?: string
  request?: string
	mentions?: string[]
	quoted?: {
		from?: string
		text?: string
	}
}>

function unwrapMessage(m: Message) {
	if (m.ephemeralMessage)
		m = m.ephemeralMessage.message!

	if (m.viewOnceMessage)
		m = m.viewOnceMessage.message!

	if (m.editedMessage)
		m = m.editedMessage.message!

	return m
}

function getMessageType(m: Message) {
	if (m.conversation || m.extendedTextMessage) return 'text'
	if (m.imageMessage) return 'image'
	if (m.videoMessage) return 'video'
	if (m.audioMessage) return 'audio'
	if (m.documentMessage) return 'document'
	return 'unknown'
}

function getMessageText(m: Message) {
	return (
		m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
		undefined
	)
}

function parseMessage(m: Message) {
	m = unwrapMessage(m)
	const result: ParsedMessage = {
		type: getMessageType(m),
		request: getMessageText(m),
	}

	const t = m.extendedTextMessage?.contextInfo?.mentionedJid
	if (t && t.length) {
		result.mentions = t
	}

	const q = m.extendedTextMessage?.contextInfo?.quotedMessage
	if (q) {
		result.quoted = {
			from:
				m.extendedTextMessage?.contextInfo?.participant ||
				q.extendedTextMessage?.contextInfo?.participant ||
				undefined,
			text: parseMessage(q).request
		}
	}

	return result
}

async function userHandler(_this: HandlerData) {
	const { jid, m } = _this
	const parsed = parseMessage(m)
	const { request, type } = parsed

	if (!request) return

	echo(type)

	_this = {
		..._this,
		...parsed,
		uid: jid,
		request,
	} satisfies MsgData as MsgData

	await reply(_this)
}

async function groupHandler(_this: HandlerData) {
	const { jid, m, msg } = _this
	const parsed = parseMessage(m)
	const { request, type, mentions } = parsed

	if (!request) return
	const lRequest = request.toLowerCase()

	echo(type)

	if (!(
		mentions?.includes(env.agent_lid) ||
		lRequest.includes(agentName) ||
		lRequest.includes(agentLid) ||
		lRequest.includes(agentJid)
	)) return

	_this = {
		..._this,
		...parsed,
		gid: jid,
		uid: getUid(msg),
		request,
	} satisfies MsgData as MsgData

	await reply(_this)
}
