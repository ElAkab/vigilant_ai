import { createContext } from 'react'
import type { Lang } from './types'

export interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** Traduit une clé. Retourne la clé elle-même si non trouvée. */
  t: (key: string) => string
}

export const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
})
