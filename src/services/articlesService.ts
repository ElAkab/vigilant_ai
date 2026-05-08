import type { Article } from '../types/article'
import { mockArticles } from '../data/mockArticles'

export type ListArticlesResult = {
  items: Article[]
}

export async function listArticles(): Promise<ListArticlesResult> {
  return { items: [...mockArticles] }
}

