import { useCallback, useRef, useState } from 'react'

import { summarizeArticle } from '../services/summarizationService'
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

  const reset = useCallback(() => {
    requestSeq.current += 1
    setState({ summary: null, loading: false, error: null })
  }, [])

  const generateSummary = useCallback(async (params: GenerateSummaryParams) => {
    const requestId = ++requestSeq.current

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const result = await summarizeArticle(params)

      if (requestId !== requestSeq.current) return
      setState({ summary: result.summary, loading: false, error: null })
    } catch (err) {
      if (requestId !== requestSeq.current) return
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

