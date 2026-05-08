import { useEffect, useState } from 'react'

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

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }))
        const result = await listArticles()
        if (cancelled) return
        setState({ items: result.items, loading: false, error: null })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        setState({ items: [], loading: false, error: message })
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

