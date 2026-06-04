import type { Article } from '../types/article'

export type SummarizeArticleParams = {
  article: Article
  maxLength?: number
}

export type SummarizeArticleResult = {
  summary: string
}

export type SummarizeArticleStreamParams = SummarizeArticleParams & {
  signal?: AbortSignal
  onDelta: (delta: string) => void
  timeoutMs?: number
}

export async function summarizeArticle(
  params: SummarizeArticleParams,
): Promise<SummarizeArticleResult> {
  const { article, maxLength = 280 } = params

  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ article, maxLength }),
  })

  if (!res.ok) {
    let message = `Erreur réseau (${res.status})`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message?.trim() || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  const body = (await res.json()) as { summary?: string }
  const summary = body.summary?.trim()
  if (!summary) throw new Error('Réponse invalide du service de résumé')
  return { summary }
}

export async function summarizeArticleStream(
  params: SummarizeArticleStreamParams,
): Promise<SummarizeArticleResult> {
  const { article, maxLength = 280, onDelta, signal, timeoutMs = 90_000 } = params

  const res = await fetch('/api/summarize/stream', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({ article, maxLength }),
    signal,
  })

  if (!res.ok) {
    let message = `Erreur réseau (${res.status})`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message?.trim() || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (!res.body) {
    // Fallback si l’environnement ne supporte pas les streams.
    return await summarizeArticle({ article, maxLength })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let finalSummary: string | null = null
  let lastChunkTime = Date.now()

  const parseEvent = (raw: string): { event: string; data: string } | null => {
    const lines = raw.split('\n')
    let event = 'message'
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    if (!data) return null
    return { event, data }
  }

  while (true) {
    // Timeout de lecture : si aucun chunk depuis trop longtemps, on abandonne
    if (Date.now() - lastChunkTime > timeoutMs) {
      reader.cancel()
      throw new Error('Le résumé prend trop de temps. Réessaie dans quelques instants.')
    }

    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const parsed = parseEvent(raw)
      if (!parsed) continue

      if (parsed.event === 'chunk') {
        const payload = JSON.parse(parsed.data) as { delta?: string }
        if (payload.delta) {
          lastChunkTime = Date.now()
          onDelta(payload.delta)
        }
      } else if (parsed.event === 'done') {
        const payload = JSON.parse(parsed.data) as { summary?: string }
        finalSummary = payload.summary?.trim() || ''
      } else if (parsed.event === 'error') {
        const payload = JSON.parse(parsed.data) as { message?: string }
        throw new Error(payload.message || 'Erreur lors du streaming')
      }
    }
  }

  return { summary: finalSummary ?? '' }
}

