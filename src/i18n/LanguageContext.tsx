import { useCallback, useEffect, useState } from 'react'
import type { Lang } from './types'
import { detectLang, storeLang } from './types'
import { type TranslationMap } from './translations'
import t from './translations'
import { LanguageContext } from './LanguageContextValue'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang())

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    storeLang(l)
  }, [])

  const translate = useCallback(
    (key: string): string => {
      const entry = (t as TranslationMap)[key]
      if (!entry) return key
      return entry[lang] ?? entry['en'] ?? key
    },
    [lang],
  )

  // Synchroniser avec les changements externes de localStorage (onglets multiples)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'vigilant-lang' && e.newValue) {
        setLangState(e.newValue as Lang)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </LanguageContext.Provider>
  )
}
