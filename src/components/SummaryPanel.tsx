import type { Article } from '../types/article'

type SummaryPanelProps = {
  article?: Article | null
  summary?: string | null
  isLoading?: boolean
  error?: string | null
  onGenerate?: () => void
  onClear?: () => void
  className?: string
}

export function SummaryPanel({
  article,
  summary,
  isLoading = false,
  error,
  onGenerate,
  onClear,
  className,
}: SummaryPanelProps) {
  const hasArticle = Boolean(article)
  const canGenerate = hasArticle && !isLoading && Boolean(onGenerate)
  const canClear = !isLoading && Boolean(onClear) && (Boolean(summary) || Boolean(error))

  return (
    <aside
      className={[
        'relative isolate overflow-hidden rounded-[1.25rem] border border-va-mist/80 bg-[linear-gradient(145deg,rgb(255_255_255/0.92)_0%,rgb(251_246_236/0.75)_46%,rgb(255_255_255/0.55)_100%)] p-px shadow-[0_18px_45px_-34px_rgb(24_31_46/0.45)] backdrop-blur-[1px] dark:border-white/10 dark:bg-[linear-gradient(150deg,rgb(29_32_44/0.95)_0%,rgb(18_21_30/0.92)_55%,rgb(16_18_28/0.98)_100%)] dark:shadow-[0_24px_60px_-40px_rgb(0_0_0/0.75)]',
        className ?? '',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-va-rust/10 blur-3xl dark:bg-va-rust-bright/12" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-va-teal/10 blur-2xl dark:bg-va-teal/18" />

      <div className="relative space-y-5 rounded-[1.15rem] bg-white/80 p-6 dark:bg-zinc-950/50">
        <header className="space-y-2">
          <p className="font-reading text-[11px] font-semibold uppercase tracking-[0.22em] text-va-ink-muted dark:text-[#a9a29a]">
            Synthèse
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-va-ink dark:text-[#f3eee6]">
            Résumé IA
          </h2>
          <p className="font-reading text-sm leading-relaxed text-va-ink-muted dark:text-[#c9c0b3]">
            {hasArticle ? (
              <>
                Article actif :{' '}
                <span className="font-semibold text-va-ink-soft dark:text-[#ede6dc]">{article?.titre}</span>
              </>
            ) : (
              'Choisis un article dans la liste pour lancer une synthèse mock.'
            )}
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          {onGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate}
              className="inline-flex items-center justify-center rounded-xl bg-va-ink px-4 py-2.5 font-reading text-sm font-semibold text-va-paper shadow-[0_14px_34px_-20px_rgb(16_21_32/0.9)] transition enabled:hover:-translate-y-0.5 enabled:hover:bg-va-ink-soft disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/80 dark:bg-[#f3eee6] dark:text-va-ink dark:enabled:hover:bg-white"
            >
              {isLoading ? 'Génération…' : 'Générer un résumé'}
            </button>
          ) : null}

          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              disabled={!canClear}
              className="inline-flex items-center justify-center rounded-xl border border-va-mist bg-white/90 px-4 py-2.5 font-reading text-sm font-semibold text-va-ink-soft transition enabled:hover:border-va-rust/40 enabled:hover:bg-va-paper-deep/50 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/50 dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist dark:enabled:hover:bg-zinc-900/60"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200/90 bg-red-50/95 p-4 font-reading text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/45 dark:text-red-100"
          >
            {error}
          </div>
        ) : null}

        <div className="min-h-34 rounded-xl border border-dashed border-va-mist/90 bg-va-paper-deep/35 p-4 font-reading text-sm leading-relaxed text-va-ink-soft dark:border-white/12 dark:bg-zinc-900/35 dark:text-[#d6cec3]">
          {summary ? (
            summary
          ) : (
            <span className="text-va-ink-muted dark:text-[#9c948a]">
              Le texte généré apparaîtra ici. C&apos;est encore un flux simulé : parfait pour peaufiner
              l&apos;UI avant de brancher un vrai modèle.
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}
