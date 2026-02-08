import { initPage, initModel, chat } from './bot.ts'
import { writeFile } from 'node:fs/promises'
import { echo } from './helpers.ts'
import { env } from './config.ts'

//@ts-ignore
import bodyParser from 'body-parser'
import express from 'express'

import openclaw_init from '../../config/openclaw-init.json' with { type: 'json' }
import chatgpt_init from '../../config/chatgpt-init.json' with { type: 'json' }

const app = express()
const PORT = args.port || env.port

app.use(bodyParser.json())

// --- ENDPOINT: List Models (Important for UI compatibility) ---
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: 'benz-bot',
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'library'
      }
    ]
  })
})

// --- ENDPOINT: Chat Completions (The 'Brain' endpoint) ---
app.post('/v1/chat/completions', async (req, res) => {
  writeFile('./!openclaw-raw.json', JSON.stringify(req.body), 'utf-8')
  const { messages, model, stream, tools } = req.body as {
    messages: {
      role: string
      content: string | {
        type: string
        text: string
        tool_calls?: object[]
      }[]
    }[]
  } & Record<any, any>

  // 1. Extract the last user message
  const lastMessages = messages
      // .filter(m => m.role === 'user')
      .slice(messages.length - 10)

  const prompt = {
    messages: [
      lastMessages
    ],
    // tools
  }

  echo(`[Request] -> ${lastMessages.pop()}`)
  // echo.inf(prompt)

  try {
    // 2. Call your Puppeteer-based 'chat' function
    const aiResponse = await chat(prompt)

    // 3. Handle Streaming (OpenClaw often requests streams)
    // If stream is true, we send a single chunk then [DONE] to satisfy the client
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const chunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model || 'benz-bot',
        choices: [{
          index: 0,
          delta: { content: aiResponse },
          finish_reason: null
        }]
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    // 4. Standard Response (Non-streaming)
    const responseBody = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model || 'benz-bot',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: aiResponse
          },
          finish_reason: 'stop'
        }
      ],
      /* usage: {
        prompt_tokens: message.length / 4,
        completion_tokens: aiResponse!.length / 4,
        total_tokens: (message.length + aiResponse!.length) / 4
      } */
    }

    res.json(responseBody)
  } catch (error) {
    echo.err('API Error:', error)
    res.status(500).json({ error: { message: 'Internal Server Error' } })
  }
})

async function startAPI() {
  try {
    await initPage({
      headless: args.headless,
      temp: args.temp,
    })

    await initModel(openclaw_init)

    app.listen(PORT, () => {
      echo(`✅ OpenAI-compatible API running at http://localhost:${PORT}/v1`)
    })
  } catch (err) {
    echo.err("Initialization failed:", err)
    shutdown()
  }
}

startAPI()
