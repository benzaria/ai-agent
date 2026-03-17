import { delay, queue } from '../src/utils/helpers.ts'
import { echo } from '../src/utils/tui.ts'
import '@benzn/to-ms/extender'

const fn1 = queue(
	function (this: any, time: number) {
		return delay(time).then(() => echo(this))
	}
)

fn1.call('test1', '2'.s)
fn1.call('test2', '1'.s)

echo(fn1.pending, fn1.count)
delay(() => echo(fn1.pending, fn1.count), '2.5'.s)
await fn1.idle()
echo(fn1.pending, fn1.count)

echo('test3')
