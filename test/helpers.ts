import '../src/cli/arguments.ts'
import { delay, echo } from '../src/utils/helpers.ts'

// @ts-ignore
global.args.verbose = true

echo('test_start')

delay(2_000)
    .then(echo('test_callback'))
    .catch(echo('test_callback_2'))

delay(2_000, echo('test_callback'))

// echo.inf.lr('test_1___')
// echo.inf('test_2')

// echo.wrn.lr('test_1___')
// echo.wrn('test_2')

// echo.err.lr('test_1___')
// echo.err('test_2')

// echo.scs.lr('test_1___')
// echo.scs('test_2')


// await delay(2000)

echo('test_end')
