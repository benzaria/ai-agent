import '../src/cli/arguments.ts'
import { delay, echo } from '../src/utils/helpers.ts'

// @ts-ignore
global.args.verbose = true

echo('test_start')



echo.inf('test_1___')
echo.inf.lr('test_2')

echo.wrn('test_1___')
echo.wrn.lr('test_2')

echo.err('test_1___')
echo.err.lr('test_2')

echo.scs('test_1___')
echo.scs.lr('test_2')


// await delay(2000)

echo('test_end')
