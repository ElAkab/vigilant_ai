import { useCallback, useRef, useState } from 'react'

import { summarizeArticle, summarizeArticleStream } from '../services/summarizationService'
import type { Article } from '../types/article'

type UseArticleSummaryState = {
  summary: string | null
  loading: boolean
  error: string | null
}

type GenerateSummaryParams = {
  article: Article
  maxLength?: number
}

export function useArticleSummary() {
  const [state, setState] = useState<UseArticleSummaryState>({
    summary: null,
    loading: false,
    error: null,
  })

  const requestSeq = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    requestSeq.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setState({ summary: null, loading: false, error: null })
  }, [])

  const generateSummary = useCallback(async (params: GenerateSummaryParams) => {
    console.log("DEBUG: generateSummary hook appelé pour l'article:", params.article.id);
    const requestId = ++requestSeq.current
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      setState((prev) => ({ ...prev, summary: '' }))

      const chunks: string[] = []
      const result = await summarizeArticleStream({
        ...params,
        signal: abort.signal,
        onDelta(delta) {
          if (requestId !== requestSeq.current) return
          chunks.push(delta)
          setState((prev) => ({ ...prev, summary: (prev.summary ?? '') + delta }))
        },
      }).catch(async (err) => {
        // Fallback non-stream si le endpoint/streaming n’est pas dispo.
        if (abort.signal.aborted) throw err
        const nonStream = await summarizeArticle(params)
        return nonStream
      })

      if (requestId !== requestSeq.current) return
      setState({ summary: result.summary, loading: false, error: null })
    } catch (err) {
      if (requestId !== requestSeq.current) return
      if (err instanceof Error && err.name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setState((prev) => ({ ...prev, loading: false, error: message }))
    }
  }, [])

  return {
    ...state,
    generateSummary,
    reset,
  }
}

