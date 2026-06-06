import { useCallback, useRef, useState } from 'react'

import { summarizeArticle, summarizeArticleStream, summarizeArticleV2Stream } from '../services/summarizationService'
import type { Article } from '../types/article'

type UseArticleSummaryState = {
  summary: string | null
  loading: boolean
  error: string | null
  cached: boolean
  serverConnected: boolean
}

type GenerateSummaryParams = {
  article: Article
  maxLength?: number
  lang?: string
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
    cached: false,
    serverConnected: false,
  })

  const requestSeq = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    requestSeq.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setState({ summary: null, loading: false, error: null, cached: false, serverConnected: false })
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
        onMeta() {
          if (requestId !== requestSeq.current) return
          setState((prev) => ({ ...prev, serverConnected: true }))
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
      // Guard: prevent duplicate concurrent calls for the same article
      if (inFlightRef.current === params.article.id) {
        console.warn(`[Summary] Already generating for ${params.article.id} — skipping duplicate`)
        return
      }

      const requestId = ++requestSeq.current
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort
      inFlightRef.current = params.article.id

      // Vérifier le cache sessionStorage d'abord
      const cached = getCached(params.article.id)
      if (cached) {
        setState({ summary: cached, loading: false, error: null, cached: true, serverConnected: true })
        inFlightRef.current = null
        return
      }

      setState({ summary: '', loading: true, error: null, cached: false, serverConnected: false })

      let lastError: Error | null = null

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await delay(RETRY_DELAY_MS)
            if (requestId !== requestSeq.current) { inFlightRef.current = null; return }
            setState((prev) => ({ ...prev, summary: '' }))
          }

          const result = await attemptSummarize(params, requestId, abort)

          if (requestId !== requestSeq.current) { inFlightRef.current = null; return }
          // Sauvegarder dans le cache le texte accumulé (non tronqué)
          setState((prev) => {
            // prev.summary = texte complet accumulé pendant le stream
            // result.summary = version clippée par le serveur (maxLength)
            // On préfère le texte complet pour ne pas perdre l'insight en fin de résumé
            const fullText = prev.summary || result.summary
            if (fullText) setCache(params.article.id, fullText)
            return { summary: fullText, loading: false, error: null, cached: result.cached ?? false, serverConnected: true }
          })
          inFlightRef.current = null
          return
        } catch (err) {
          if (requestId !== requestSeq.current) { inFlightRef.current = null; return }
          if (err instanceof Error && err.name === 'AbortError') { inFlightRef.current = null; return }
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
            inFlightRef.current = null
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

// ── V2 : Multi-call avec JSON structuré (synthèse + insight séparés) ──

type UseArticleSummaryV2State = {
  summaryMd: string | null
  insight: string | null
  loading: boolean
  error: string | null
  cached: boolean
}

export function useArticleSummaryV2() {
  const [state, setState] = useState<UseArticleSummaryV2State>({
    summaryMd: null,
    insight: null,
    loading: false,
    error: null,
    cached: false,
  })

  const requestSeq = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const inFlightRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    requestSeq.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setState({ summaryMd: null, insight: null, loading: false, error: null, cached: false })
  }, [])

  const generateSummaryV2 = useCallback(
    async (params: GenerateSummaryParams) => {
      if (inFlightRef.current === params.article.id) {
        console.warn(`[SummaryV2] Already generating for ${params.article.id} — skipping`)
        return
      }

      const requestId = ++requestSeq.current
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort
      inFlightRef.current = params.article.id

      // Vérifier le cache sessionStorage
      const cacheKey = `v2:${params.article.id}:${params.lang ?? 'fr'}`
      const cachedStr = getCached(cacheKey)
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr) as { summaryMd: string; insight: string }
          setState({
            summaryMd: parsed.summaryMd ?? '',
            insight: parsed.insight ?? '',
            loading: false,
            error: null,
            cached: true,
          })
          inFlightRef.current = null
          return
        } catch { /* cache corrompu, on continue */ }
      }

      setState({ summaryMd: '', insight: '', loading: true, error: null, cached: false })

      let lastError: Error | null = null

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            await delay(RETRY_DELAY_MS)
            if (requestId !== requestSeq.current) { inFlightRef.current = null; return }
            setState({ summaryMd: '', insight: '', loading: true, error: null, cached: false })
          }

          const result = await summarizeArticleV2Stream({
            article: params.article,
            lang: params.lang,
            signal: abort.signal,
            onDelta(delta) {
              if (requestId !== requestSeq.current) return
              setState((prev) => ({
                ...prev,
                summaryMd: (prev.summaryMd ?? '') + delta,
              }))
            },
            onInsight(insight) {
              if (requestId !== requestSeq.current) return
              setState((prev) => ({ ...prev, insight, loading: false }))
            },
            onMeta() {
              if (requestId !== requestSeq.current) return
              setState((prev) => ({ ...prev, cached: false }))
            },
          })

          if (requestId !== requestSeq.current) { inFlightRef.current = null; return }

          // Fallback: si l'event done arrive avant insight (cache hit)
          setState((prev) => {
            const finalSummary = prev.summaryMd || result.summaryMd
            const finalInsight = prev.insight || result.insight
            if (finalSummary) {
              try {
                setCache(cacheKey, JSON.stringify({ summaryMd: finalSummary, insight: finalInsight }))
              } catch { /* ignore */ }
            }
            return {
              summaryMd: finalSummary,
              insight: finalInsight,
              loading: false,
              error: null,
              cached: result.cached ?? false,
            }
          })

          inFlightRef.current = null
          return
        } catch (err) {
          if (requestId !== requestSeq.current) { inFlightRef.current = null; return }
          if (err instanceof Error && err.name === 'AbortError') { inFlightRef.current = null; return }
          lastError = err instanceof Error ? err : new Error('Erreur inconnue')

          console.warn(`[SummaryV2] Échec tentative ${attempt + 1}/${MAX_RETRIES + 1}: ${lastError.message}`)

          if (attempt === MAX_RETRIES) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: lastError?.message || 'Échec du résumé après plusieurs tentatives',
            }))
            inFlightRef.current = null
            return
          }
        }
      }
    },
    [],
  )

  return {
    ...state,
    generateSummaryV2,
    reset,
  }
}
