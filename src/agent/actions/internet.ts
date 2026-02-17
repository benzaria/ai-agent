import { error, reply, type PActions } from './consts.ts'
import { Color, echo } from '../../utils/tui.ts'
import { writeFile } from 'node:fs/promises'
import { makeDir } from './file_system.ts'

const internet_actions = {

	web_search() {
		const { action, result } = this

		echo.cst.ln([Color.GREEN, action], '\n' + result)
		reply(this, `*[WEB SEARCH]*\n${result}`)
	},

	async fetch_api() {
		const { action, url, method = 'GET', headers = {}, body } = this

		try {
			echo.cst.ln([Color.BLUE, action], `\n${method} ${url}`)

			const res = await fetch(url, {
				method,
				headers,
				body: body
					? (typeof body === 'string'
						? body
						: JSON.stringify(body))
					: undefined,
			})

			const contentType = res.headers.get('content-type') || ''

			let result

			if (contentType.includes('application/json'))
				result = JSON.stringify(await res.json(), null, 2)
			else
				result = await res.text()

			echo.scs.ln(`Status: ${res.status}\n${result}`)

			reply(this, `*[FETCH API]* \`${res.status}\`\n${result}`)

		}
		catch (err: any) {
			error(this, err)
		}
	},

	async download() {
		const { action, url, destination } = this

		try {
			echo.cst.ln([Color.CYAN, action], url)

			const res = await fetch(url)

			if (!res.ok) {
				throw new Error(
					`HTTP ${res.status} ${res.statusText}`
				)
			}

			const buffer = Buffer.from(await res.arrayBuffer())

			// ensure directory exists
			await makeDir(destination)
			await writeFile(destination, buffer)

			echo.scs.ln(`Saved → ${destination}`)

			reply(this, `*[DOWNLOAD]*	\`${destination}\``)

		}
		catch (err: any) {
			error(this, err)
		}
	},

} as const satisfies PActions

export { internet_actions }
