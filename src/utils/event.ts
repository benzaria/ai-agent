import type { WS } from '../channels/whatsapp/wa-socket.ts'
import { EventEmitter } from 'node:events'

declare global {
	const event: _Event

	interface _Events {
		'newListener': [
			eventName: string | symbol,
			listener: SyncFn<AnyArray>
		],
		'removeListener': _Events['newListener'],
		'WS-open': [ws: WS],
		'WS-close': [err: Error],
		'Actions-reload': [],
		'Agent-ready': [],
		'Agent-shutdown': [],
	}
}

type _Event = EventEmitter<_Events>

type _EventNames = keyof _Events | 'newListener' | 'removeListener'

type __Event = {
	[K in 'on' | 'off' | 'once']:
		<T extends _EventNames>(
			eventName: T,
			listener: SyncFn<_Events[T]>
		) => void
} & {
	emit:
		<T extends _EventNames>(
			eventName: T,
			...args: _Events[T]
		) => void
}

const _event = new EventEmitter<_Events>({ captureRejections: true })

// @ts-expect-error Property 'event' does not exist on type 'typeof globalThis'.
global.event = _event

export type {
	_Event,
	_EventNames,
}
