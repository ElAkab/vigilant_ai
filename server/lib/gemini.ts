import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'

import { HttpError } from './http'

export type GeminiClient = {
  model: GenerativeModel
}

export function createGeminiClient(): GeminiClient {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new HttpError(500, 'CONFIG_MISSING', 'GEMINI_API_KEY manquant (configure-le côté serveur)')
  }

  const modelName = (process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash').toLowerCase()

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      topP: 0.95,
    },
  })

  return { model }
}

