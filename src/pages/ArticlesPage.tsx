import { useCallback, useMemo, useState } from 'react'

import { SandboxHeader } from '../components/SandboxHeader'
import { SelectableArticleCard } from '../components/SelectableArticleCard'
import { SummaryModal } from '../components/SummaryModal'
import { useArticles } from '../hooks/useArticles'
import { useArticleSummary } from '../hooks/useArticleSummary'
import type { Article } from '../types/article'

const DEFAULT_PAGE_SIZE = 10

export function ArticlesPage() {
  const { items, total, loading, error, reload } = useArticles()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [summaryGen, setSummaryGen] = useState(0)

  const { summary, loading: summaryLoading, error: summaryError, generateSummary, cached } =
    useArticleSummary()

  const pageSize = DEFAULT_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Navigation paginée côté serveur
  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(clamped)
      const offset = (clamped - 1) * pageSize
      reload({ limit: pageSize, offset })
    },
    [pageSize, totalPages, reload],
  )

  const effectiveSelectedId = useMemo(() => {
    if (loading) return selectedId
    if (items.length === 0) return null
    return selectedId ?? items[0]!.id
  }, [items, loading, selectedId])

  const selectedArticle: Article | null = useMemo(() => {
    if (!effectiveSelectedId) return null
    return items.find((a) => a.id === effectiveSelectedId) ?? null
  }, [items, effectiveSelectedId])

  // reset() is called by generateSummary() itself (requestSeq++ aborts previous)
  // No useEffect needed — it was racing with generateSummary's own abort controller

  const onGenerateSummary = useCallback(
    (article: Article) => {
      console.log("DEBUG: onGenerateSummary appelé pour l'article:", article.id)
      setSelectedId(article.id)
      setIsModalOpen(true)
      setSummaryGen((prev) => prev + 1)
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
                <div className="rounded-2xl border border-dashed border-black/[0.06] bg-white/60 p-10 text-center backdrop-blur-sm dark:border-white/[0.06] dark:bg-zinc-900/50">
                  <p className="font-display text-lg font-semibold text-va-ink dark:text-[#f3eee6]">
                    Aucun article pour le moment.
                  </p>
                  <p className="mt-2 text-xs text-va-ink-muted/70 dark:text-[#8f877c]/70">
                    Les développeurs peuvent configurer leurs flux dans{' '}
                    <code className="font-mono text-va-ink-muted dark:text-[#b7aea3]">
                      server/config/sources.ts
                    </code>
                    .
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <a
                      href="https://hnrss.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl border border-va-mist bg-white/90 px-4 py-2.5 font-reading text-sm font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/50 dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist dark:hover:bg-zinc-900/60"
                    >
                      Exemple de flux RSS
                    </a>
                  </div>
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
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-va-mist bg-white/90 font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 disabled:opacity-50 disabled:pointer-events-none dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist"
                >
                  ←
                </button>
                <span className="text-xs text-va-ink-muted dark:text-[#8f877c] px-2 min-w-[4rem] text-center">
                  {currentPage}/{totalPages}
                </span>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1
                  const isVisible =
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1

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
                        currentPage === page
                          ? 'bg-va-ink text-va-paper shadow-[0_12px_30px_-18px_rgb(16_21_32/0.85)] dark:bg-[#f3eee6] dark:text-va-ink'
                          : 'border border-va-mist bg-white/90 text-va-ink-soft hover:border-va-rust/40 hover:bg-va-paper-deep/50 dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist',
                      ].join(' ')}
                    >
                      {page}
                    </button>
                  )
                })}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
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
        key={summaryGen}
        isOpen={isModalOpen}
        onClose={onCloseModal}
        article={selectedArticle}
        summary={summary}
        isLoading={summaryLoading}
        error={summaryError}
        cached={cached}
      />
    </main>
  )
}
