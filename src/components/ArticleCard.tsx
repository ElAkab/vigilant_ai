import { memo } from 'react'

import { safeHostname } from '../lib/url'
import type { Article } from '../types/article'

type ArticleCardProps = {
  article: Article
}

function ArticleCardComponent({ article }: ArticleCardProps) {
  const date = new Date(article.datePublication)
  const dateAffichee = Number.isNaN(date.getTime())
    ? article.datePublication
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date)

  const host = safeHostname(article.urlSource)

  return (
    <article className="group/card relative isolate overflow-hidden rounded-2xl border border-va-mist/80 bg-[linear-gradient(125deg,var(--color-va-paper)_0%,rgb(255_255_255/0.88)_54%,rgb(251_246_236/0.96)_100%)] p-px shadow-[0_1px_0_rgb(255_255_255/0.65)_inset,0_18px_50px_-32px_rgb(28_36_53/0.35)] transition-[transform,box-shadow,border-color] duration-300 ease-out dark:border-white/10 dark:bg-[linear-gradient(140deg,rgb(24_27_37)_0%,rgb(23_26_38/0.95)_52%,rgb(18_21_34/1)_100%)] dark:shadow-[0_1px_0_rgb(255_255_255/0.06)_inset,0_22px_60px_-40px_rgb(0_0_0/0.75)]">
      <div className="pointer-events-none absolute -left-24 top-16 h-40 w-64 rotate-[-18deg] rounded-full bg-va-rust/12 blur-3xl transition-opacity duration-500 group-hover/card:opacity-90 dark:bg-va-rust-bright/14" />
      <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full bg-va-teal/10 blur-2xl dark:bg-va-teal/15" />

      <div className="relative flex h-full flex-col gap-4 rounded-[0.9rem] bg-white/70 p-5 backdrop-blur-[2px] dark:bg-zinc-950/55">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-va-mist/90 bg-va-paper-deep/60 px-2 py-0.5 font-reading text-[11px] font-semibold uppercase tracking-[0.18em] text-va-ink-muted dark:border-white/10 dark:bg-white/5 dark:text-[#c9c0b3]">
                #{article.id}
              </span>
              {host ? (
                <span className="font-reading text-[11px] font-medium text-va-ink-muted dark:text-[#a9a29a]">
                  {host}
                </span>
              ) : null}
            </div>

            <h3 className="font-display text-lg font-semibold leading-snug tracking-[-0.02em] text-va-ink md:text-xl dark:text-[#f3eee6]">
              {article.titre}
            </h3>

            <p className="font-reading text-sm text-va-ink-muted dark:text-[#b8b0a5]">
              Publié le{' '}
              <time dateTime={article.datePublication} className="font-semibold text-va-ink-soft dark:text-[#e4dcd1]">
                {dateAffichee}
              </time>
            </p>
          </div>

          <span
            aria-hidden="true"
            className="mt-1 hidden h-14 w-1 shrink-0 rounded-full bg-linear-to-b from-va-rust via-va-rust-bright to-va-teal opacity-90 shadow-[0_0_0_1px_rgb(255_255_255/0.35)] sm:block"
          />
        </div>

        <p className="line-clamp-3 font-reading text-sm leading-relaxed text-va-ink-soft dark:text-[#d6cec3]">
          {article.resume}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-va-mist/70 pt-4 dark:border-white/10">
          <a
            href={article.urlSource}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-va-ink px-3.5 py-2 font-reading text-sm font-semibold text-va-paper shadow-[0_12px_30px_-18px_rgb(16_21_32/0.85)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-va-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust-bright/80 dark:bg-[#f3eee6] dark:text-va-ink dark:hover:bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            Lire la source
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-200 group-hover/card:translate-x-0.5"
            >
              →
            </span>
          </a>

          <span className="font-reading text-xs text-va-ink-muted dark:text-[#8f877c]">
            Veille sémantique
          </span>
        </div>
      </div>
    </article>
  )
}

export const ArticleCard = memo(ArticleCardComponent)
