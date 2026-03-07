import {
	makeWASocket,
	DisconnectReason,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	makeCacheableSignalKeyStore,
} from 'baileys'

import {
	rm,
	mkdir,
	copyFile,
	readFile,
} from 'node:fs/promises'

import { delay, queue, lazy, voidFn } from '../../utils/helpers.ts'
import { echo, Color } from '../../utils/tui.ts'
import { env } from '../../utils/config.ts'
import { EventEmitter } from 'node:events'
import { join } from 'node:path'

type CreateSocketOpts = {
  authDir?: string
  printQr?: boolean
  onQr?: (qr: string) => void
  logger?: 'none' | 'silent' | 'info' | 'debug'
}

type WS = ReturnType<typeof makeWASocket> & { send: WS['sendMessage'] }
type ReconnectFn = (opts: CreateSocketOpts) => Promise<WS>

const getQR = lazy(async () => (await import('qrcode-terminal')).default)
const getPino = lazy(async () => (await import('pino')).default)

const qsaveCreds = queue(
	async (saveCreds: AsyncFn) => {
		echo.vrb([Color.BLUE, 'Creds'], 'Save')
		await saveCreds()
	}
)

async function backupCreds(authDir: string) {
	echo.vrb.lr([Color.BLUE, 'Creds'], 'Backup')

	const creds = join(authDir, 'creds.json')
	const backup = join(authDir, 'creds.backup.json')

	try {
		// check valid JSON
		JSON.parse(await readFile(creds, 'utf-8'))
		await copyFile(creds, backup)
	} catch {}
}

async function restoreCreds(authDir: string) {
	const creds = join(authDir, 'creds.json')
	const backup = join(authDir, 'creds.backup.json')

	try {
		// check valid JSON
		JSON.parse(await readFile(creds, 'utf-8'))
	} catch {
		await copyFile(backup, creds)
			.then(() => echo.vrb([Color.YELLOW, 'Creds'], 'Restore'))
			.catch(echo.err)
	}
}

async function createWASocket(
	opts: CreateSocketOpts = {},
	reconnectFn?: ReconnectFn
) {
	const authDir = opts.authDir ?? env.ws_auth
	await mkdir(authDir, { recursive: true })

	const logger = opts.logger === 'none'
		? {
			level: 'silent',
			child: function (this) { return this },
			trace: voidFn, debug: voidFn, info: voidFn,
			warn: voidFn, error: voidFn, fatal: voidFn,
		}
		: (await getPino())({ level: opts.logger ?? 'info' })

	await restoreCreds(authDir)
	const { state, saveCreds } = await useMultiFileAuthState(authDir)
	const { version } = await fetchLatestBaileysVersion()

	echo.inf.lr('Initializing WASocket...')
	const sock = makeWASocket({
		logger,
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger)
		},
		version,
		browser: [env.agent_name, 'chrome', '1.0.0']
	}) as WS

	// Alias for `sendMessage`
	;(sock as WS).send = function (...args: Parameters<WS['sendMessage']>) {
		return sock.sendMessage(...args)
			.finally(() => global.typing = 0)
	}

	// WS error safety
	sock.ws.on('error', (err: Error) => {
		echo.err('WASocket error:', err.message)
	})

	// Save creds safely
	sock.ev.on('creds.update', async () => {
		await backupCreds(authDir)
		qsaveCreds(saveCreds)
	})

	// Connection updates
	sock.ev.on('connection.update', async update => {
		const { connection, lastDisconnect, qr } = update

		// QR handling
		if (qr) {
			opts.onQr?.(qr)

			if (opts.printQr) {
				const QRCode = await getQR()

				echo.inf('\nScan this QR:\n')
				QRCode.generate(qr, { small: true })
			}
		}

		if (connection === 'open') {
			connectEvent.emit('open', sock)
			echo.scs('WASocket ready.')
		}

		if (connection === 'close') {
			const error = lastDisconnect?.error ?? new Error('unknown')
			const status = (lastDisconnect?.error as any)?.output?.statusCode
			const shouldReconnect = status !== DisconnectReason.loggedOut

			connectEvent.emit('close', error)
			echo.err('Connection closed:', status, error)

			if (shouldReconnect) {
				echo.inf.lr('Reconnecting...')

				try {
					sock.ev.removeAllListeners('messages.upsert')
					sock.ws.removeAllListeners()
					sock.ws.close()
				} catch {}

				delay('1'.s, () => (reconnectFn ?? createWASocket)(opts))
			}
			else {
				echo.wrn('Logged out. Deleting auth folder.')
				await rm(authDir, { recursive: true, force: true })
			}
		}
	})

	return sock
}

const connectEvent = new EventEmitter<{
	'open': [ws: WS],
	'close': [err: Error]
}>({
	captureRejections: true
})

function conectionHandler() {
	const listeners: SyncFn<[], void, WS>[] = []

	function connection(listener: ValueOf<typeof listeners>) {
		listeners.push(listener)
	}

	connection.run = function (ws: WS) {
		listeners.forEach(listener => listener.apply(ws))
	}

	connectEvent.on('open', connection.run)
	connectEvent.on('close', voidFn)

	return connection
}

const connection = conectionHandler()

export {
	createWASocket,
	restoreCreds,
	backupCreds,
	qsaveCreds,
	connection,
}

export type {
	WS,
	CreateSocketOpts,
}
