import { memo } from "react";

// ─── Types ────────────────────────────────────────────────────────────

type SandboxHeaderProps = {
  totalArticles?: number;
  loading?: boolean;
};

// ─── Composant ────────────────────────────────────────────────────────

function SandboxHeaderComponent({
  totalArticles = 0,
  loading = false,
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
        <div className="flex min-w-0 items-baseline gap-2 sm:gap-3">
          <h1 className="font-display text-lg font-semibold tracking-[-0.02em] text-va-ink sm:text-xl dark:text-[#f3eee6]">
            Vigilant AI
          </h1>
          <span className="hidden font-reading text-[10px] font-medium uppercase tracking-[0.2em] text-va-ink-muted/70 sm:inline dark:text-[#8f877c]/70">
            Agrégateur · Veille sémantique
          </span>
        </div>

        <div className="flex-1" />

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
          <span className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-va-rust/80 dark:bg-va-rust-bright" />
          <span className="font-reading text-[11px] tabular-nums text-va-ink-muted dark:text-[#a9a29a]">
            {loading ? "…" : totalArticles.toLocaleString("fr-FR")}
          </span>
        </div>
      </div>
    </header>
  );
}

export const SandboxHeader = memo(SandboxHeaderComponent);
