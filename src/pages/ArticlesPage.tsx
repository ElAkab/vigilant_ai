import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SandboxHeader } from '../components/SandboxHeader'
import { SelectableArticleCard } from '../components/SelectableArticleCard'
import { SummaryModal } from '../components/SummaryModal'
import { SearchBar } from '../components/SearchBar'
import { useArticles } from '../hooks/useArticles'
import { useArticleSummary } from '../hooks/useArticleSummary'
import type { Article, Categorie } from '../types/article'

const DEFAULT_PAGE_SIZE = 10
const DEBOUNCE_MS = 300

interface FilterState {
  q: string
  source: string
  categorie: Categorie | ''
  sort: 'recent' | 'ancien'
  page: number
}

function readFilterFromURL(): FilterState {
  const sp = new URLSearchParams(window.location.search)
  return {
    q: sp.get('q') || '',
    source: sp.get('source') || '',
    categorie: (sp.get('categorie') as Categorie) || '',
    sort: (sp.get('sort') === 'ancien' ? 'ancien' : 'recent'),
    page: Math.max(1, Number(sp.get('page') || 1)),
  }
}

function writeFilterToURL(f: FilterState): void {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  if (f.source) sp.set('source', f.source)
  if (f.categorie) sp.set('categorie', f.categorie)
  if (f.sort !== 'recent') sp.set('sort', f.sort)
  if (f.page > 1) sp.set('page', String(f.page))
  const qs = sp.toString()
  const url = qs ? `?${qs}` : window.location.pathname
  history.pushState(null, '', url)
}

export function ArticlesPage() {
  const { items, total, loading, error, reload } = useArticles()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [generationId, setGenerationId] = useState(0)

  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    generateSummary,
    cached,
    serverConnected,
  } = useArticleSummary()

  // État des filtres (lu depuis l'URL au montage)
  const [filter, setFilter] = useState<FilterState>(readFilterFromURL)
  // Input local de la barre de recherche
  const [searchInput, setSearchInput] = useState(filter.q)

  const pageSize = DEFAULT_PAGE_SIZE

  // Ref pour le debounce — évite useEffect + setState
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const filterRef = useRef(filter)
  // Synchroniser la ref avec le state — pattern React officiel pour lire
  // la dernière valeur dans un callback asynchrone sans dépendance
  useEffect(() => {
    filterRef.current = filter
  })

  const triggerReload = useCallback(
    (f: FilterState) => {
      const offset = (f.page - 1) * pageSize
      reload({
        limit: pageSize,
        offset,
        q: f.q || undefined,
        source: f.source || undefined,
        categorie: f.categorie || undefined,
        sort: f.sort,
      })
    },
    [pageSize, reload],
  )

  // Gestion du changement de texte de recherche (avec debounce)
  const onSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const currentFilter = filterRef.current
        const next: FilterState = { ...currentFilter, q: value, page: 1 }
        writeFilterToURL(next)
        setFilter(next)
        triggerReload(next)
      }, DEBOUNCE_MS)
    },
    [triggerReload],
  )

  // Appliquer un filtre (source, categorie, sort) → reset page à 1
  const applyFilter = useCallback(
    (patch: Partial<FilterState>) => {
      setFilter((prev) => {
        const next = { ...prev, ...patch, page: 1 }
        writeFilterToURL(next)
        triggerReload(next)
        return next
      })
    },
    [triggerReload],
  )

  // Changement de page → les filtres sont hérités de lastParamsRef
  const goToPage = useCallback(
    (page: number) => {
      const currentFilter = filterRef.current
      const clamped = Math.max(1, Math.min(page, Math.ceil(total / pageSize)))
      if (clamped === currentFilter.page) return
      const next = { ...currentFilter, page: clamped }
      writeFilterToURL(next)
      setFilter(next)
      const offset = (clamped - 1) * pageSize
      reload({ limit: pageSize, offset })
    },
    [total, pageSize, reload],
  )

  // Chargement initial (si l'URL a des params de recherche au montage)
  useEffect(() => {
    const initial = readFilterFromURL()
    if (initial.q || initial.source || initial.categorie || initial.sort !== 'recent' || initial.page > 1) {
      triggerReload(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // exécuté une seule fois au montage

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const effectiveSelectedId = useMemo(() => {
    if (loading) return selectedId
    if (items.length === 0) return null
    return selectedId ?? items[0]!.id
  }, [items, loading, selectedId])

  const selectedArticle: Article | null = useMemo(() => {
    if (!effectiveSelectedId) return null
    return items.find((a) => a.id === effectiveSelectedId) ?? null
  }, [items, effectiveSelectedId])

  const onGenerateSummary = useCallback(
    (article: Article) => {
      console.log("DEBUG: onGenerateSummary appelé pour l'article:", article.id)
      setSelectedId(article.id)
      setIsModalOpen(true)
      setGenerationId((prev) => prev + 1)
      void generateSummary({ article, maxLength: 1000 })
    },
    [generateSummary],
  )

  const onCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return (
    <main className="min-h-dvh">
      <SandboxHeader totalArticles={total} loading={loading} />

      {/* Sous-titre mobile — en dehors du header */}
      <div className="border-b border-black/[0.04] bg-white/50 backdrop-blur-sm sm:hidden dark:border-white/[0.04] dark:bg-zinc-950/50">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center font-reading text-[10px] font-medium uppercase tracking-[0.18em] text-va-ink-muted/60 dark:text-[#8f877c]/60">
          Agrégateur · Veille sémantique
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-8 pb-12 md:pt-12 md:pb-14">
        {error ? (
          <div
            role="alert"
            className="mb-8 flex flex-col gap-4 rounded-2xl border border-red-200/90 bg-red-50 p-5 font-reading text-sm text-red-900 dark:border-red-900/55 dark:bg-red-950/40 dark:text-red-100"
          >
            <div className="space-y-1">
              <p className="font-semibold">Impossible de charger les sources.</p>
              <p className="text-sm text-red-900/70 dark:text-red-100/70">Merci de patienter, nous réessayons.</p>
              <p className="text-xs text-red-900/40 dark:text-red-100/40">{error}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reload({ limit: pageSize, offset: 0 })}
                className="inline-flex items-center justify-center rounded-xl bg-red-900 px-4 py-2.5 font-reading text-sm font-semibold text-red-50 shadow-[0_14px_34px_-20px_rgb(120_11_11/0.55)] transition hover:-translate-y-0.5 hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:bg-red-200 dark:text-red-950 dark:hover:bg-red-100"
              >
                Réessayer
              </button>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-red-200/80 bg-white/70 px-4 py-2.5 font-reading text-sm font-semibold text-red-900/90 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:border-white/10 dark:bg-zinc-950/40 dark:text-red-100/90 dark:hover:bg-zinc-950/60"
              >
                Vérifier la connexion
              </a>
            </div>
          </div>
        ) : null}

        <div className="mx-auto max-w-3xl">
          {/* Barre de recherche + filtres */}
          <div className="mb-8">
            <SearchBar
              query={searchInput}
              onQueryChange={onSearchChange}
              source={filter.source}
              onSourceChange={(s) => applyFilter({ source: s })}
              categorie={filter.categorie}
              onCategorieChange={(c) => applyFilter({ categorie: c })}
              sort={filter.sort}
              onSortChange={(s) => applyFilter({ sort: s })}
              resultCount={total}
              loading={loading}
            />
          </div>

          <section className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-va-ink dark:text-[#f3eee6] sm:text-3xl">
                Fil d&apos;articles
              </h2>
            </div>

            <div className="flex flex-col gap-5 md:gap-6">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-va-mist/90 bg-white/55 p-10 text-center font-reading text-sm text-va-ink-muted dark:border-white/10 dark:bg-zinc-950/30 dark:text-[#a39a91]">
                  Chargement de la sélection curatoriale…
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <img
                    src="/vigilan-ai.png"
                    alt="Vigilant AI"
                    className="mb-6 h-14 w-14 rounded-2xl shadow-[0_12px_30px_-14px_rgb(16_21_32/0.35)] ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
                  />
                  <p className="font-display text-xl font-semibold tracking-[-0.02em] text-va-ink dark:text-[#f3eee6]">
                    {filter.q || filter.source || filter.categorie
                      ? 'Aucun résultat pour ces filtres.'
                      : 'Aucun article pour le moment.'}
                  </p>
                  <p className="mt-2 max-w-sm text-xs text-va-ink-muted/55 dark:text-[#8f877c]/55">
                    {filter.q || filter.source || filter.categorie
                      ? 'Essaie de modifier ou réinitialiser les filtres.'
                      : (
                        <>
                          Les développeurs peuvent configurer leurs flux dans{' '}
                          <code className="rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-va-ink-muted dark:bg-white/[0.04] dark:text-[#b7aea3]">
                            server/config/sources.ts
                          </code>
                          .
                        </>
                      )}
                  </p>
                  {(filter.q || filter.source || filter.categorie) && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('')
                          applyFilter({ q: '', source: '', categorie: '', sort: 'recent' })
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-black/[0.06] bg-white/60 px-3 py-1.5 font-reading text-[11px] font-medium text-va-ink-muted/70 transition hover:border-black/[0.12] hover:text-va-ink-soft dark:border-white/[0.08] dark:bg-zinc-900/40 dark:text-[#8f877c]/70 dark:hover:border-white/[0.15] dark:hover:text-va-mist"
                      >
                        Réinitialiser les filtres
                      </button>
                    </div>
                  )}
                  {!filter.q && !filter.source && !filter.categorie && (
                    <div className="mt-4">
                      <a
                        href="https://hnrss.org/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-black/[0.06] bg-white/60 px-3 py-1.5 font-reading text-[11px] font-medium text-va-ink-muted/70 transition hover:border-black/[0.12] hover:text-va-ink-soft dark:border-white/[0.08] dark:bg-zinc-900/40 dark:text-[#8f877c]/70 dark:hover:border-white/[0.15] dark:hover:text-va-mist"
                      >
                        Exemple de flux RSS
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                items.map((article, index) => (
                  <SelectableArticleCard
                    key={article.id}
                    article={article}
                    isSelected={article.id === effectiveSelectedId}
                    onGenerateSummary={onGenerateSummary}
                    styleIndex={index}
                  />
                ))
              )}
            </div>

            {/* Pagination serveur */}
            {total > pageSize && (
              <div className="mt-8 flex items-center justify-center gap-2 font-reading text-sm">
                <button
                  onClick={() => goToPage(filter.page - 1)}
                  disabled={filter.page === 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-va-mist bg-white/90 font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 disabled:opacity-50 disabled:pointer-events-none dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist"
                >
                  ←
                </button>
                <span className="text-xs text-va-ink-muted dark:text-[#8f877c] px-2 min-w-[4rem] text-center">
                  {filter.page}/{totalPages}
                </span>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1
                  const isVisible =
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - filter.page) <= 1

                  if (!isVisible) {
                    if (page === 2 || page === totalPages - 1) {
                      return (
                        <span key={page} className="text-va-ink-muted px-1">
                          ...
                        </span>
                      )
                    }
                    return null
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={[
                        'inline-flex h-10 w-10 items-center justify-center rounded-xl font-semibold transition',
                        filter.page === page
                          ? 'bg-va-ink text-va-paper shadow-[0_12px_30px_-18px_rgb(16_21_32/0.85)] dark:bg-[#f3eee6] dark:text-va-ink'
                          : 'border border-va-mist bg-white/90 text-va-ink-soft hover:border-va-rust/40 hover:bg-va-paper-deep/50 dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist',
                      ].join(' ')}
                    >
                      {page}
                    </button>
                  )
                })}
                <button
                  onClick={() => goToPage(filter.page + 1)}
                  disabled={filter.page === totalPages}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-va-mist bg-white/90 font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 disabled:opacity-50 disabled:pointer-events-none dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist"
                >
                  →
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <SummaryModal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        article={selectedArticle}
        summary={summary}
        isLoading={summaryLoading}
        error={summaryError}
        cached={cached}
        serverConnected={serverConnected}
        generationId={generationId}
      />
    </main>
  )
}
