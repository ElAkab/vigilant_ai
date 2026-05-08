import type { Article } from '../types/article'
import { ArticleCard } from './ArticleCard'

type ArticleListProps = {
  articles: Article[]
  selectedArticleId?: Article['id']
  onSelectArticle?: (article: Article) => void
  className?: string
}

export function ArticleList({
  articles,
  selectedArticleId,
  onSelectArticle,
  className,
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <section className={className}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Aucun article à afficher pour le moment.
        </div>
      </section>
    )
  }

  return (
    <section className={className}>
      <div className="space-y-4">
        {articles.map((article) => {
          const isSelected = selectedArticleId === article.id

          return (
            <div
              key={article.id}
              onClick={() => onSelectArticle?.(article)}
              onKeyDown={(event) => {
                if (!onSelectArticle) return
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onSelectArticle(article)
              }}
              role={onSelectArticle ? 'button' : undefined}
              tabIndex={onSelectArticle ? 0 : undefined}
              aria-pressed={onSelectArticle ? isSelected : undefined}
              className={[
                'rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600',
                onSelectArticle ? 'cursor-pointer' : '',
                isSelected
                  ? 'ring-2 ring-zinc-900 dark:ring-zinc-50'
                  : 'ring-1 ring-transparent',
              ].join(' ')}
            >
              <ArticleCard article={article} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

