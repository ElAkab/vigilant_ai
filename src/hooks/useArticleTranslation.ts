import { useEffect, useRef, useState } from 'react'
import { translateText } from '../services/translationService'
import type { Lang } from '../i18n/types'

type CacheEntry = { title: string; resume: string }
const TRANSLATION_CACHE: Record<string, CacheEntry> = {}

function cacheKey(articleId: string, lang: Lang): string {
  return `${articleId}:${lang}`
}

function getCached(articleId: string, lang: Lang): CacheEntry | null {
  return TRANSLATION_CACHE[cacheKey(articleId, lang)] ?? null
}

export function useArticleTranslation(
  articleId: string,
  title: string,
  resume: string,
  lang: Lang,
) {
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
  const [translatedResume, setTranslatedResume] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const seqRef = useRef(0)

  useEffect(() => {
    if (!title || !resume) return

    const cached = getCached(articleId, lang)
    if (cached) {
      // Éviter setState synchrone dans l'effet : passer par setTimeout
      const id = setTimeout(() => {
        setTranslatedTitle(cached.title)
        setTranslatedResume(cached.resume)
        setLoading(false)
      }, 0)
      return () => clearTimeout(id)
    }

    let cancelled = false
    const seq = ++seqRef.current
    // setLoading via microtask pour respecter la règle
    const loadingId = setTimeout(() => {
      if (!cancelled && seq === seqRef.current) setLoading(true)
    }, 0)

    void (async () => {
      try {
        const [titleRes, resumeRes] = await Promise.all([
          translateText({ text: title, targetLang: lang }),
          translateText({ text: resume, targetLang: lang }),
        ])
        if (cancelled || seq !== seqRef.current) return

        const key = cacheKey(articleId, lang)
        TRANSLATION_CACHE[key] = { title: titleRes.translated, resume: resumeRes.translated }
        setTranslatedTitle(titleRes.translated)
        setTranslatedResume(resumeRes.translated)
        setLoading(false)
      } catch (err) {
        if (cancelled || seq !== seqRef.current) return
        console.warn(`[Translation] Échec pour ${articleId}:`, err)
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(loadingId)
    }
  }, [articleId, title, resume, lang])

  return { translatedTitle, translatedResume, loading }
}
