import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from 'baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'

import {
  mkdirSync,
  existsSync,
  copyFileSync,
  readFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { env } from '../../utils/config.ts'
import { echo } from '../../utils/helpers.ts'

type CreateSocketOpts = {
  authDir?: string
  printQr?: boolean
  onQr?: (qr: string) => void
  logger?: 'silent' | 'info' | 'debug'
}

let saveQueue: Promise<void> = Promise.resolve()

function enqueueSave(saveCreds: () => Promise<void> | void) {
  saveQueue = saveQueue
    .then(() => Promise.resolve(saveCreds()))
    .catch(() => { })
}

function backupCreds(authDir: string) {
  try {
    const credsPath = join(authDir, 'creds.json')
    const backupPath = join(authDir, 'creds.backup.json')

    if (!existsSync(credsPath)) return

    const raw = readFileSync(credsPath, 'utf-8')

    // only backup valid JSON
    JSON.parse(raw)

    copyFileSync(credsPath, backupPath)
  } catch {
    // ignore backup errors
  }
}

async function createWASocket(opts: CreateSocketOpts = {}) {
  const authDir = opts.authDir ?? env.wsAuth

  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true })
  }

  const logger = pino({ level: opts.logger ?? 'info' })

  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  //   const { version } = await fetchLatestBaileysVersion()

  echo.inf.lr('Initializing WASocket...')
  const sock = makeWASocket({
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    // version,
    browser: ['benz-bot', 'chrome', '1.0.0']
  })

  // 🔐 Save creds safely
  sock.ev.on('creds.update', () => {
    backupCreds(authDir)
    enqueueSave(saveCreds)
  })

  // 🔌 Connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    // QR handling
    if (qr) {
      opts.onQr?.(qr)

      if (opts.printQr) {
        echo.inf('\n📱 Scan this QR:\n')
        qrcode.generate(qr, { small: true })
      }
    }

    if (connection === 'open') {
      echo.scs('WASocket ready.')
    }

    if (connection === 'close') {
      const status =
        (lastDisconnect?.error as any)?.output?.statusCode

      const shouldReconnect =
        status !== DisconnectReason.loggedOut

      echo.err('Connection closed:', status)

      if (shouldReconnect) {
        echo.inf.lr('Reconnecting...')
        createWASocket(opts)
      } else {
        echo.wrn('🚪 Logged out. Delete auth folder.')
      }
    }
  })

  // 🌐 WS error safety
  sock.ws?.on?.('error', (err: Error) => {
    echo.err('WebSocket error:', err.message)
  })

  return sock
}

type WS = Awaited<ReturnType<typeof createWASocket>>

export {
  createWASocket,
  enqueueSave,
  backupCreds,
}

export type {
  WS,
  CreateSocketOpts,
}
