// import { delay } from '../../utils/helpers.ts'
import { env } from '../../utils/config.ts'
import { echo } from '../../utils/tui.ts'
import { rm } from 'fs/promises'
import { join } from 'path'

event.on('Actions-reload',
	async function () {
		echo.inf('Reloading session...')

		global.isReloading = true
		await global.actions?.reload()
			.catch(echo.err)

		global.isReloading = false
	}
)

event.on('Agent-shutdown',
	async function () {
		echo.inf('Closing session...')

		await global.browser?.close()
		await rm(join(env.user_data, 'Default/Sessions'), { recursive: true, force: true })
			.catch(() => echo.vrb('err', 'No such file or directory: "/Default/Sessions"'))

		process.exit()
	}
)

event.on
