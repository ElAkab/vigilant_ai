import type { ArticleQueryParams, PaginatedArticles } from '../types/article'

export async function listArticles(
  params: ArticleQueryParams = {},
): Promise<PaginatedArticles> {
  const url = new URL('/api/articles', window.location.origin)
  const { limit = 10, offset = 0, q, source, categorie, sort } = params

  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))
  if (q) url.searchParams.set('q', q)
  if (source) url.searchParams.set('source', source)
  if (categorie) url.searchParams.set('categorie', categorie)
  if (sort) url.searchParams.set('sort', sort)

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
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

  return (await res.json()) as PaginatedArticles
}
