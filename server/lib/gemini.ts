import { HttpError } from './http'

export type GeminiClient = {
  model: {
    generateContent: (prompt: string) => Promise<{ response: { text: () => string | undefined } }> 
    generateContentStream: (prompt: string) => Promise<{ stream: AsyncIterable<{ text: () => string | undefined }> }>
  }
}

function getEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined
}

export function createGeminiClient(): GeminiClient {
  const apiKey = getEnv('OPENROUTER_API_KEY')
  if (!apiKey) {
    throw new HttpError(500, 'CONFIG_MISSING', 'OPENROUTER_API_KEY manquant (configure-le côté serveur)')
  }

  // Allow overriding model via OPENROUTER_MODEL, fallback to GEMINI_MODEL for backwards compat
  const modelName = (getEnv('OPENROUTER_MODEL') || getEnv('GEMINI_MODEL') || 'gpt-4o-mini')

  const baseUrl = 'https://api.openrouter.ai/v1'

  async function generateContent(prompt: string) {
    const body = {
      model: modelName,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      top_p: 0.95,
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new HttpError(502, 'AI_SERVICE_ERROR', `OpenRouter erreur: ${res.status} ${text}`)
    }

    const data = await res.json().catch(() => ({})) as any
    const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? ''

    return { response: { text: () => (typeof content === 'string' ? content : '') } }
  }

  async function generateContentStream(prompt: string) {
    // For simplicity (and broad compatibility), perform a non-streaming call
    // and expose an async iterable that yields the final text as a single chunk.
    const final = await generateContent(prompt)

    async function* gen() {
      yield { text: () => final.response.text() }
    }

    return { stream: gen() }
  }

  return { model: { generateContent, generateContentStream } }
}

