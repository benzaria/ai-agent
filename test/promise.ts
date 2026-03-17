import { AbortablePromise } from '../src/utils/promise.ts'
import { until } from '../src/utils/helpers.ts'
import { echo } from '../src/utils/tui.ts'

function log(title: string) {
	echo('\n===', title, '===')
}

function inspect(label: string, base: any, next: any) {
	echo(label)
	echo('same object:', base === next)
	echo('prototype:', next?.constructor?.name)
	echo('abort in next:', typeof next?.abort === 'function')
	echo('abort definition', next?.abort?.toString())
}

async function run() {

	// --------------------------------------------------
	log('BASE PROMISE')
	let base!: AbortablePromise<void>

	try {
		base = until(() => false, 100, 2000)
	} catch {}

	echo('abort in base:', typeof base.abort === 'function')


	// --------------------------------------------------
	log('THEN')

	let thenP!: AbortablePromise<void>

	try {
		thenP = base.then(() => {})
	} catch {}

	inspect('then()', base, thenP)


	// --------------------------------------------------
	log('CATCH')

	let catchP!: AbortablePromise<void>

	try {
		catchP = base.catch(() => {})
	} catch {}

	inspect('catch()', base, catchP)


	// --------------------------------------------------
	log('FINALLY')

	let finallyP!: AbortablePromise<void>

	try {
		finallyP = base.finally(() => {})
	} catch {}

	inspect('finally()', base, finallyP)


	// --------------------------------------------------
	log('CHAINED')

	let chained!: AbortablePromise<void>

	try {
		chained = base
			.then(() => {})
			.catch(() => {})
			.finally(() => {})
	} catch {}

	inspect('then().catch().finally()', base, chained)


	// --------------------------------------------------
	log('ABORT TEST')

	try {
		thenP.abort()
		catchP.abort()
		finallyP.abort()
		chained.abort()
		base.abort()
	} catch (err) {
		echo('abort threw:', err)
	}

	echo('abort still exists on base:', typeof base.abort === 'function')
	echo('abort on chained:', typeof chained.abort === 'function')

}

run()
	.catch(echo.err)
