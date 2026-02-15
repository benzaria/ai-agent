import { ask_instructions } from './config.ts'

const voidFn = function (...args: AnyArray | [AnyFunction]) {
	if (args.length === 1 && typeof args[0] === 'function') args[0]()
}

function lazy<T>(factory: AsyncFn<[], T>) {
	let P: Promise<T> | null = null

	return function get(): Promise<T> {
		return P ??= factory()
	}
}

function queue<P extends AnyArray, R>(fn: AsyncFn<P, R>) {
	let Q: Promise<any> = Promise.resolve()

	const queued = (...args: P): Promise<R> => {
		const result = Q.then(() => fn(...args)) // fn returns Promise<R>
		Q = result.catch(voidFn) // keep queue alive if fn throws
		return result // promise resolves with fn's value
	}

	queued.idle = (): Promise<void> => Q.then(voidFn)

	return queued
}

function delay(timeout?: number, callback?: AnyFunction): void | Promise<void> {
	return callback
		? void setTimeout(callback, timeout)
		: new Promise(res => delay(timeout, res))
}

const toHTML = (text?: string) => {
	return text ? text
		.trim() // Remove trailing empty lines
		.split(/\r?\n/) // Split by any newline format
		.map(line => {
			// Escape special characters for security
			const safeLine = line
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')

			// Wrap in <p> tag. Use &nbsp; if the line is empty so it takes up space.
			return `<p>${safeLine.trim() === '' ? '&nbsp;' : safeLine}</p>`
		})
		.join('') : ''
}

const template = (q: Query, br: string = `<br>${'-'.repeat(50)}<br>\n`) => `
  ${toHTML(ask_instructions())}
  ${q.context ? `${br}<p>[CONTEXT]</p>\n${toHTML(q.context)}` : ''}
  ${q.question ? `${br}<p>[QUESTION]</p>\n${toHTML(q.question)}` : ''}
`.trim()

export {
	voidFn,
	lazy,
	queue,
	delay,
	toHTML,
	template,
}
