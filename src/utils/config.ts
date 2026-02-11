import secrets from './!secrets.json' with {type: 'json'}

type Config = {
  providers: {
    [x: string]: {
      api: string
      models: string[]
      selector: Record<string, string>
    }
  }

  env: {
    owner_name: string
    bot_name: string
    port: number
    timeout: number
    model: Models
    userAgent: string
    userData: string
    wsAuth: string
  } & typeof secrets

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
      responseBlock: 'code',
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
  port: 3000,
  timeout: 90000,
  model: 'openai/gpt-5-mini',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  userData: '__user_data',
  wsAuth: '__ws_auth',
  ...secrets
} as const satisfies Config['env']

const ask_instructions = () => `
  [INSTRUCTIONS]
    you are ${env.bot_name}, you are been used as an AI Agent made by ${env.owner_name}
      - do not use imgs in the responses unless asked to
      - do not use markdown only plain text unless asked to
`

export {
  ask_instructions,
  providers,
  env,
}
