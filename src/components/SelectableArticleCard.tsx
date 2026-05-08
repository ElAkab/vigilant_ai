import { memo } from 'react'

import type { Article } from '../types/article'
import { ArticleCard } from './ArticleCard'

type SelectableArticleCardProps = {
  article: Article
  isSelected: boolean
  onSelect: (id: Article['id']) => void
  styleIndex: number
}

export const SelectableArticleCard = memo(function SelectableArticleCard({
  article,
  isSelected,
  onSelect,
  styleIndex,
}: SelectableArticleCardProps) {
  const delayMs = Math.min(styleIndex, 8) * 55

  return (
    <button
      type="button"
      onClick={() => onSelect(article.id)}
      className={[
        'text-left',
        'w-full',
        '[content-visibility:auto]',
        '[contain-intrinsic-size:auto_240px]',
        'rounded-[1.15rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/70 focus-visible:ring-offset-2 focus-visible:ring-offset-va-paper dark:focus-visible:ring-offset-zinc-950',
        'transition-[transform,box-shadow,opacity] duration-300 ease-out',
        'motion-safe:animate-[va-card-in_0.55s_ease-out_both]',
        isSelected
          ? 'shadow-[0_0_0_2px_var(--color-va-rust),0_24px_60px_-38px_rgb(180_83_9/0.55)]'
          : 'shadow-none ring-1 ring-black/5 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-32px_rgb(16_21_32/0.45)] dark:ring-white/10',
      ].join(' ')}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-pressed={isSelected}
    >
      <ArticleCard article={article} />
    </button>
  )
})
