
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
  owner_name: 'Benzaria Achraf (Benz)',
  bot_name: 'benz.bot',
  port: 3000,
  timeout: 90000,
  model: 'openai/gpt-5-mini',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  userData: '__user_data',
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
