import { memo, useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/LanguageContext'
import type { Article } from '../types/article'
import { ArticleCard } from './ArticleCard'

type SelectableArticleCardProps = {
  article: Article
  isSelected: boolean
  onGenerateSummary: (article: Article) => void
  styleIndex: number
  // Props pour le résumé inline (expand)
  isExpanded?: boolean
  summary?: string | null
  summaryLoading?: boolean
  summaryError?: string | null
  summaryCached?: boolean
  serverConnected?: boolean
  generationId?: number
  onCollapse?: () => void
}

// ── Rendu Markdown simplifié (même logique que SummaryModal) ──

function renderMarkdown(text: string, showCursor = false) {
  const lines = text.split('\n')
  const cursorHtml =
    '<span class="inline-block w-2 h-4 ml-0.5 bg-va-rust/60 animate-pulse rounded-sm align-middle"></span>'

  let lastContentIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== '') {
      lastContentIdx = i
      break
    }
  }

  const rendered = lines
    .map((line, i) => {
      let processed = line
      processed = processed.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="font-semibold text-va-ink dark:text-[#ede6dc]">$1</strong>',
      )

      let html: string
      if (processed.startsWith('### ')) {
        html = `<h3 class="font-display text-lg font-semibold mt-3 mb-2 text-va-ink dark:text-[#f3eee6]">${processed.slice(4)}</h3>`
      } else if (processed.startsWith('## ')) {
        html = `<h2 class="font-display text-xl font-semibold mt-4 mb-2 text-va-ink dark:text-[#f3eee6]">${processed.slice(3)}</h2>`
      } else if (processed.startsWith('# ')) {
        html = `<h1 class="font-display text-2xl font-semibold mt-5 mb-2 text-va-ink dark:text-[#f3eee6]">${processed.slice(2)}</h1>`
      } else if (
        processed.trim().startsWith('- ') ||
        processed.trim().startsWith('* ')
      ) {
        html = `<li class="ml-4 mb-1 list-disc text-va-ink-soft dark:text-[#d6cec3] text-sm leading-relaxed">${processed.trim().slice(2)}</li>`
      } else if (processed.trim() === '') {
        html = '<div class="h-1.5"></div>'
      } else {
        html = `<p class="mb-2 text-sm leading-relaxed text-va-ink-soft dark:text-[#d6cec3]">${processed}</p>`
      }

      if (i === lastContentIdx && showCursor) {
        html = html.replace(/<\/(\w+)>\s*$/, `${cursorHtml}</$1>`)
      }

      return html
    })
    .join('')

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />
}

// ── Sous-composant : barre de progression inline ──

type InlineLoadingProps = {
  serverConnected: boolean
}

function InlineLoading({ serverConnected }: InlineLoadingProps) {
  const { t } = useT()
  const [rawStage, setRawStage] = useState<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = Date.now()

    const checkStage = () => {
      const elapsed = Date.now() - startRef.current
      if (serverConnected) {
        if (elapsed > 25_000) setRawStage(3)
        else if (elapsed > 8_000) setRawStage(2)
        else if (elapsed > 3_000) setRawStage(1)
      } else {
        if (elapsed > 15_000) setRawStage(3)
        else if (elapsed > 6_000) setRawStage(2)
      }
    }
    checkStage()
    const id = setInterval(checkStage, 2000)
    return () => clearInterval(id)
  }, [serverConnected])

  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-va-mist/30 dark:bg-white/5">
        <div
          className={[
            'h-full rounded-full transition-all duration-1000',
            rawStage === 0
              ? 'w-1/4 bg-va-rust/40'
              : rawStage === 1
                ? 'w-2/5 bg-va-rust/50'
                : rawStage === 2
                  ? 'w-3/5 bg-va-rust/60'
                  : 'w-[85%] bg-red-400/50',
          ].join(' ')}
        />
      </div>
      <span className="shrink-0 text-xs text-va-ink-muted/60 dark:text-[#8f877c]/60">
        {!serverConnected && rawStage <= 1 && t('loading.connecting')}
        {!serverConnected && rawStage === 2 && t('loading.serverSlow')}
        {!serverConnected && rawStage === 3 && t('loading.serverUnreachable')}
        {serverConnected && rawStage === 0 && t('loading.modelStarting')}
        {serverConnected && rawStage === 1 && t('loading.modelWriting')}
        {serverConnected && rawStage === 2 && t('loading.modelSlow')}
        {serverConnected && rawStage === 3 && t('loading.modelLate')}
      </span>
    </div>
  )
}

export const SelectableArticleCard = memo(function SelectableArticleCard({
  article,
  isSelected,
  onGenerateSummary,
  styleIndex,
  isExpanded = false,
  summary = null,
  summaryLoading = false,
  summaryError = null,
  summaryCached = false,
  serverConnected = false,
  generationId = 0,
  onCollapse,
}: SelectableArticleCardProps) {
  const { t } = useT()
  const delayMs = Math.min(styleIndex, 8) * 55

  // Split entre résumé principal et insight (match toute ligne ### 💡 …)
  const INSIGHT_SEPARATOR = /### 💡 [^\n]+\n?/
  const parts = summary ? summary.split(INSIGHT_SEPARATOR) : [summary, '']
  const mainSummary = parts[0]
  const insight = parts[1] ? parts[1].trim() : ''

  const hasContent = summary !== null && summary.length > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isExpanded) return // Ne pas ouvrir l'URL quand le résumé est ouvert
        window.open(article.urlSource, '_blank')
      }}
      onKeyDown={(e) => {
        if (isExpanded) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          window.open(article.urlSource, '_blank')
        }
      }}
      className={[
        'text-left',
        'w-full',
        'block',
        'rounded-[1.15rem]',
        isExpanded
          ? 'cursor-default'
          : 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/70 focus-visible:ring-offset-2 focus-visible:ring-offset-va-paper dark:focus-visible:ring-offset-zinc-950',
        'transition-[transform,box-shadow,opacity] duration-300 ease-out',
        !isExpanded && 'motion-safe:animate-[va-card-in_0.55s_ease-out_both]',
        'shadow-none ring-1 ring-black/5 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-32px_rgb(16_21_32/0.45)] dark:ring-white/10',
      ].join(' ')}
      style={isExpanded ? undefined : { animationDelay: `${delayMs}ms` }}
      aria-pressed={isSelected}
      aria-expanded={isExpanded}
    >
      <ArticleCard article={article} onGenerateSummary={onGenerateSummary} />

      {/* ── Section expand : résumé IA inline ── */}
      {isExpanded && (
        <div
          key={generationId}
          className="border-t border-va-mist/80 px-5 pb-5 pt-3 dark:border-white/10 motion-safe:animate-[content-fade-in_250ms_ease-out_both]"
        >
          {summaryError ? (
            <div className="rounded-xl border border-red-200/90 bg-red-50/95 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/45 dark:text-red-100">
              {summaryError}
            </div>
          ) : (
            <div className="space-y-3">
              {/* En-tête du résumé */}
              <div className="flex items-center justify-between">
                <p className="font-reading text-[11px] font-semibold uppercase tracking-[0.22em] text-va-ink-muted dark:text-[#a9a29a]">
                  {t('summary.title')}
                  {summaryCached && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-va-mist/60 bg-va-mist/20 px-2 py-0.5 text-[9px] font-medium tracking-normal text-va-ink-muted/70 dark:border-white/10 dark:bg-white/5 dark:text-[#8f877c]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-va-teal/60" />
                      {t('summary.cached')}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCollapse?.()
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-va-mist/60 bg-white/70 px-2.5 py-1 font-reading text-[11px] font-medium text-va-ink-muted/70 transition hover:border-black/[0.12] hover:text-va-ink-soft dark:border-white/10 dark:bg-zinc-900/40 dark:text-[#8f877c]/70 dark:hover:border-white/[0.15] dark:hover:text-va-mist"
                >
                  {t('summary.close')}
                </button>
              </div>

              {/* Loading ou contenu */}
              {summaryLoading && !hasContent && (
                <InlineLoading key={generationId} serverConnected={serverConnected} />
              )}

              {hasContent && (
                <div className="motion-safe:animate-[content-fade-in_350ms_ease-out_both]">
                  {renderMarkdown(mainSummary || '', summaryLoading && !insight)}
                </div>
              )}

              {insight && (
                <div
                  className={[
                    'mt-3 p-4 rounded-xl border',
                    'border-va-rust/30 bg-va-rust/5 dark:border-va-rust-bright/30 dark:bg-va-rust-bright/5',
                    summaryCached
                      ? 'motion-safe:animate-[insight-appear_250ms_ease-out_both]'
                      : 'motion-safe:animate-[insight-appear_500ms_ease-out_both]',
                  ].join(' ')}
                >
                  {renderMarkdown(insight)}
                </div>
              )}

              {/* Lien source */}
              {hasContent && (
                <div className="flex justify-end">
                  <a
                    href={article.urlSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center rounded-lg border border-va-mist bg-white/90 px-3 py-1.5 font-reading text-xs font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 focus:outline-none dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist dark:hover:bg-zinc-900/60"
                  >
                    {t('summary.readSource')}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})
