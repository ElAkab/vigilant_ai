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

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500
const CACHE_PREFIX = 'vigilant-summary:'

function getCached(articleId: string): string | null {
  try {
    return sessionStorage.getItem(CACHE_PREFIX + articleId)
  } catch {
    return null
  }
}

function setCache(articleId: string, summary: string): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + articleId, summary)
  } catch {
    // sessionStorage plein ou indisponible — on ignore
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

  const attemptSummarize = useCallback(
    async (params: GenerateSummaryParams, requestId: number, abort: AbortController) => {
      return summarizeArticleStream({
        ...params,
        signal: abort.signal,
        onDelta(delta) {
          if (requestId !== requestSeq.current) return
          setState((prev) => ({ ...prev, summary: (prev.summary ?? '') + delta }))
        },
      }).catch(async (err) => {
        if (abort.signal.aborted) throw err
        // Fallback non-stream
        return summarizeArticle(params)
      })
    },
    [],
  )

  const generateSummary = useCallback(
    async (params: GenerateSummaryParams) => {
      const requestId = ++requestSeq.current
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      // Vérifier le cache sessionStorage d'abord
      const cached = getCached(params.article.id)
      if (cached) {
        setState({ summary: cached, loading: false, error: null })
        return
      }

      setState({ summary: '', loading: true, error: null })

      let lastError: Error | null = null

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await delay(RETRY_DELAY_MS)
            if (requestId !== requestSeq.current) return
            setState((prev) => ({ ...prev, summary: '' }))
          }

          const result = await attemptSummarize(params, requestId, abort)

          if (requestId !== requestSeq.current) return
          // Sauvegarder dans le cache
          if (result.summary) setCache(params.article.id, result.summary)
          setState({ summary: result.summary, loading: false, error: null })
          return
        } catch (err) {
          if (requestId !== requestSeq.current) return
          if (err instanceof Error && err.name === 'AbortError') return
          lastError = err instanceof Error ? err : new Error('Erreur inconnue')

          console.warn(
            `[Summary] Échec tentative ${attempt + 1}/${MAX_RETRIES + 1}: ${lastError.message}`,
          )

          if (attempt === MAX_RETRIES) {
            console.error(
              `[Summary] Échec définitif après ${MAX_RETRIES + 1} tentatives: ${lastError.message}`,
            )
            setState((prev) => ({
              ...prev,
              loading: false,
              error: lastError?.message || 'Échec du résumé après plusieurs tentatives',
            }))
            return
          }
        }
      }
    },
    [attemptSummarize],
  )

  return {
    ...state,
    generateSummary,
    reset,
  }
}
