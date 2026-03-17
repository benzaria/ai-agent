import { delay, repeat, until } from '../src/utils/helpers.ts'
import { echo } from '../src/utils/tui.ts'

let _var: boolean = false

delay(() => { echo('delay_1'), _var = true }, '3'.s)


const p = until(() => _var)
	.then(() => echo('until_1'))
	.catch(echo.err)

delay(() => p.abort(() => new Error('sheesh')), '1'.s)
