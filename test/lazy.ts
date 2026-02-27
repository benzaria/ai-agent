import { delay, lazy } from '../src/utils/helpers.ts'
import { echo } from '../src/utils/tui.ts'
import '@benzn/to-ms/extender'

const fn = lazy(
	function (this: any, time: number) {
		return delay(time).then(() => this)
	}
)

fn.call('test1', '2'.s).then(echo)
fn.call('test2', '1'.s).then(echo)

await fn.idle()

echo('test3')
