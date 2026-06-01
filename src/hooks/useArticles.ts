import { useCallback, useEffect, useRef, useState } from 'react'

import { listArticles } from '../services/articlesService'
import type { Article, PaginatedArticles } from '../types/article'

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

  const reload = useCallback(
    async (params?: { limit?: number; offset?: number }) => {
      const runId = ++seqRef.current

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        const result: PaginatedArticles = await listArticles(params)
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
    reload({ limit: 10, offset: 0 })

    return () => {
      cancelledRef.current = true
    }
  }, [reload])

  return { ...state, reload }
}
