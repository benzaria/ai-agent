import { autoReply, returns, errors, mapKey, type PActions } from './consts.ts'
import { getId, type AnyMessageContent } from '../../channels/whatsapp/ws.ts'
import { hotImport, queue } from '../../utils/helpers.ts'
import { writeFile, readFile } from 'node:fs/promises'
import { Color, echo } from '../../utils/tui.ts'
import { Obj } from '../../utils/object.ts'
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

		const target = '@' + getId(to)
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

	async 'contact.has'() {
		const { action, name = '', keywords = [] } = this
		echo.cst.ln([Color.CYAN, action], { keywords })

		let contact: number | Contacts | undefined

		contact = contacts.get(name)
		if (contact)
			return await returns(this, { [name]: contact })

		const lKeywords = mapKey(keywords)

		contact = contacts
			._filter(
				(_number, name) => (
					lKeywords.some(
						key => name
							.toLowerCase()
							.includes(key)
					)
				)
			)

		await returns(this, contact)
	},

	async 'contact.get'() {
		const { action, name = '' } = this
		echo.cst.ln([Color.CYAN, action], { name })

		const contact = contacts.get(name)
		if (!contact)
			return errors(this, { msg: 'Contact not found' })

		await returns(this, { [name]: contact })
	},

	'contact.set'() {
		const { action, name = '', number } = this
		echo.cst.ln([Color.CYAN, action], { name, number })

		if (!number)
			return errors(this, { msg: 'Missing number' })

		if (contacts.has(name))
			return errors(this, { msg: 'Contact already exists' })

		contacts.set(name, number)
		saveContacts()

		autoReply(this, `*[WRITE]* \`contact: ${name}\``)
	},

	'contact.del'() {
		const { action, name = '' } = this
		echo.cst.ln([Color.CYAN, action], { name })

		const contact = contacts.has(name)
		if (!contact)
			return errors(this, { msg: 'Contact not found' })

		contacts.delete(name)
		saveContacts()

		autoReply(this, `*[DELETE]* \`contact: ${name}\``)
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

type VCard = [name: string, jid: number]
type Contacts = Record<string, number>

const parseVCard = (vcard: string) => {
	const match = vcard.match(/FN:(.+)[\s\S]*waid=(\d+)/) || []
	return [match[1], +match[2]] as VCard
}

const contactPath = join(__agentdir, 'contact.json')

async function loadContacts(force: boolean = false) {
	if (global.contacts && !force) return global.contacts
	let contacts: Contacts

	try {
		contacts = await hotImport(contactPath)
	}
	catch (err) {
		echo.err(err)
		contacts = { [env.agent_name]: getId(env.agent_jid) }
	}

	echo.vrb([Color[256][33], 'contacts'], contacts)
	global.contacts = new Obj(contacts)
	return saveContacts()
}

const saveContacts = queue(
	async function (vcard?: string | VCard) {
		if (typeof vcard === 'string')
			vcard = parseVCard(vcard)

		if (vcard) contacts.set(...vcard)

		await writeFile(
			contactPath,
			contacts.json(2)
		).catch(echo.err)

		return contacts
	}
)

await loadContacts(global.isReloading)

export {
	loadContacts,
	saveContacts,
	parseVCard,
}

export type {
	Contacts,
	VCard,
}
