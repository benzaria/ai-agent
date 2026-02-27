import { writeFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { importJson } from './helpers.ts'
import { cwd } from 'node:process'
import { join, resolve } from 'node:path'
import { echo } from './tui.ts'
import '@benzn/to-ms/extender'

declare global {
	const __rootdir: string
	const __agentdir: string
}

// @ts-expect-error Property '__rootdir' does not exist on type 'typeof globalThis'.
global.__rootdir = resolve(import.meta?.dirname ?? __dirname,'../..')
// @ts-expect-error Property '__agentdir' does not exist on type 'typeof globalThis'.
global.__agentdir = resolve(__rootdir, 'agent-files')

type Secrets = typeof import('./secrets_alt.json')

const secretsPath = join(__agentdir, 'secrets.json')
const secretsPathAlt = join(import.meta.dirname, 'secrets_alt.json')

function loadSecrets(): Promise<Secrets> {
	try {
		return importJson(secretsPath)
	} catch {
		echo.wrn(`
			\rSecrets are not setup at: "${secretsPath}"
      \rLoading default template: "${secretsPathAlt}"
    `.replaceAll('\\', '/'))

		return importJson(secretsPathAlt)
	}
}

const secrets = await loadSecrets()

type Config = {
  providers: {
    [x: string]: {
      api: `${string}/`
      models: string[]
      selector: Record<string, string>
    }
  }

  env: {
    os: NodeJS.Platform
    home: string
    cwd: string
    port: number
    timeout: number
    model: Models
		persona: Personas
    userAgent: string
  } & Secrets

  ask_instructions: () => string
}

const providers = {
	openai: {
		api: 'https://chatgpt.com/',
		models: [
			'gpt-5-mini',
			'gpt-5.2-instant',
			'gpt-5.2-thinking',
		],
		selector: {
			request: '#prompt-textarea',
			sendBtn: '#composer-submit-button',
			stopBtn: '#composer-submit-button[disabled]',
			response: '[data-message-author-role="assistant"]',
			responseBlock: '#code-block-viewer',
		}
	},
	google: {
		api: 'https://gemini.google.com/',
		models: [
			'gemini-2.5-flash',
			'gemini-2.5-flash-lite',
			'gemini-3-pro-preview',
		],
		selector: {
			request: '[role="textbox"]',
			sendBtn: '[aria-label="Send message"]',
			stopBtn: '[aria-label="Send message"][aria-disabled="true"]',
			response: '',
			responseBlock: 'code',
		}
	},
} as const satisfies Config['providers']

const env = {
	os: platform(),
	home: homedir(),
	cwd: cwd(),
	port: 3000,
	timeout: '1.5'.m,
	model: 'openai/gpt-5-mini',
	persona: 'jarvis',
	userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	...secrets
} as const satisfies Config['env']

const saveSecrets = (obj: Partial<Secrets> & Record<string, any>) => writeFile(
	secretsPath,
	JSON.stringify(
		Object.assign(
			secrets,
			obj
		),
		null, 2
	)
).catch(echo.err)

export {
	saveSecrets,
	providers,
	env,
}
