import { autoReply,  errors,type PActions } from './consts.ts'
import { Color, echo } from '../../utils/tui.ts'
import { spawn } from 'node:child_process'
import { delay } from '../../utils/helpers.ts'

const system_actions = {

	none() { echo.vrb.ln([Color.BR_BLACK, this.action]) },

	talk() {
		const { action, text } = this

		echo.cst.ln([Color.GREEN, action], '\n' + text)
		autoReply(this, text)
	},

	'sys.reload'() {
		const { action, reason } = this

		echo.cst.ln([Color.YELLOW, action], reason)
		autoReply(this, `*[SYSTEM]* \`Reload\`\n${reason}`)
		global.isReloading = true
		global.actions?.reload
		// delay('.5'.m, () => globa.isReloading = false)
	},

	'sys.shutdown'() {
		const { action , reason } = this

		echo.cst([Color.RED, action], reason)
		autoReply(this, `*[SYSTEM]* \`Shutdown\`\n${reason}`)
			?.finally(shutdown)
	},

	'sys.restart'() {
		const { action, reason } = this

		echo.cst.ln([Color.YELLOW, action], reason)

		try {
			const cmd = process.argv.join(' ')

			const child = spawn(
				cmd,
				{
					stdio: 'inherit',
					shell: true,   // KEY: run exact command
				}
			)

			// child.unref()

			child.on('spawn', () => {
				autoReply(this, '*[SYSTEM]* `Restart`')
					?.finally(shutdown)
			})

		}
		catch (err: any) {
			errors(this, err)
		}
	},

	status() {
		const { action, state, details } = this

		echo.cst.ln([Color.GREEN, action], state, '\n' + details)
		autoReply(this, `*[STATUS]* \`${state}\`\n${details}`)
	},

	error() {
		const {
			action,
			error,
			details,
			missing_fields,
			suggested_fix,
		} = this

		const msg = `*[ERROR]* \`${error}\`${
			details ? `\nReason: ${details}\n` : ''
		}${
			missing_fields?.length
				? `\n\rMissing fields:\n\r    ${missing_fields.join(',\n    ')}\n`
				: ''
		}${
			suggested_fix ? `\nSuggested fix: ${suggested_fix}` : ''
		}`.trim()

		echo.cst.ln([Color.GREEN, action], msg)
		autoReply(this, msg)
	},

} as const satisfies PActions

export { system_actions }
