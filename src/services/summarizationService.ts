import type { Article } from '../types/article'

export type SummarizeArticleParams = {
  article: Article
  maxLength?: number
  lang?: string
}

export type SummarizeArticleResult = {
  summary: string
  cached?: boolean
}

export type SummarizeArticleStreamParams = SummarizeArticleParams & {
  signal?: AbortSignal
  onDelta: (delta: string) => void
  onMeta?: () => void
  timeoutMs?: number
}

export async function summarizeArticle(
  params: SummarizeArticleParams,
): Promise<SummarizeArticleResult> {
  const { article, maxLength = 600, lang } = params

  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ article, maxLength, lang }),
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
  const { article, maxLength = 600, onDelta, onMeta, signal, timeoutMs = 90_000, lang } = params

  const res = await fetch('/api/summarize/stream', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({ article, maxLength, lang }),
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
    return await summarizeArticle({ article, maxLength, lang })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let finalSummary: string | null = null
  let cachedFromServer: boolean | undefined
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
      } else if (parsed.event === 'meta') {
        onMeta?.()
      } else if (parsed.event === 'done') {
        const payload = JSON.parse(parsed.data) as { summary?: string; cached?: boolean }
        finalSummary = payload.summary?.trim() || ''
        cachedFromServer = payload.cached
      } else if (parsed.event === 'error') {
        const payload = JSON.parse(parsed.data) as { message?: string }
        throw new Error(payload.message || 'Erreur lors du streaming')
      }
    }
  }

  return { summary: finalSummary ?? '', cached: cachedFromServer }
}

// ── V2 : Multi-call avec JSON structuré ──

export type SummarizeV2Result = {
  summaryMd: string
  insight: string
  lang: string
  cached?: boolean
}

export async function summarizeArticleV2(
  params: SummarizeArticleParams,
): Promise<SummarizeV2Result> {
  const { article, lang } = params

  const res = await fetch('/api/summarize/v2', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ article, lang }),
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

  const body = (await res.json()) as { summary_md?: string; insight?: string; lang?: string; cached?: boolean }
  if (!body.summary_md && !body.insight) {
    throw new Error('Réponse invalide du service de résumé v2')
  }
  return {
    summaryMd: body.summary_md ?? '',
    insight: body.insight ?? '',
    lang: body.lang ?? 'fr',
    cached: body.cached,
  }
}

// ── V2 Stream : synthèse streamée + insight final ──

export type SummarizeV2StreamParams = SummarizeArticleParams & {
  signal?: AbortSignal
  onDelta: (delta: string) => void
  onInsight: (insight: string) => void
  onMeta?: () => void
  timeoutMs?: number
}

export async function summarizeArticleV2Stream(
  params: SummarizeV2StreamParams,
): Promise<{ summaryMd: string; insight: string; cached?: boolean }> {
  const { article, onDelta, onInsight, onMeta, signal, timeoutMs = 90_000, lang } = params

  const res = await fetch('/api/summarize/v2/stream', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({ article, lang }),
    signal,
  })

  if (!res.ok) {
    let message = `Erreur réseau (${res.status})`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message?.trim() || message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  if (!res.body) {
    // Fallback non-stream
    return await summarizeArticleV2({ article, lang })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalSummaryMd = ''
  let finalInsight = ''
  let cachedFromServer: boolean | undefined
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
      } else if (parsed.event === 'meta') {
        const payload = JSON.parse(parsed.data) as { cached?: boolean }
        cachedFromServer = payload.cached
        onMeta?.()
      } else if (parsed.event === 'insight') {
        const payload = JSON.parse(parsed.data) as { insight?: string }
        finalInsight = payload.insight ?? ''
        onInsight(finalInsight)
      } else if (parsed.event === 'done') {
        const payload = JSON.parse(parsed.data) as { summary_md?: string }
        finalSummaryMd = payload.summary_md ?? ''
      } else if (parsed.event === 'error') {
        const payload = JSON.parse(parsed.data) as { message?: string }
        throw new Error(payload.message || 'Erreur lors du streaming')
      }
    }
  }

  return { summaryMd: finalSummaryMd, insight: finalInsight, cached: cachedFromServer }
}

