import type { Article } from '../types/article'

type ArticleCardProps = {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  const date = new Date(article.datePublication)
  const dateAffichee = Number.isNaN(date.getTime())
    ? article.datePublication
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date)

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {article.titre}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Publié le{' '}
            <time dateTime={article.datePublication} className="font-medium">
              {dateAffichee}
            </time>
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          #{article.id}
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        {article.resume}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <a
          href={article.urlSource}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
        >
          Lire la source
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </a>

        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          {new URL(article.urlSource).hostname}
        </span>
      </div>
    </article>
  )
}

