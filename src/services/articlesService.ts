import type { Article } from '../types/article'

export type ListArticlesResult = {
  items: Article[]
  meta?: {
    sourceCount?: number
    errors?: Array<{ sourceId: string; message: string }>
  }
}

export async function listArticles(): Promise<ListArticlesResult> {
  const res = await fetch('/api/articles?limit=80', {
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

  return (await res.json()) as ListArticlesResult
}

