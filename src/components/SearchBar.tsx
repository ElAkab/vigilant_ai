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
  resultCount: number
  loading: boolean
}

const SOURCES = [
  { value: '', label: 'Toutes les sources' },
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'Cloudflare', label: 'Cloudflare' },
  { value: 'Le Monde', label: 'Le Monde' },
  { value: 'Frandroid', label: 'Frandroid' },
]

const CATEGORIES: Array<{ value: Categorie | ''; label: string }> = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'Tech', label: 'Tech' },
  { value: 'Géopolitique', label: 'Géopolitique' },
  { value: 'Général', label: 'Général' },
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
  resultCount,
  loading,
}: SearchBarProps) {
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

      {/* Filtres + Tri */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Dropdown Source */}
        <div className="relative">
          <select
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className={selectBase}
          >
            {SOURCES.map((s) => (
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

        {/* Dropdown Catégorie */}
        <div className="relative">
          <select
            value={categorie}
            onChange={(e) => onCategorieChange(e.target.value as Categorie | '')}
            className={selectBase}
          >
            {CATEGORIES.map((c) => (
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

        {/* Toggle Tri */}
        <div className="flex rounded-xl border border-va-mist bg-white/90 p-0.5 dark:border-white/15 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={() => onSortChange('recent')}
            className={`rounded-lg px-3 py-1.5 font-reading text-sm font-medium transition ${
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
            className={`rounded-lg px-3 py-1.5 font-reading text-sm font-medium transition ${
              sort === 'ancien'
                ? 'bg-va-ink text-va-paper shadow-sm dark:bg-[#f3eee6] dark:text-va-ink'
                : 'text-va-ink-muted hover:text-va-ink-soft dark:text-[#8f877c] dark:hover:text-va-mist'
            }`}
          >
            Anciens
          </button>
        </div>

        {/* Compteur de résultats */}
        <span className="ml-auto font-reading text-xs text-va-ink-muted/60 dark:text-[#8f877c]/60">
          {resultCount} article{resultCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
