import type { AIModel } from '../lib/models'
import { DEFAULT_MODELS } from '../lib/models'

function getEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined
}

export function loadModelConfig(): AIModel[] {
  const configuredModel = getEnv('OPENROUTER_MODEL') || getEnv('GEMINI_MODEL')

  if (configuredModel) {
    // If explicitly configured, put it first in the list
    const customModel: AIModel = {
      id: configuredModel,
      name: configuredModel,
      provider: 'openrouter',
      endpoint: getEnv('OPENROUTER_URL') || 'https://api.openrouter.ai/v1/chat/completions',
      maxTokens: 2000,
      temperature: 0.3,
    }
    return [customModel, ...DEFAULT_MODELS]
  }

  return DEFAULT_MODELS
}
