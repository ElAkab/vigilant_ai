import { useCallback, useEffect, useMemo, useState } from 'react'

import { SelectableArticleCard } from '../components/SelectableArticleCard'
import { SummaryPanel } from '../components/SummaryPanel'
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

  const onSelectArticle = useCallback((id: Article['id']) => {
    setSelectedId(id)
  }, [])

  const onGenerateSummary = useCallback(() => {
    if (!selectedArticle) return
    void generateSummary({ article: selectedArticle, maxLength: 280 })
  }, [generateSummary, selectedArticle])

  const onResetSummary = useCallback(() => {
    reset()
  }, [reset])

  return (
    <main className="min-h-dvh">
      <header className="relative overflow-hidden border-b border-black/5 dark:border-white/10">
        <div className="pointer-events-none absolute inset-0 opacity-95">
          <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-va-rust/22 blur-[100px]" />
          <div className="absolute right-[-120px] top-[-80px] h-[420px] w-[420px] rounded-full bg-va-teal/18 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-1/3 h-48 w-80 rotate-[-8deg] bg-linear-to-r from-transparent via-black/7 to-transparent dark:via-white/8" />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-14 md:flex-row md:items-end md:justify-between md:gap-12 md:pb-16">
          <div className="max-w-xl space-y-4 md:-translate-y-1">
            <p className="font-reading text-[11px] font-semibold uppercase tracking-[0.28em] text-va-ink-muted dark:text-[#b7aea3]">
              Agrégateur · Veille sémantique
            </p>
            <h1 className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-va-ink md:text-6xl dark:text-[#f7f0e7]">
              Vigilant&nbsp;AI
            </h1>
            <p className="font-reading text-base leading-relaxed text-va-ink-soft dark:text-[#cbc3b7]">
              Tableau de bord éditorial pour suivre une veille curatoriale : lis, sélectionne, puis{' '}
              <span className="font-semibold text-va-ink dark:text-[#f3eee6]">
                extrais une synthèse
              </span>{' '}
              (mock) avant de brancher un modèle réel.
            </p>
          </div>

          <div className="grid w-full gap-3 font-reading text-sm md:max-w-xs md:text-right">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-va-ink-soft shadow-[0_16px_40px_-32px_rgb(16_21_32/0.65)] backdrop-blur-sm dark:border-white/10 dark:bg-zinc-950/45 dark:text-[#bfb6ab] dark:shadow-[0_20px_50px_-38px_rgb(0_0_0/0.75)]">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-va-rust dark:text-va-rust-bright">
                État flux
              </span>
              <span className="mt-2 block text-base font-semibold text-va-ink dark:text-[#f3eee6]">
                {loading ? 'Chargement des sources…' : `${items.length} article${items.length > 1 ? 's' : ''} disponible${items.length > 1 ? 's' : ''}`}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-va-ink-muted dark:text-[#8f877c]">
              Disposition en deux bandes : liste principale à gauche, panneau de synthèse ancré à
              droite (sticky sur grand écran).
            </p>
          </div>
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 md:py-14">
        {error ? (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-red-200/90 bg-red-50 p-5 font-reading text-sm text-red-900 dark:border-red-900/55 dark:bg-red-950/40 dark:text-red-100"
          >
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-va-ink dark:text-[#f3eee6]">
                  Fil d&apos;articles
                </h2>
                <p className="mt-2 max-w-prose font-reading text-sm text-va-ink-muted dark:text-[#a9a29a]">
                  Cartes légèrement désaxées et révélées en cascade — privilégie une lecture calmée,
                  puis ouvre la source dans un nouvel onglet.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-5 md:gap-6">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-va-mist/90 bg-white/55 p-10 text-center font-reading text-sm text-va-ink-muted dark:border-white/10 dark:bg-zinc-950/30 dark:text-[#a39a91]">
                  Chargement de la sélection curatoriale…
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-va-mist/90 bg-white/55 p-10 text-center font-reading text-sm text-va-ink-muted dark:border-white/10 dark:bg-zinc-950/30 dark:text-[#a39a91]">
                  Aucun article mock pour le moment. Ajoute-en dans les données fictives ou branche un
                  connecteur RSS.
                </div>
              ) : (
                items.map((article, index) => (
                  <SelectableArticleCard
                    key={article.id}
                    article={article}
                    isSelected={article.id === selectedId}
                    onSelect={onSelectArticle}
                    styleIndex={index}
                  />
                ))
              )}
            </div>
          </section>

          <aside className="lg:sticky lg:top-8 lg:-translate-y-2 lg:self-start">
            <SummaryPanel
              article={selectedArticle}
              summary={summary}
              isLoading={summaryLoading}
              error={summaryError}
              onGenerate={onGenerateSummary}
              onClear={onResetSummary}
            />
          </aside>
        </div>
      </div>
    </main>
  )
}
