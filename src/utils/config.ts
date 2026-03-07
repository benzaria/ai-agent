import { hotImport, queue } from './helpers.ts'
import { writeFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { cwd } from 'node:process'
import { join } from 'node:path'
import { echo } from './tui.ts'

const secretsPathAlt = join(import.meta.dirname, '/secrets_alt.json')
const secretsPath = join(__agentdir, '/secrets.json')
const secrets = await loadSecrets(global.isReloading)

function loadSecrets(_force: boolean = false): Promise<Secrets> {
	try {
		return hotImport(secretsPath)
	} catch {
		echo.wrn(`
			\rSecrets are not setup at: "${secretsPath}"
      \rLoading default template: "${secretsPathAlt}"
    `.replaceAll('\\', '/'))

		return hotImport(secretsPathAlt)
	}
}

const saveSecrets = queue(
	async function (obj: Partial<Secrets> & Record<string, any>) {
		await writeFile(
			secretsPath,
			JSON.stringify(
				Object.assign(
					secrets,
					obj
				),
				null, 2
			)
		).catch(echo.err)

		return secrets
	}
)

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
	...secrets
} as const satisfies Config['env']

export {
	loadSecrets,
	saveSecrets,
	providers,
	env,
}
