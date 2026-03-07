import { delay, repeat, until } from '../src/utils/helpers.ts'
import { echo } from '../src/utils/tui.ts'

let _var: boolean = false

delay('3'.s, () => { echo('delay_1'), _var = true })


until(() => _var)
	.then(() => echo('until_1'))


delay('3'.s, () => echo('delay_2'))
