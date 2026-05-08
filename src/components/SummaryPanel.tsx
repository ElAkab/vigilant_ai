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
        'rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950',
        className ?? '',
      ].join(' ')}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Résumé IA
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {hasArticle
              ? `Pour : ${article?.titre}`
              : 'Sélectionne un article pour générer un résumé.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              disabled={!canClear}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Effacer
            </button>
          ) : null}

          {onGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
            >
              {isLoading ? 'Génération…' : 'Générer'}
            </button>
          ) : null}
        </div>
      </header>

      <div className="mt-4">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-950 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        ) : null}

        {summary ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100">
            {summary}
          </div>
        ) : null}

        {!summary && !error ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {hasArticle
              ? 'Clique sur “Générer” pour obtenir un résumé.'
              : 'Aucun article sélectionné.'}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

