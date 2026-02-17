import { error, reply, results, type PActions } from './consts.ts'
import { Color, echo } from '../../utils/tui.ts'
import { spawn } from 'node:child_process'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as FunctionConstructor

const system_actions = {

	none() { echo.vrb.ln([Color.BR_BLACK, 'none']) },

	talk() {
		const { action, text } = this
		echo.cst.ln([Color.GREEN, action], '\n' + text)
		reply(this, text)
	},

	shutdown() {
		echo.cst([Color.RED, 'shutdown'])
		reply(this, '*[SYSTEM]* `Shutdown`')
			.then(shutdown)
	},

	async restart() {
		const { action } = this

		echo.cst.ln([33, action]

		)
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
				reply(this, '*[SYSTEM]* `Restart`')
					.then(shutdown)
			})

		}
		catch (err: any) {
			error(this, err)
		}
	},

	status() {
		const { action, state, details } = this

		echo.cst.ln([Color.GREEN, action], state, '\n' + details)
		reply(this, `*[STATUS]* \`${state}\`\n${details}`)
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
		reply(this, msg)
	},

	async execute() {
		const { action, command } = this

		echo.cst.ln([Color.GREEN, action], command)
		await (new AsyncFunction(command)() as Promise<unknown>)
			.then(result => results(
				{
					...this,
					result,
					action_was: {
						action,
						command
					}
				}
			))
			.catch(err => error(this, err))
	},

	auth_user() {}

} as const satisfies PActions

export { system_actions }
