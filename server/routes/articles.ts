import type { Article } from '../../src/types/article'
import { RSS_SOURCES } from '../config/sources'
import { TTLCache } from '../lib/cache'
import { HttpError, json } from '../lib/http'
import { fetchRssArticles } from '../lib/rss'
import { checkRateLimit } from '../lib/rateLimit'

const perSourceCache = new TTLCache<string, Article[]>(10 * 60_000)

function dedupeAndSort(items: Article[]): Article[] {
  const map = new Map<string, Article>()
  for (const item of items) {
    // Clé = id (hash SHA1 unique) — urlSource peut écraser des articles légitimes
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  }

  const deduped = [...map.values()]
  deduped.sort((a, b) => (a.datePublication < b.datePublication ? 1 : a.datePublication > b.datePublication ? -1 : 0))
  return deduped
}

export async function handleListArticles(req: Request): Promise<Response> {
  if (req.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée')

  const limitCheck = checkRateLimit(req, { keyPrefix: 'articles', windowMs: 60_000, max: 60 })
  if (!limitCheck.ok) {
    throw new HttpError(429, 'RATE_LIMITED', 'Trop de requêtes. Réessaie dans un instant.')
  }

  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 10)))
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))

  const settled = await Promise.allSettled(
    RSS_SOURCES.map(async (source) => {
      const items = await perSourceCache.getOrSet(`rss:${source.id}`, async () => fetchRssArticles(source))
      return { sourceId: source.id, sourceLabel: source.label, items }
    }),
  )

  const errors: Array<{ sourceId: string; message: string }> = []
  const results: Article[][] = []

  for (const r of settled) {
    if (r.status === 'fulfilled') {
      results.push(r.value.items)
      continue
    }

    const message = r.reason instanceof Error ? r.reason.message : 'Erreur inconnue'
    errors.push({ sourceId: 'unknown', message })
  }

  const merged = dedupeAndSort(results.flat())
  const total = merged.length
  console.log(`[Articles API] Fusionné ${total} articles. Erreurs de sources:`, errors);

  if (total === 0) {
    throw new HttpError(502, 'RSS_UNAVAILABLE', errors[0]?.message ?? 'Aucune source RSS disponible')
  }

  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  return json({
    items: merged.slice(offset, offset + limit),
    total,
    page,
    pageSize: limit,
    totalPages,
    meta: { sourceCount: RSS_SOURCES.length, errors },
  })
}

