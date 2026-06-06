export type Lang = 'fr' | 'en' | 'nl' | 'ar'

export const LANGS: Lang[] = ['fr', 'en', 'nl', 'ar']

export const LANG_LABELS: Record<Lang, string> = {
  fr: 'FR',
  en: 'EN',
  nl: 'NL',
  ar: 'AR',
}

/** Détecte la langue depuis navigator.language */
export function detectLang(): Lang {
  // 1. localStorage (choix explicite)
  try {
    const stored = localStorage.getItem('vigilant-lang') as Lang | null
    if (stored && LANGS.includes(stored)) return stored
  } catch { /* localStorage indisponible */ }

  // 2. navigator.language
  const nav = navigator.language.toLowerCase()
  if (nav.startsWith('fr')) return 'fr'
  if (nav.startsWith('nl')) return 'nl'
  if (nav.startsWith('ar')) return 'ar'

  // 3. défaut anglais
  return 'en'
}

/** Stocke le choix utilisateur */
export function storeLang(lang: Lang): void {
  try {
    localStorage.setItem('vigilant-lang', lang)
  } catch { /* ignore */ }
}
