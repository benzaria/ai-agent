// @ts-nocheck
import { Obj } from '../src/utils/object.ts'
import { echo } from '../src/utils/tui.ts'

function assert(condition: any, message: string) {
	if (!condition) {
		throw new Error('❌ ' + message)
	}
}

function run(name: string, fn: () => void) {
	try {
		fn()
		echo.scs('✅', name)
	} catch (e) {
		echo.err('❌', name)
		echo.err(e)
	}
}

/* -------------------------------------------------- */
/* BASIC CONSTRUCTION */
/* -------------------------------------------------- */

run('Construct from object', () => {
	const obj = new Obj({ a: 1, b: 2 })
	assert(obj.size === 2, 'size 2')
	assert(obj.get('a') === 1, 'get a')
})

run('Construct from entries', () => {
	const obj = new Obj([['x', 10], ['y', 20]])
	assert(obj.size === 2, 'size 2')
	assert(obj.get('y') === 20, 'get y')
})

/* -------------------------------------------------- */
/* SET / DELETE */
/* -------------------------------------------------- */

run('Set increases size', () => {
	const obj = new Obj<string, number>()
	obj.set('a', 1)
	assert(obj.size === 1, 'size after set')
})

run('Set existing does not increase size', () => {
	const obj = new Obj({ a: 1 })
	obj.set('a', 2)
	assert(obj.size === 1, 'size unchanged')
	assert(obj.get('a') === 2, 'value updated')
})

run('Delete decreases size', () => {
	const obj = new Obj({ a: 1, b: 2 })
	obj.delete('a')
	assert(obj.size === 1, 'size decreased')
})

run('Delete non-existing returns false', () => {
	const obj = new Obj({ a: 1 })
	assert(obj.delete('x') === false, 'delete false')
})

/* -------------------------------------------------- */
/* ITERATION */
/* -------------------------------------------------- */

run('Iterator works', () => {
	const obj = new Obj({ a: 1, b: 2 })
	const result = [...obj]
	assert(result.length === 2, 'iterator length')
})

run('forEach works', () => {
	const obj = new Obj({ a: 1, b: 2 })
	let sum = 0
	obj.forEach(v => sum += v)
	assert(sum === 3, 'forEach sum')
})

/* -------------------------------------------------- */
/* MAP */
/* -------------------------------------------------- */

run('map returns new instance', () => {
	const obj = new Obj({ a: 1 })
	const mapped = obj.map(v => v + 1)
	assert(mapped.get('a') === 2, 'mapped value')
	assert(obj.get('a') === 1, 'original unchanged')
})

run('mapThis mutates', () => {
	const obj = new Obj({ a: 1 })
	obj.mapThis(v => v + 1)
	assert(obj.get('a') === 2, 'mutated')
})

/* -------------------------------------------------- */
/* FILTER */
/* -------------------------------------------------- */

run('filter returns subset', () => {
	const obj = new Obj({ a: 1, b: 2, c: 3 })
	const filtered = obj.filter(v => v > 1)
	assert(filtered.size === 2, 'filtered size')
})

run('filterThis mutates', () => {
	const obj = new Obj({ a: 1, b: 2 })
	obj.filterThis(v => v > 1)
	assert(obj.size === 1, 'mutated filter')
})

/* -------------------------------------------------- */
/* CLONE */
/* -------------------------------------------------- */

run('clone creates new instance', () => {
	const obj = new Obj({ a: 1 })
	const clone = obj.clone()
	clone.set('a', 2)
	assert(obj.get('a') === 1, 'original untouched')
})

/* -------------------------------------------------- */
/* JSON */
/* -------------------------------------------------- */

run('json works', () => {
	const obj = new Obj({ a: 1 })
	assert(obj.json() === '{"a":1}', 'json correct')
})

/* -------------------------------------------------- */
/* CACHE VALIDATION */
/* -------------------------------------------------- */

run('cache invalidates on set', () => {
	const obj = new Obj({ a: 1 })
	obj.entries()
	obj.set('b', 2)
	const e = obj.entries()
	assert(e.length === 2, 'cache updated')
})

/* -------------------------------------------------- */
/* CLEAR */
/* -------------------------------------------------- */

run('clear resets object', () => {
	const obj = new Obj({ a: 1 })
	obj.clear()
	assert(obj.size === 0, 'cleared')
})

echo()
echo.cst('inf', '🎉 ALL TESTS FINISHED')
