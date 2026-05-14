import type { Article } from '../../src/types/article'
import { TTLCache } from '../lib/cache'
import { HttpError, json } from '../lib/http'
import { globalAIService } from '../lib/aiService'
import { checkRateLimit } from '../lib/rateLimit'

type SummarizeBody = {
  article: Article
  maxLength?: number
}

const summaryCache = new TTLCache<string, string>(60 * 60_000)

function clip(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

function makePrompt(article: Article, maxLength: number): string {
  const host = (() => {
    try {
      return new URL(article.urlSource).hostname
    } catch {
      return ''
    }
  })()

  // Prompt volontairement court pour limiter les tokens et le coût.
  return [
    "Tu es un assistant de veille. Résume l'article ci-dessous en français.",
    `Contraintes: ${maxLength} caractères max, 3-5 phrases, ton neutre, sans intro type "Voici".`,
    'Si les infos sont insuffisantes, produis un résumé prudent basé sur le titre + extrait.',
    '',
    `Titre: ${article.titre}`,
    host ? `Source: ${host}` : `Source: ${article.urlSource}`,
    `Date: ${article.datePublication}`,
    '',
    `Extrait: ${clip(article.resume ?? '', 1400)}`,
  ].join('\n')
}

function cacheKey(article: Article, maxLength: number): string {
  return `${article.id}:${maxLength}:${article.urlSource}`
}

export async function handleSummarize(req: Request): Promise<Response> {
  if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée')

  const limit = checkRateLimit(req, { keyPrefix: 'summarize', windowMs: 5 * 60_000, max: 12 })
  if (!limit.ok) {
    throw new HttpError(429, 'RATE_LIMITED', `Trop de résumés demandés. Réessaie dans ${Math.ceil(limit.retryAfterMs / 1000)}s.`)
  }

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type doit être application/json')
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0')
  if (contentLength && contentLength > 40_000) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Payload trop volumineux')
  }

  const body = (await req.json()) as SummarizeBody
  if (!body?.article?.id || !body?.article?.urlSource) {
    throw new HttpError(400, 'BAD_REQUEST', 'Paramètre article manquant ou invalide')
  }

  const maxLength = Math.max(80, Math.min(800, Number(body.maxLength ?? 280)))
  const key = cacheKey(body.article, maxLength)

  const cached = summaryCache.get(key)
  if (cached) return json({ summary: cached, cached: true })

  const prompt = makePrompt(body.article, maxLength)

  const result = await globalAIService.generateContent(prompt)
  const text = result.response.text()?.replace(/\s+/g, ' ').trim() ?? ''
  const summary = clip(text || `Résumé indisponible. Source: ${body.article.urlSource}`, maxLength)

  summaryCache.set(key, summary)
  return json({ summary, cached: false })
}

export async function handleSummarizeStream(req: Request): Promise<Response> {
  if (req.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée')

  const limit = checkRateLimit(req, { keyPrefix: 'summarize_stream', windowMs: 5 * 60_000, max: 12 })
  if (!limit.ok) {
    throw new HttpError(429, 'RATE_LIMITED', `Trop de résumés demandés. Réessaie dans ${Math.ceil(limit.retryAfterMs / 1000)}s.`)
  }

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type doit être application/json')
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0')
  if (contentLength && contentLength > 40_000) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Payload trop volumineux')
  }

  const body = (await req.json()) as SummarizeBody
  if (!body?.article?.id || !body?.article?.urlSource) {
    throw new HttpError(400, 'BAD_REQUEST', 'Paramètre article manquant ou invalide')
  }

  const maxLength = Math.max(80, Math.min(800, Number(body.maxLength ?? 280)))
  const key = cacheKey(body.article, maxLength)

  const cached = summaryCache.get(key)
  if (cached) {
    return new Response(
      `event: done\ndata: ${JSON.stringify({ summary: cached, cached: true })}\n\n`,
      {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
        },
      },
    )
  }

  const { model } = await createGeminiClient()
  const prompt = makePrompt(body.article, maxLength)
  const encoder = new TextEncoder()

  let accumulated = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send('meta', { cached: false })

        const result = await globalAIService.generateContentStream(prompt)
        for await (const chunk of result.stream) {
          if (req.signal.aborted) break
          const text = chunk.text()
          if (!text) continue
          accumulated += text
          send('chunk', { delta: text })
        }

        const final = clip(accumulated, maxLength)
        if (final) summaryCache.set(key, final)
        send('done', { summary: final, cached: false })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        send('error', { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  })
}

