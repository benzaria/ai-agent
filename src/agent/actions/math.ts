import { reply, type PActions } from './consts.ts'
import { echo } from '../../utils/tui.ts'

const math_actions = {

	calculate() {
		const { action, expression } = this

		const result = new Function(`return (${expression})`)()
		const msg = `${expression} = *${result}*`

		echo.cst.ln([32, action], msg)
		reply(this, msg)
	},

} as const satisfies PActions

export { math_actions }
