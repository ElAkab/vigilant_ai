import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Categorie } from '../types/article'

interface SearchBarProps {
  query: string
  onQueryChange: (q: string) => void
  source: string
  onSourceChange: (source: string) => void
  categorie: Categorie | ''
  onCategorieChange: (cat: Categorie | '') => void
  sort: 'recent' | 'ancien'
  onSortChange: (sort: 'recent' | 'ancien') => void
  loading: boolean
}

type SourceOption = { value: string; label: string }

const ALL_SOURCES: SourceOption[] = [
  { value: '', label: 'Toutes les sources' },
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'Cloudflare', label: 'Cloudflare' },
  { value: 'Le Monde', label: 'Le Monde' },
  { value: 'Frandroid', label: 'Frandroid' },
]

// Mapping catégorie → sources compatibles
const CATEGORY_SOURCES: Partial<Record<Categorie, string[]>> = {
  Tech: ['OpenAI', 'Cloudflare', 'Frandroid'],
  Géopolitique: ['Le Monde'],
}

// Mapping inverse : source → catégories compatibles
const SOURCE_CATEGORIES: Record<string, Categorie[]> = {}
for (const [cat, sources] of Object.entries(CATEGORY_SOURCES)) {
  for (const src of sources!) {
    if (!SOURCE_CATEGORIES[src]) SOURCE_CATEGORIES[src] = []
    SOURCE_CATEGORIES[src].push(cat as Categorie)
  }
}

const ALL_CATEGORIES: Array<{ value: Categorie | ''; label: string }> = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'Tech', label: 'Tech' },
  { value: 'Géopolitique', label: 'Géopolitique' },
]

const selectBase =
  'appearance-none rounded-xl border border-va-mist bg-white/90 px-3 py-2 pr-8 font-reading text-sm text-va-ink-soft transition focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/40 hover:border-va-rust/40 dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist'

export function SearchBar({
  query,
  onQueryChange,
  source,
  onSourceChange,
  categorie,
  onCategorieChange,
  sort,
  onSortChange,
  loading,
}: SearchBarProps) {
  // Sources disponibles selon la catégorie sélectionnée
  const availableSources = useMemo<SourceOption[]>(() => {
    if (!categorie) return ALL_SOURCES
    const allowed = CATEGORY_SOURCES[categorie]
    if (!allowed) return ALL_SOURCES
    return ALL_SOURCES.filter((s) => s.value === '' || allowed.includes(s.value))
  }, [categorie])

  // Catégories disponibles selon la source sélectionnée
  const availableCategories = useMemo<Array<{ value: Categorie | ''; label: string }>>(() => {
    if (!source) return ALL_CATEGORIES
    const allowed = SOURCE_CATEGORIES[source]
    if (!allowed) return ALL_CATEGORIES
    return ALL_CATEGORIES.filter((c) => c.value === '' || allowed.includes(c.value as Categorie))
  }, [source])

  // Ref pour lire les valeurs à jour dans les callbacks
  const sourceRef = useRef(source)
  const categorieRef = useRef(categorie)
  useEffect(() => {
    sourceRef.current = source
    categorieRef.current = categorie
  })

  // Changer de catégorie → réinitialiser la source si incompatible
  const onCategorieChangeSafe = useCallback(
    (cat: Categorie | '') => {
      onCategorieChange(cat)
      if (cat && sourceRef.current) {
        const allowed = CATEGORY_SOURCES[cat]
        if (allowed && !allowed.includes(sourceRef.current)) {
          onSourceChange('')
        }
      }
    },
    [onCategorieChange, onSourceChange],
  )

  // Changer de source → réinitialiser la catégorie si incompatible
  const onSourceChangeSafe = useCallback(
    (src: string) => {
      onSourceChange(src)
      if (src && categorieRef.current) {
        const allowed = SOURCE_CATEGORIES[src]
        if (allowed && !allowed.includes(categorieRef.current)) {
          onCategorieChange('')
        }
      }
    },
    [onSourceChange, onCategorieChange],
  )

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-va-ink-muted/40 dark:text-[#8f877c]/40"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher un article…"
          className="w-full rounded-xl border border-va-mist bg-white/90 py-2.5 pl-10 pr-4 font-reading text-sm text-va-ink placeholder:text-va-ink-muted/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/40 hover:border-va-rust/40 dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist dark:placeholder:text-[#8f877c]/40"
        />
        {loading && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-va-mist border-t-va-rust" />
          </div>
        )}
      </div>

      {/* Filtres + Tri — responsive */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {/* Dropdown Catégorie */}
        <div className="relative">
          <select
            value={categorie}
            onChange={(e) => onCategorieChangeSafe(e.target.value as Categorie | '')}
            className={`${selectBase} w-full sm:w-auto`}
          >
            {availableCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-va-ink-muted/50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

        {/* Dropdown Source — filtré dynamiquement */}
        <div className="relative">
          <select
            value={source}
            onChange={(e) => onSourceChangeSafe(e.target.value)}
            className={`${selectBase} w-full sm:w-auto`}
          >
            {availableSources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-va-ink-muted/50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>

        {/* Toggle Tri */}
        <div className="col-span-2 flex rounded-xl border border-va-mist bg-white/90 py-0.5 dark:border-white/15 dark:bg-zinc-950/40 sm:col-span-1">
          <button
            type="button"
            onClick={() => onSortChange('recent')}
            className={`flex-1 rounded-lg px-3 py-1.5 font-reading text-sm font-medium transition ${
              sort === 'recent'
                ? 'bg-va-ink text-va-paper shadow-sm dark:bg-[#f3eee6] dark:text-va-ink'
                : 'text-va-ink-muted hover:text-va-ink-soft dark:text-[#8f877c] dark:hover:text-va-mist'
            }`}
          >
            Récents
          </button>
          <button
            type="button"
            onClick={() => onSortChange('ancien')}
            className={`flex-1 rounded-lg px-3 py-1.5 font-reading text-sm font-medium transition ${
              sort === 'ancien'
                ? 'bg-va-ink text-va-paper shadow-sm dark:bg-[#f3eee6] dark:text-va-ink'
                : 'text-va-ink-muted hover:text-va-ink-soft dark:text-[#8f877c] dark:hover:text-va-mist'
            }`}
          >
            Anciens
          </button>
        </div>
      </div>
    </div>
  )
}
