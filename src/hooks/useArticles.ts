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
      // Merge avec les params précédents (pagination préserve q, source, etc.)
      const merged = { ...lastParamsRef.current, ...params }
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
