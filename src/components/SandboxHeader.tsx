import { memo } from "react"
import { useT } from "../i18n/useT"
import { LANGS, LANG_LABELS, type Lang } from "../i18n/types"
import { selectBase } from "./SearchBar"

// ─── Types ────────────────────────────────────────────────────────────

type SandboxHeaderProps = {
	totalArticles?: number
	loading?: boolean
	newCount?: number
	onBadgeClick?: () => void
}

// ─── Composant ────────────────────────────────────────────────────────

function SandboxHeaderComponent({
	totalArticles = 0,
	loading = false,
	newCount = 0,
	onBadgeClick,
}: SandboxHeaderProps) {
	const { t, lang, setLang } = useT()

	return (
		<header
			className={[
				"sticky top-0 z-50 h-14",
				"border-b border-black/[0.05]",
				"bg-white/65 backdrop-blur-xl backdrop-saturate-150",
				"dark:border-white/[0.06] dark:bg-zinc-950/70",
			].join(" ")}
		>
			<div className="mx-auto flex h-full max-w-6xl items-center gap-3 px-4 sm:gap-4">
				{/* ── Logo ── */}
				<img
					src="/vigilan-ai.png"
					alt="Vigilant AI"
					className={[
						"h-8 w-8 flex-shrink-0 rounded-lg object-cover",
						"ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
						"transition-all duration-300",
						"hover:scale-105 hover:ring-black/[0.12] dark:hover:ring-white/[0.15]",
					].join(" ")}
				/>

				{/* ── Texte marque ── */}
				<div className="flex w-full min-w-0 items-baseline gap-2 sm:gap-3">
					<h1 className="font-display text-lg font-semibold tracking-[-0.02em] text-va-ink sm:text-xl dark:text-[#f3eee6]">
						Vigilant AI
					</h1>
					<span className="hidden font-reading text-[10px] font-medium uppercase tracking-[0.2em] mx-auto text-va-ink-muted/60 sm:inline dark:text-[#8f877c]/60">
						{t('header.subtitle')}
					</span>
				</div>

				{/* ── Badge nouveaux articles ── */}
				{newCount > 0 && (
					<button
						type="button"
						onClick={onBadgeClick}
						className="motion-safe:animate-[badge-pop-in_400ms_ease-out_both] inline-flex items-center gap-1.5 rounded-full bg-va-rust/90 px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_14px_-6px_rgb(200_70_30/0.55)] transition hover:bg-va-rust hover:scale-105"
					>
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
						+{newCount}
					</button>
				)}

				{/* ── Compteur articles ── */}
				{totalArticles > 0 && (
					<span className="hidden sm:inline-flex items-center gap-1 font-reading text-[11px] font-medium tabular-nums text-va-ink-muted/60 dark:text-[#8f877c]/60">
						{loading ? (
							<span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-va-mist/60 border-t-va-rust/70" />
						) : (
							<span className="inline-block h-2 w-2 rounded-full bg-va-teal/60" />
						)}
						{totalArticles}
					</span>
				)}

				{/* ── Language Switcher ── */}
				<div className="relative flex-shrink-0 min-w-[4.5rem]">
					<select
						value={lang}
						onChange={(e) => setLang(e.target.value as Lang)}
						className={`${selectBase} w-full`}
						title={t('lang.switcher')}
					>
						{LANGS.map((l) => (
							<option key={l} value={l}>
								{LANG_LABELS[l]}
							</option>
						))}
					</select>
					<svg
						className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-va-ink-muted/50"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
					</svg>
				</div>
			</div>
		</header>
	)
}

export const SandboxHeader = memo(SandboxHeaderComponent)
