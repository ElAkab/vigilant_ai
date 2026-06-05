import { useCallback, useEffect, useRef, useState } from 'react'

import { listArticles } from '../services/articlesService'
import type { Article, ArticleQueryParams, PaginatedArticles } from '../types/article'

interface UseArticlesState {
  items: Article[]
  total: number
  loading: boolean
  error: string | null
}

interface ReloadOptions {
  /** Si true, ne réinitialise pas la baseline (utilisé pour le polling) */
  silent?: boolean
}

export function useArticles() {
  const [state, setState] = useState<UseArticlesState>({
    items: [],
    total: 0,
    loading: true,
    error: null,
  })

  // ── Gestion de la concurrence ────────────────────────────────────
  const seqRef = useRef(0)
  const cancelledRef = useRef(false)
  const lastParamsRef = useRef<ArticleQueryParams>({})

  // ── Compteur d'articles non vus ──────────────────────────────────
  const baselineTotalRef = useRef(0)
  const [newArticleCount, setNewArticleCount] = useState(0)

  const reload = useCallback(
    async (params: ArticleQueryParams = {}, opts: ReloadOptions = {}) => {
      const runId = ++seqRef.current
      // Merge safe : ne pas écraser les params existants avec undefined
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

        // Calculer les nouveaux articles (polling uniquement)
        if (opts.silent) {
          const diff = result.total - baselineTotalRef.current
          setNewArticleCount(Math.max(0, diff))
        } else {
          // Action utilisateur → reset baseline
          baselineTotalRef.current = result.total
          setNewArticleCount(0)
        }

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

  // Reset manuel : l'utilisateur a pris connaissance des nouveaux articles
  const resetNewCount = useCallback(() => {
    baselineTotalRef.current = state.total
    setNewArticleCount(0)
  }, [state.total])

  useEffect(() => {
    cancelledRef.current = false

    void (async () => {
      await reload({ limit: 10, offset: 0 })
    })()

    return () => {
      cancelledRef.current = true
    }
  }, [reload])

  return { ...state, reload, newArticleCount, resetNewCount }
}
