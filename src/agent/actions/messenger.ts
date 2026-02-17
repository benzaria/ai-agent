import { jidNormalizedUser } from '../../channels/whatsapp/ws.ts'
import { reply, type PActions } from './consts.ts'
import { echo } from '../../utils/tui.ts'

const messenger_actions = {

	messenger() {
		const {
			action,
			platform,
			mentions,
			message,
			to, uJid, gJid,
		} = this

		const target = jidNormalizedUser(to)
		const toMention = `@${target.split('@')[0]}`
		const _mentions = [...mentions, target]

		echo.cst([32, action], { to, uJid, gJid, mentions }, '\n' + message)

		if (![gJid, uJid].includes(target)) {
			if (gJid) reply(this, `${platform} -> ${toMention}`, _mentions)
			else reply(this, `${platform} -> ${toMention}\n${message}`, _mentions)
		}

		return ws.send(
			target,
			{
				text: message,
				mentions: _mentions,
			}
		)
	},

} as const satisfies PActions

export { messenger_actions }
