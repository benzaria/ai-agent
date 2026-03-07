import { type Codes256, Color, echo } from '../src/utils/tui.ts'
import { exit } from 'node:process'
import '../src/cli/args.ts'

global.args.verbose = true

echo('test_start')
echo.ln('test')

echo.inf.lr('test_1___')
echo.inf('test_2')

echo.wrn.lr('test_1___')
echo.wrn('test_2')

echo.err.lr('test_1___')
echo.err('test_2')

echo.scs.lr('test_1___')
echo.scs('test_2')

echo.isp({
	name: 'name',
	fn: () => 'void',
	obj: {
		obj: {
			obj: {
				name: 'name'
			}
		}
	}
}, {
	depth: 1,
	colors: true
})

echo('test_end')
