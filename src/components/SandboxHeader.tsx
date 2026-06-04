import { memo } from "react";

// ─── Types ────────────────────────────────────────────────────────────

type SandboxHeaderProps = {
	totalArticles?: number;
	loading?: boolean;
	newCount?: number;
	onBadgeClick?: () => void;
};

// ─── Composant ────────────────────────────────────────────────────────

function SandboxHeaderComponent({
	totalArticles = 0,
	loading = false,
	newCount = 0,
	onBadgeClick,
}: SandboxHeaderProps) {
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
						Agrégateur · Veille sémantique
					</span>
				</div>

				<div className="flex-1" />

				{/* ── Badge nouveaux articles ── */}
				{newCount > 0 && (
					<button
						type="button"
						onClick={onBadgeClick}
						className={[
							"flex flex-shrink-0 items-center gap-1.5",
							"rounded-full px-2.5 py-1",
							"bg-va-rust/12 border border-va-rust/20",
							"dark:bg-va-rust/15 dark:border-va-rust/25",
							"font-reading text-[10px] font-semibold tabular-nums",
							"text-va-rust dark:text-va-rust-bright",
							"animate-[badge-pop-in_400ms_ease-out]",
							"transition hover:bg-va-rust/20 dark:hover:bg-va-rust/25",
							"cursor-pointer",
						].join(" ")}
						title={`${newCount} nouvel article${newCount > 1 ? "les" : ""} — cliquer pour ignorer`}
					>
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-va-rust dark:bg-va-rust-bright" />
						{newCount}
					</button>
				)}

				{/* ── Stats pill ── */}
				<div
					className={[
						"flex flex-shrink-0 items-center gap-2",
						"rounded-full border border-black/[0.04]",
						"bg-black/[0.015] px-3 py-1.5",
						"dark:border-white/[0.06] dark:bg-white/[0.025]",
						"transition-colors duration-300",
					].join(" ")}
				>
					<span
						className={[
							"inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full",
							totalArticles > 1
								? "bg-green-500/80 dark:bg-green-400/80"
								: "bg-va-rust/80 dark:bg-va-rust-bright",
						].join(" ")}
					/>
					<span className="font-reading text-[11px] tabular-nums text-va-ink-muted dark:text-[#a9a29a]">
						{loading ? "…" : totalArticles.toLocaleString("fr-FR")}
					</span>
				</div>
			</div>
		</header>
	);
}

export const SandboxHeader = memo(SandboxHeaderComponent);
