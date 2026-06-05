import type { Article } from '../../src/types/article'
import type { Categorie } from '../../src/types/article'
import { RSS_SOURCES } from '../config/sources'
import { TTLCache } from '../lib/cache'
import { HttpError, json } from '../lib/http'
import { fetchRssArticles } from '../lib/rss'
import { checkRateLimit } from '../lib/rateLimit'
import { upsertArticles, queryArticles, type ArticleFilters } from '../lib/db'

/** Cache 10 minutes pour éviter de spammer les flux RSS */
const rssFetchCache = new TTLCache<string, Article[]>(10 * 60_000)

function matchQuery(article: Article, q: string): boolean {
  const query = q.toLowerCase()
  return (
    article.titre.toLowerCase().includes(query) ||
    article.resume.toLowerCase().includes(query)
  )
}

function matchSource(article: Article, source: string): boolean {
  const label = (article.sourceLabel ?? '').toLowerCase()
  return label.includes(source.toLowerCase())
}

/** Tri stratifié : round-robin entre les sources pour une distribution équitable */
function stratifiedSort(articles: Article[], sort: 'recent' | 'ancien'): Article[] {
  // Grouper par source
  const bySource = new Map<string, Article[]>()
  for (const a of articles) {
    const key = a.sourceLabel ?? 'inconnu'
    if (!bySource.has(key)) bySource.set(key, [])
    bySource.get(key)!.push(a)
  }

  // Trier chaque groupe par date
  const dir = sort === 'recent' ? -1 : 1
  for (const group of bySource.values()) {
    group.sort((a, b) => {
      if (a.datePublication < b.datePublication) return -dir
      if (a.datePublication > b.datePublication) return dir
      return 0
    })
  }

  // Round-robin : piocher l'article i de chaque source, puis i+1, etc.
  const groups = [...bySource.values()]
  const result: Article[] = []
  let index = 0
  let added: boolean
  do {
    added = false
    for (const group of groups) {
      if (index < group.length) {
        result.push(group[index]!)
        added = true
      }
    }
    index++
  } while (added)

  return result
}

/** Déduplique par ID (garde la 1ère occurrence) + tri par date */
function dedupeAndSort(articles: Article[], sort: 'recent' | 'ancien'): Article[] {
  const seen = new Set<string>()
  const unique = articles.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })

  const dir = sort === 'recent' ? -1 : 1
  return unique.sort((a, b) => {
    if (a.datePublication < b.datePublication) return -dir
    if (a.datePublication > b.datePublication) return dir
    return 0
  })
}

// ── Exports pour les tests ────────────────────────────────────────
export const __test = { dedupeAndSort, matchQuery, matchSource, stratifiedSort }

export async function handleListArticles(req: Request): Promise<Response> {
  if (req.method !== 'GET') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Méthode non autorisée')

  const limitCheck = checkRateLimit(req, { keyPrefix: 'articles', windowMs: 60_000, max: 60 })
  if (!limitCheck.ok) {
    throw new HttpError(429, 'RATE_LIMITED', 'Trop de requêtes. Réessaie dans un instant.')
  }

  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 10)))
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
  const q = url.searchParams.get('q')?.trim() || undefined
  const source = url.searchParams.get('source')?.trim() || undefined
  const categorie = (url.searchParams.get('categorie')?.trim() || undefined) as Categorie | undefined
  const sort = (url.searchParams.get('sort') === 'ancien' ? 'ancien' : 'recent') as 'recent' | 'ancien'

  // ── Étape 1 : Fetch RSS → upsert en base ──────────────────────────
  const settled = await Promise.allSettled(
    RSS_SOURCES.map(async (src) => {
      const items = await rssFetchCache.getOrSet(`rss:${src.id}`, async () => fetchRssArticles(src))
      return { sourceId: src.id, sourceLabel: src.label, items }
    }),
  )

  const errors: Array<{ sourceId: string; message: string }> = []
  let newArticleCount = 0

  for (const r of settled) {
    if (r.status === 'fulfilled') {
      if (r.value.items.length > 0) {
        // Persister en base — l'upsert ignore les doublons, la rétention nettoie
        upsertArticles(r.value.items)
        newArticleCount += r.value.items.length
      }
      continue
    }

    const message = r.reason instanceof Error ? r.reason.message : 'Erreur inconnue'
    errors.push({ sourceId: 'unknown', message })
  }

  // ── Étape 2 : Requêter la base (source unique de vérité) ──────────
  // On récupère TOUS les articles (pas de limite) pour le tri stratifié
  const dbFilters: ArticleFilters = { sort }
  if (q) dbFilters.q = q
  if (source) dbFilters.source = source
  if (categorie) dbFilters.categorie = categorie

  const { items: dbItems, total: dbTotal } = queryArticles(dbFilters)
  // Note: queryArticles ne pagine pas côté DB — on pagine après le tri stratifié

  // Appliquer les filtres additionnels côté applicatif (sécurité)
  let merged = dbItems
  if (q) {
    merged = merged.filter((article) => matchQuery(article, q))
  }
  if (source) {
    merged = merged.filter((article) => matchSource(article, source))
  }
  if (categorie) {
    merged = merged.filter((article) => article.categorie === categorie)
  }

  // ── Étape 3 : Tri stratifié (round-robin) pour « Toutes les sources » ─
  if (!source) {
    merged = stratifiedSort(merged, sort)
  }

  const total = merged.length
  console.log(
    `[Articles API] DB: ${dbTotal} articles. Après filtres + stratifié: ${total}. ` +
    `Stratifié: ${!source}. Erreurs: ${errors.length}. Nouveaux articles RSS: ${newArticleCount}`,
  )

  // ── Page vide : filtre trop restrictif ─────────────────────────────
  if (total === 0) {
    return json({
      items: [],
      total: 0,
      page: 1,
      pageSize: limit,
      totalPages: 0,
      meta: { sourceCount: RSS_SOURCES.length, errors },
    })
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
