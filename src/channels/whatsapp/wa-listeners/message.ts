import {
	reply,
	getId,
	getJid,
	getUid,
	isJidUser,
	isJidGroup,
	connection,
	isJidBroadcast,
	downloadContentFromMessage,
	type HandlerData,
	type MediaType,
	type proto,
} from '../ws.ts'

//! Do not change import to 'action.ts'
import { makeDir } from '../../../agent/actions/file_system.ts'
import { Color, echo } from '../../../utils/tui.ts'
import { env } from '../../../utils/config.ts'
import { writeFile } from 'node:fs/promises'
import { extension } from 'mime-types'
import { join } from 'node:path'

const agentName = '@' + env.agent_name.toLowerCase()
const agentLid = '@' + getId(env.agent_lid)
const agentJid = '@' + getId(env.agent_jid)

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
				// echo.isp(msg)

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
			reactions.forEach(({ key: keyTo, reaction: { key: keyFrom, text: reaction } }) => {
				echo.cst([Color.BG_BLUE, 'reaction'], { keyTo, keyFrom, reaction })
			})
		})

	}
)

type Message = proto.IMessage

type MediaMessage = NonNullable<
	| Message['imageMessage']
	| Message['audioMessage']
	| Message['videoMessage']
	| Message['documentMessage']
> & { fileName?: string | null }

type ParsedMessage = Prettify<{
  type?: Returns<typeof getMessageType>
	media?: string
  request?: string
	mentions?: string[]
	quoted?: {
		from?: string
		text?: string
		media?: string
	}
}>

function unwrapMessage(m: Message) {
	if (m.ephemeralMessage)
		m = m.ephemeralMessage.message!

	if (m.viewOnceMessage)
		m = m.viewOnceMessage.message!

	if (m.viewOnceMessageV2)
		m = m.viewOnceMessageV2.message!

	if (m.editedMessage)
		m = m.editedMessage.message!

	return m
}

function getMessageType(m: Message) {
	return (
		/* eslint-disable indent */
			m.conversation || m.extendedTextMessage ? 'text' :
			m.imageMessage ? 'image' :
			m.audioMessage ? 'audio' :
			m.videoMessage ? 'video' :
			m.documentMessage ? 'document' :
			undefined
	) /* eslint-enable indent */
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

async function getMessageMedia(m: MediaMessage, type: MediaType) {
	const stream = await downloadContentFromMessage(m, type)
	const path = join(__agentdir, 'media',
		`${Date.now()}_${m.fileName ?? `${type}.${extension(m.mimetype!)}`}`
	)

	let buffer = Buffer.from([])
	for await (const chunk of stream) {
		buffer = Buffer.concat([buffer, chunk])
	}

	await makeDir(path)
	await writeFile(path, buffer)

	return { path, buffer }
}

async function parseMessage(m: Message) {
	m = unwrapMessage(m)

	const result: ParsedMessage = {
		type: getMessageType(m),
		request: getMessageText(m),
	}

	const mentions = m.extendedTextMessage?.contextInfo?.mentionedJid
	if (mentions && mentions.length) {
		result.mentions = mentions
	}

	const quoted = m.extendedTextMessage?.contextInfo?.quotedMessage
	if (quoted) {
		result.quoted = {
			from:
				m.extendedTextMessage?.contextInfo?.participant ||
				quoted.extendedTextMessage?.contextInfo?.participant ||
				undefined,
			text: getMessageText(quoted),
			media: undefined //! implement
		}
	}

	const type = result.type
	if (type && type !== 'text') {
		result.media = (await getMessageMedia(m[`${type}Message`]!, type)).path
	}

	return result
}

async function userHandler(_this: HandlerData) {
	const { jid, m } = _this
	const parsed = await parseMessage(m)
	const { request } = parsed

	if (!request) return

	const __this = {
		..._this,
		...parsed,
		uid: jid,
		request,
	}

	await reply(__this)
}

async function groupHandler(_this: HandlerData) {
	const { jid, m, msg } = _this
	const parsed = await parseMessage(m)
	const { request, mentions = [] } = parsed

	if (!request) return
	const lRequest = request.toLowerCase()

	if (!(
		mentions.includes(env.agent_lid) ||
		lRequest.includes(agentName) ||
		lRequest.includes(agentLid) ||
		lRequest.includes(agentJid)
	)) return

	const __this = {
		..._this,
		...parsed,
		gid: jid,
		uid: getUid(msg),
		request,
	}

	await reply(__this)
}
