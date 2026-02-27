import { getID, type AnyMessageContent } from '../../channels/whatsapp/ws.ts'
import { autoReply, returns, errors, type PActions } from './consts.ts'
import { importJson } from '../../utils/helpers.ts'
import { Color, echo } from '../../utils/tui.ts'
import { writeFile } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { env } from '../../utils/config.ts'
import { basename } from 'node:path'
import { join } from 'path'

const messenger_actions = {

	async messenger() {
		const {
			action,
			platform,
			message,
			file,
			mimetype,
			mentions,
			to, uid, gid,
		} = this

		const target = `@${getID(to)}`
		const _mentions = [...mentions ?? [], to]

		echo.cst([Color.GREEN, action], { to, uid, gid, file, mentions }, '\n' + message)

		if (![gid, uid].includes(to)) autoReply(this,
			`${platform} -> ${target}${!gid ? '\n' + message : ''}`, _mentions
		)

		if (!file || !mimetype)
			return ws.send(to, {
				text: message,
				mentions: _mentions,
			})

		return await readFile(file)
			.then(buffer => {
				const payload: AnyMessageContent = {
					mentions: _mentions,
					caption: message,
					...
					/* eslint-disable indent */
						mimetype.includes('image') ? { image: buffer } :
						mimetype.includes('video') ? { video: buffer } :
						mimetype.includes('audio') ? { audio: buffer } :
						{
							document: buffer,
							fileName: basename(file),
							mimetype,
						}
					/* eslint-enable indent */
				}

				return ws.send(to, payload)
			})
			.catch(err => errors(this, err))
	},

	contact() {
		const { action, keywords } = this

		echo.cst.ln([Color.GREEN, action], keywords)

		const lKeywords: string[] = keywords
			.map((key: string) => key.toLowerCase())

		const contact = Object.entries(global.contacts)
			.filter(
				([name]) => (
					lKeywords.filter(
						key => name
							.toLowerCase()
							.includes(key)
					)
				).length
			)

		returns(this, Object.fromEntries(contact))
	},

} as const satisfies PActions

export { messenger_actions }

// WA Contact VCard
`
	BEGIN:VCARD
	VERSION:3.0
	N:Last;Prefix First;Middle;;Suffix
	FN:Prefix First Middle Last, Suffix
	TEL;type=Mobile;waid=123456789:+123 456-789
	END:VCARD
`

const contactPath = join(__agentdir, 'contact.json')

const getContact = (vcard: string) => {
	const match = vcard.match(/FN:(.+)[\s\S]*waid=(\d+)/) || []

	return { name: match[1].toLowerCase(), jid: +match[2] }
}

async function loadContact() {
	if (global.contacts) return global.contacts

	try {
		return global.contacts = await importJson(contactPath)
	} catch {
		echo.wrn(`Contacts are not setup at: "${contactPath}"`.replaceAll('\\', '/'))

		global.contacts = {
			[env.agent_name.toLowerCase()]: getID(env.agent_jid)
		}

		saveContact()
	}
}

async function saveContact(vcard?: string) {

	if (vcard) {
		const { name, jid } = getContact(vcard)

		Object.assign(
			global.contacts,
			{
				[name]: jid
			}
		)
	}

	writeFile(
		contactPath,
		JSON.stringify(
			global.contacts,
			null, 2
		)
	).catch(echo.err)
}

await loadContact()

export {
	loadContact,
	saveContact,
	getContact,
}
