import type { Article } from '../types/article'
import { useEffect, useState } from 'react'

type SummaryModalProps = {
  isOpen: boolean
  onClose: () => void
  article: Article | null
  summary: string | null
  isLoading: boolean
  error: string | null
}

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const rendered = lines.map((line) => {
    let processed = line
    // Gras
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-va-ink dark:text-[#ede6dc]">$1</strong>')
    
    // Titres (###)
    if (processed.startsWith('### ')) {
      return `<h3 class="font-display text-xl font-semibold mt-4 mb-2 text-va-ink dark:text-[#f3eee6]">${processed.slice(4)}</h3>`
    }
    
    // Titres (##)
    if (processed.startsWith('## ')) {
      return `<h2 class="font-display text-2xl font-semibold mt-5 mb-2 text-va-ink dark:text-[#f3eee6]">${processed.slice(3)}</h2>`
    }

    // Titres (#)
    if (processed.startsWith('# ')) {
      return `<h1 class="font-display text-3xl font-semibold mt-6 mb-3 text-va-ink dark:text-[#f3eee6]">${processed.slice(2)}</h1>`
    }
    
    // Puces (- ou *)
    if (processed.trim().startsWith('- ') || processed.trim().startsWith('* ')) {
      return `<li class="ml-6 mb-2 list-disc text-va-ink-soft dark:text-[#d6cec3] leading-relaxed">${processed.trim().slice(2)}</li>`
    }
    
    // Ligne vide
    if (processed.trim() === '') {
      return '<div class="h-2"></div>'
    }
    
    return `<p class="mb-3 leading-relaxed text-va-ink-soft dark:text-[#d6cec3]">${processed}</p>`
  }).join('')
  
  return <div dangerouslySetInnerHTML={{ __html: rendered }} />
}

export function SummaryModal({
  isOpen,
  onClose,
  article,
  summary,
  isLoading,
  error,
}: SummaryModalProps) {
  const [showInsight, setShowInsight] = useState(false)

  // Split summary into main text and insight
  const parts = summary ? summary.split(/### 💡 L'avis(?: d'InsightStream)?/) : [summary, ""]
  const mainSummary = parts[0]
  // On masque le titre de l'avis mais on garde le contenu
  const insight = parts[1] ? parts[1].replace(/^ d'InsightStream/, '').trim() : ""

  // Gère l'apparition différée de l'avis
  useEffect(() => {
    if (!isLoading && summary && insight) {
      const timer = setTimeout(() => setShowInsight(true), 1500) // 1.5 seconde de délai
      return () => clearTimeout(timer)
    }
  }, [isLoading, summary, insight])

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
      {/* Overlay sombre avec flou */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Contenu de la modale */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.25rem] border border-va-mist/80 bg-[linear-gradient(145deg,rgb(255_255_255/0.95)_0%,rgb(251_246_236/0.9)_100%)] shadow-2xl dark:border-white/10 dark:bg-[linear-gradient(150deg,rgb(29_32_44/0.98)_0%,rgb(18_21_30/0.98)_100%)]">
        
        {/* En-tête */}
        <div className="flex shrink-0 items-start justify-between border-b border-va-mist/50 p-6 dark:border-white/10">
          <div>
            <p className="font-reading text-[11px] font-semibold uppercase tracking-[0.22em] text-va-ink-muted dark:text-[#a9a29a] mb-2">
              Résumé IA
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
          ) : summary ? (
            <div className="space-y-4">
              {/* Synthèse principale */}
              {renderMarkdown(mainSummary || '')}
              
              {/* Bloc Avis d'InsightStream avec animation */}
              {insight && (
                <div 
                  className={[
                    'mt-6 p-5 rounded-xl border transition-all duration-1000 ease-out transform',
                    'border-va-rust/30 bg-va-rust/5 dark:border-va-rust-bright/30 dark:bg-va-rust-bright/5',
                    showInsight 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-4 scale-98 pointer-events-none'
                  ].join(' ')}
                >
                  {renderMarkdown(insight)}
                </div>
              )}

              {/* Loader pendant le streaming si l'avis n'est pas encore là */}
              {isLoading && (
                <div className="flex items-center space-x-2 py-4 text-va-ink-muted dark:text-[#a9a29a]">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-va-rust/70" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-va-rust/70" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-va-rust/70" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center space-x-2 py-12 text-va-ink-muted dark:text-[#a9a29a]">
              <div className="h-4 w-4 animate-bounce rounded-full bg-va-rust/70" style={{ animationDelay: '0ms' }} />
              <div className="h-4 w-4 animate-bounce rounded-full bg-va-rust/70" style={{ animationDelay: '150ms' }} />
              <div className="h-4 w-4 animate-bounce rounded-full bg-va-rust/70" style={{ animationDelay: '300ms' }} />
            </div>
          ) : null}
        </div>

        {/* Pied de page avec actions */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-va-mist/50 p-6 dark:border-white/10">
          <a
            href={article.urlSource}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-va-mist bg-white/90 px-4 py-2.5 font-reading text-sm font-semibold text-va-ink-soft transition hover:border-va-rust/40 hover:bg-va-paper-deep/50 focus:outline-none dark:border-white/15 dark:bg-zinc-950/40 dark:text-va-mist dark:hover:bg-zinc-900/60"
          >
            Lire la source complète
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-va-ink px-4 py-2.5 font-reading text-sm font-semibold text-va-paper shadow-[0_14px_34px_-20px_rgb(16_21_32/0.9)] transition hover:-translate-y-0.5 hover:bg-va-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust/80 dark:bg-[#f3eee6] dark:text-va-ink dark:hover:bg-white"
          >
            Ah ok..
          </button>
        </div>
      </div>
    </div>
  )
}
