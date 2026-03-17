import { hotImport, queue } from './helpers.ts'
import { writeFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { Color, echo } from './tui.ts'
import { cwd } from 'node:process'
import { Obj } from './object.ts'
import { join } from 'node:path'

const secretsPathAlt = join(import.meta.dirname, '/secrets_alt.json')
const secretsPath = join(__agentdir, '/secrets.json')

async function loadSecrets(force: boolean = false) {
	if (global.secrets && !force) return global.secrets
	let secrets: Secrets

	try {
		secrets = await hotImport(secretsPath)
	} catch {
		echo.wrn(`
			\rSecrets are not setup at: "${secretsPath}"
      \rLoading default template: "${secretsPathAlt}"
    `.replaceAll('\\', '/'))

		secrets = await hotImport(secretsPathAlt)
			.catch(echo.err)
	}

	echo.vrb([Color[256][33], 'secrets'], secrets)
	global.secrets = new Obj(secrets, 'Secrets')

	return global.secrets
}

const saveSecrets = queue(
	async function (obj?: Partial<Secrets> & AnyRecord) {
		if (obj)
			secrets.set(obj)

		await writeFile(
			secretsPath,
			secrets.json(2)
		).catch(echo.err)

		return secrets
	}
)

event.on('Secrets-set', saveSecrets)
event.on('Secrets-map', saveSecrets)
event.on('Secrets-delete', saveSecrets)
event.on('Secrets-filter', saveSecrets)

await loadSecrets(global.isReloading)

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
	...secrets.store as Secrets
} as const satisfies Config['env']

export {
	loadSecrets,
	saveSecrets,
	providers,
	env,
}
