import { useCallback, useEffect, useRef, useState } from 'react'

import { listArticles } from '../services/articlesService'
import type { Article, ArticleQueryParams, PaginatedArticles } from '../types/article'

interface UseArticlesState {
  items: Article[]
  total: number
  loading: boolean
  error: string | null
}

export function useArticles() {
  const [state, setState] = useState<UseArticlesState>({
    items: [],
    total: 0,
    loading: true,
    error: null,
  })

  const seqRef = useRef(0)
  const cancelledRef = useRef(false)
  // Garder les derniers params pour que la pagination les préserve
  const lastParamsRef = useRef<ArticleQueryParams>({})

  const reload = useCallback(
    async (params: ArticleQueryParams = {}) => {
      const runId = ++seqRef.current
      // Merge safe : ne pas écraser les params existants avec undefined
      // Pagination → passe juste {limit, offset} → hérite q/source/categorie/sort
      const merged = { ...lastParamsRef.current }
      if (params.limit !== undefined) merged.limit = params.limit
      if (params.offset !== undefined) merged.offset = params.offset
      if (params.q !== undefined) merged.q = params.q
      if (params.source !== undefined) merged.source = params.source
      if (params.categorie !== undefined) merged.categorie = params.categorie
      if (params.sort !== undefined) merged.sort = params.sort
      lastParamsRef.current = merged

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        const result: PaginatedArticles = await listArticles(merged)
        if (cancelledRef.current) return
        if (runId !== seqRef.current) return
        setState({
          items: result.items,
          total: result.total,
          loading: false,
          error: null,
        })
      } catch (err) {
        if (cancelledRef.current) return
        if (runId !== seqRef.current) return
        const message =
          err instanceof Error ? err.message : 'Erreur inconnue'
        setState((prev) => ({
          ...prev,
          items: [],
          loading: false,
          error: message,
        }))
      }
    },
    [],
  )

  useEffect(() => {
    cancelledRef.current = false

    void (async () => {
      await reload({ limit: 10, offset: 0 })
    })()

    return () => {
      cancelledRef.current = true
    }
  }, [reload])

  return { ...state, reload }
}
