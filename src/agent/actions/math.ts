import { autoReply, type PActions } from './consts.ts'
import { Color, echo } from '../../utils/tui.ts'

const math_actions = {

	calculate() {
		const { action, expression } = this

		const result = new Function(`return (${expression})`)()
		const msg = `${expression} = *${result}*`

		echo.cst.ln([Color.GREEN, action], msg)
		autoReply(this, msg)
	},

} as const satisfies PActions

export { math_actions }
