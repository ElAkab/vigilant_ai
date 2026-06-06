import type { Article } from '../types/article'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/useT'

type SummaryModalProps = {
  isOpen: boolean
  onClose: () => void
  article: Article | null
  summary?: string | null       // ← compatibilité v1 (texte brut avec <!-- insight -->)
  summaryMd?: string | null    // ← v2 : synthèse markdown
  insight?: string | null      // ← v2 : note IA
  isLoading: boolean
  error: string | null
  cached?: boolean
  serverConnected?: boolean
  generationId: number
  onRegenerate?: () => void    // ← bouton "Régénérer" dans le footer
}

function renderMarkdown(text: string, showCursor = false) {
  const lines = text.split('\n')
  const cursorHtml = '<span class="inline-block w-2 h-4 ml-0.5 bg-va-rust/60 animate-pulse rounded-sm align-middle"></span>'

  // Repérer la dernière ligne non vide pour y injecter le curseur
  let lastContentIdx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== '') { lastContentIdx = i; break }
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
        html = `<h3 class="font-display text-xl font-semibold mt-4 mb-2 text-va-ink dark:text-[#f3eee6]">${processed.slice(4)}</h3>`
      } else if (processed.startsWith('## ')) {
        html = `<h2 class="font-display text-2xl font-semibold mt-5 mb-2 text-va-ink dark:text-[#f3eee6]">${processed.slice(3)}</h2>`
      } else if (processed.startsWith('# ')) {
        html = `<h1 class="font-display text-3xl font-semibold mt-6 mb-3 text-va-ink dark:text-[#f3eee6]">${processed.slice(2)}</h1>`
      } else if (
        processed.trim().startsWith('- ') ||
        processed.trim().startsWith('* ')
      ) {
        html = `<li class="ml-6 mb-2 list-disc text-va-ink-soft dark:text-[#d6cec3] leading-relaxed">${processed.trim().slice(2)}</li>`
      } else if (processed.trim() === '') {
        html = '<div class="h-2"></div>'
      } else {
        html = `<p class="mb-3 leading-relaxed text-va-ink-soft dark:text-[#d6cec3]">${processed}</p>`
      }

      // Curseur injecté à l'intérieur du dernier bloc de contenu
      if (i === lastContentIdx && showCursor) {
        html = html.replace(/<\/(\w+)>\s*$/, `${cursorHtml}</$1>`)
      }

      return html
    })
    .join('')

  return <div dangerouslySetInnerHTML={{ __html: rendered }} />
}

// ── Sous-composant : barre de progression + messages évolutifs ──

type LoadingIndicatorProps = {
  serverConnected: boolean
}

function LoadingIndicator({ serverConnected }: LoadingIndicatorProps) {
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
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-1 w-48 overflow-hidden rounded-full bg-va-mist/30 dark:bg-white/5">
        <div
          className={[
            "h-full rounded-full transition-all duration-1000",
            rawStage === 0
              ? "w-1/4 bg-va-rust/40"
              : rawStage === 1
                ? "w-2/5 bg-va-rust/50"
                : rawStage === 2
                  ? "w-3/5 bg-va-rust/60"
                  : "w-[85%] bg-red-400/50",
          ].join(" ")}
        />
      </div>
      <span className="text-sm text-va-ink-muted/50 dark:text-[#8f877c]/50">
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

// ── Composant principal ──

export function SummaryModal({
  isOpen,
  onClose,
  article,
  summary,
  summaryMd,
  insight,
  isLoading,
  error,
  cached = false,
  serverConnected = false,
  generationId,
  onRegenerate,
}: SummaryModalProps) {
  const { t } = useT()

  // V2 : props structurées, pas de split nécessaire
  // V1 : fallback sur le split <!-- insight --> du texte brut
  const mainSummary = summaryMd ?? (() => {
    if (!summary) return ''
    const idx = summary.indexOf('<!-- insight -->')
    return idx >= 0 ? summary.slice(0, idx) : summary
  })()
  const insightText = insight ?? (() => {
    if (!summary) return ''
    const idx = summary.indexOf('<!-- insight -->')
    return idx >= 0 ? summary.slice(idx + '<!-- insight -->'.length).trim() : ''
  })()

  const hasContent = (mainSummary && mainSummary.length > 0) || (summary != null && summary.length > 0)

  // Fermer la modale avec Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !article) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.25rem] border border-va-mist/80 bg-[linear-gradient(145deg,rgb(255_255_255/0.95)_0%,rgb(251_246_236/0.9)_100%)] shadow-2xl dark:border-white/10 dark:bg-[linear-gradient(150deg,rgb(29_32_44/0.98)_0%,rgb(18_21_30/0.98)_100%)]">
        {/* En-tête */}
        <div className="flex shrink-0 items-start justify-between border-b border-va-mist/50 p-6 dark:border-white/10">
          <div>
            <p className="font-reading text-[11px] font-semibold uppercase tracking-[0.22em] text-va-ink-muted dark:text-[#a9a29a] mb-2">
              {t('summary.title')}
              {cached && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-va-mist/60 bg-va-mist/20 px-2 py-0.5 text-[9px] font-medium tracking-normal text-va-ink-muted/70 dark:border-white/10 dark:bg-white/5 dark:text-[#8f877c]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-va-teal/60" />
                  {t('summary.cached')}
                </span>
              )}
            </p>
            <h2 className="font-display text-xl font-semibold leading-tight text-va-ink dark:text-[#f3eee6]">
              {article.titre}
            </h2>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex-1 overflow-y-auto p-6 font-reading text-sm">
          {error ? (
            <div className="rounded-xl border border-red-200/90 bg-red-50/95 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/45 dark:text-red-100">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading && !hasContent && (
                <LoadingIndicator
                  key={generationId}
                  serverConnected={serverConnected}
                />
              )}

              {hasContent && (
                <div className="motion-safe:animate-[content-fade-in_350ms_ease-out_both]">
                  {renderMarkdown(mainSummary || '', isLoading && !insightText)}
                </div>
              )}

              {insightText && (
                <div className={[
                  'mt-6 p-5 rounded-xl border',
                  'border-va-rust/30 bg-va-rust/5 dark:border-va-rust-bright/30 dark:bg-va-rust-bright/5',
                  cached
                    ? 'motion-safe:animate-[insight-appear_250ms_ease-out_both]'
                    : 'motion-safe:animate-[insight-appear_500ms_ease-out_both]',
                ].join(' ')}>
                  {renderMarkdown(insightText)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-va-mist/50 p-6 dark:border-white/10">
          <a
            href={article.urlSource}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-va-mist bg-white/90 px-4 py-2.5 font-reading text-sm font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 focus:outline-none dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist dark:hover:bg-zinc-900/60"
          >
            {t('summary.readSource')}
          </a>
          <div className="flex items-center gap-3">
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-va-mist bg-white/90 px-4 py-2.5 font-reading text-sm font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/40 disabled:opacity-40 disabled:pointer-events-none dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist dark:hover:bg-zinc-900/60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                {t('summary.regenerate')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-va-ink px-4 py-2.5 font-reading text-sm font-semibold text-va-paper shadow-[0_14px_34px_-20px_rgb(16_21_32/0.9)] transition hover:-translate-y-0.5 hover:bg-va-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/80 dark:bg-[#f3eee6] dark:text-va-ink dark:hover:bg-white"
            >
              {t('summary.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
