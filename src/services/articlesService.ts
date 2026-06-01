import type { PaginatedArticles } from '../types/article'

export interface ListArticlesParams {
  limit?: number   // défaut 10
  offset?: number  // défaut 0
}

export async function listArticles(
  params: ListArticlesParams = {},
): Promise<PaginatedArticles> {
  const { limit = 10, offset = 0 } = params
  const url = `/api/articles?limit=${limit}&offset=${offset}`

  const res = await fetch(url, {
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
