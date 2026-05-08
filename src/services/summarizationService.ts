import type { Article } from '../types/article'

export type SummarizeArticleParams = {
  article: Article
  maxLength?: number
}

export type SummarizeArticleResult = {
  summary: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function summarizeArticle(
  params: SummarizeArticleParams,
): Promise<SummarizeArticleResult> {
  const { article, maxLength = 280 } = params

  // Mock: petite latence pour simuler un appel réseau/modèle.
  await sleep(450)

  const base =
    article.resume?.trim() ||
    `Résumé indisponible. Source: ${new URL(article.urlSource).hostname}.`

  const normalized = base.replace(/\s+/g, ' ').trim()
  const clipped =
    normalized.length > maxLength
      ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
      : normalized

  return {
    summary: `Résumé (mock) — ${clipped}`,
  }
}

