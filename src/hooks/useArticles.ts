import { useCallback, useEffect, useRef, useState } from 'react'

import { listArticles } from '../services/articlesService'
import type { Article } from '../types/article'

type UseArticlesState = {
  items: Article[]
  loading: boolean
  error: string | null
}

export function useArticles() {
  const [state, setState] = useState<UseArticlesState>({
    items: [],
    loading: true,
    error: null,
  })

  const seqRef = useRef(0)
  const cancelledRef = useRef(false)

  const reload = useCallback(() => {
    const runId = ++seqRef.current

    async function run() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        const result = await listArticles()
        if (cancelledRef.current) return
        if (runId !== seqRef.current) return
        setState((prev) => ({ ...prev, items: result.items, loading: false, error: null }))
      } catch (err) {
        if (cancelledRef.current) return
        if (runId !== seqRef.current) return
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        setState((prev) => ({ ...prev, items: [], loading: false, error: message }))
      }
    }

    void run()
  }, [])

  useEffect(() => {
    reload()

    return () => {
      cancelledRef.current = true
    }
  }, [reload])

  return { ...state, reload }
}

