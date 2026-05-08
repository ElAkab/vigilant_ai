import { useEffect, useMemo, useState } from 'react'

import { ArticleCard } from '../components/ArticleCard'
import { useArticles } from '../hooks/useArticles'
import { useArticleSummary } from '../hooks/useArticleSummary'
import type { Article } from '../types/article'

export function ArticlesPage() {
  const { items, loading, error } = useArticles()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { summary, loading: summaryLoading, error: summaryError, generateSummary, reset } =
    useArticleSummary()

  useEffect(() => {
    if (loading) return
    if (items.length === 0) {
      setSelectedId(null)
      return
    }

    setSelectedId((prev) => prev ?? items[0]!.id)
  }, [items, loading])

  const selectedArticle: Article | null = useMemo(() => {
    if (!selectedId) return null
    return items.find((a) => a.id === selectedId) ?? null
  }, [items, selectedId])

  useEffect(() => {
    reset()
  }, [selectedId, reset])

  return (
    <main className="min-h-dvh bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Vigilant AI</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            MVP — sélectionnez un article, puis générez un résumé (mock) via IA.
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Articles</h2>
              {loading ? (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Chargement…
                </span>
              ) : (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {items.length} élément{items.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              {items.map((article) => {
                const isSelected = article.id === selectedId
                return (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => setSelectedId(article.id)}
                    className={[
                      'text-left',
                      'rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
                      isSelected ? 'ring-2 ring-zinc-900 dark:ring-zinc-50' : '',
                    ].join(' ')}
                    aria-pressed={isSelected}
                  >
                    <ArticleCard article={article} />
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="lg:col-span-1">
            <div className="sticky top-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Résumé IA</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {selectedArticle
                    ? `Article sélectionné: ${selectedArticle.titre}`
                    : 'Aucun article sélectionné.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!selectedArticle || summaryLoading}
                  onClick={() => {
                    if (!selectedArticle) return
                    void generateSummary({ article: selectedArticle, maxLength: 280 })
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition enabled:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:enabled:hover:bg-white"
                >
                  {summaryLoading ? 'Génération…' : 'Générer un résumé'}
                </button>

                <button
                  type="button"
                  onClick={reset}
                  disabled={!summary && !summaryError && !summaryLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:enabled:hover:bg-zinc-900"
                >
                  Réinitialiser
                </button>
              </div>

              {summaryError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {summaryError}
                </div>
              ) : null}

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-200">
                {summary ? (
                  summary
                ) : (
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Lancez la génération pour afficher un résumé ici.
                  </span>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

