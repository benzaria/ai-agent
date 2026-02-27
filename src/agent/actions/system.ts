import { errors, autoReply, returns, type PActions } from './consts.ts'
import { Color, echo } from '../../utils/tui.ts'
import { spawn } from 'node:child_process'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as {
	new (...args: string[]): AsyncFn<any[], any>
    (...args: string[]): AsyncFn<any[], any>
    readonly prototype: AsyncFn<any[], any>
}

const system_actions = {

	none() { echo.vrb.ln([Color.BR_BLACK, 'none']) },

	talk() {
		const { action, text } = this

		echo.cst.ln([Color.GREEN, action], '\n' + text)
		autoReply(this, text)
	},

	async shutdown() {
		const { action , reason } = this

		echo.cst([Color.RED, action], reason)
		await autoReply(this, `*[SYSTEM]* \`Shutdown\`\n${reason}`)
		shutdown()
	},

	restart() {
		const { action, reason } = this

		echo.cst.ln([33, action], reason)

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

			child.on('spawn', async () => {
				await autoReply(this, '*[SYSTEM]* `Restart`')
				shutdown()
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

	async execute() {
		const { action, command } = this

		echo.cst.ln([Color.GREEN, action], command)
		await new AsyncFunction(command)()
			.then(result => returns(this, result))
			.catch(err => errors(this, err))
	},

	auth_user() {},

} as const satisfies PActions

export { system_actions }
