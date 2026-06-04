import { memo } from "react";

import { safeHostname } from "../lib/url";
import type { Article } from "../types/article";

type ArticleCardProps = {
	article: Article;
	onGenerateSummary?: (article: Article) => void;
};

function ArticleCardComponent({
	article,
	onGenerateSummary,
}: ArticleCardProps) {
	const date = new Date(article.datePublication);
	const dateAffichee = Number.isNaN(date.getTime())
		? article.datePublication
		: new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);

	const host = safeHostname(article.urlSource);

	return (
		<article className="group/card relative isolate overflow-hidden rounded-2xl border border-black/[0.04] bg-white/70 p-5 shadow-[0_1px_0_rgb(0_0_0/0.03)_inset,0_8px_24px_-16px_rgb(0_0_0/0.08)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-black/[0.08] hover:shadow-[0_1px_0_rgb(0_0_0/0.04)_inset,0_16px_32px_-20px_rgb(0_0_0/0.12)] dark:border-white/[0.06] dark:bg-zinc-900/60 dark:shadow-[0_1px_0_rgb(255_255_255/0.03)_inset,0_8px_24px_-16px_rgb(0_0_0/0.5)] dark:hover:border-white/[0.1] dark:hover:shadow-[0_1px_0_rgb(255_255_255/0.04)_inset,0_16px_32px_-20px_rgb(0_0_0/0.65)]">

			<div className="flex h-full flex-col gap-4">
				{article.imageUrl ? (
					<div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl border border-va-mist/50 dark:border-white/10">
						<img
							src={article.imageUrl}
							alt=""
							className="h-full w-full object-cover"
							loading="lazy"
						/>
					</div>
				) : (
					<div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-va-rust/15 to-va-teal/15 dark:from-va-rust/10 dark:to-va-teal/10 flex items-center justify-center border border-va-mist/30 dark:border-white/5">
						<span className="font-display text-base font-semibold tracking-wide text-va-ink-soft dark:text-[#d6cec3]">
							{article.sourceLabel || host || "Source"}
						</span>
					</div>
				)}
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-2">
						<h3 className="font-display text-lg font-semibold leading-snug tracking-[-0.02em] text-va-ink md:text-xl dark:text-[#f3eee6]">
							{article.titre}
						</h3>

						<hr className="border-va-mist/50 dark:border-white/10 my-2" />
					</div>
				</div>

				<p className="line-clamp-6 -mt-3 font-reading text-sm leading-relaxed text-va-ink-soft dark:text-[#d6cec3]">
					{article.resume}
				</p>

				<div className="mt-auto border-t border-va-mist/70 pt-4 dark:border-white/10">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex flex-col gap-1">
							<span className="font-reading text-xs text-va-ink-muted dark:text-[#8f877c]">
								{article.sourceLabel || "Veille sémantique"}
							</span>
							<p className="font-reading text-xs text-va-ink-muted dark:text-[#b8b0a5]">
								Publié le{" "}
								<time
									dateTime={article.datePublication}
									className="font-semibold text-va-ink-soft dark:text-[#e4dcd1]"
								>
									{dateAffichee}
								</time>
							</p>
						</div>
						<div className="flex gap-2">
							{onGenerateSummary && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onGenerateSummary(article);
								}}
								className="inline-flex items-center justify-center gap-2 rounded-xl bg-va-ink px-5 py-2.5 font-reading text-sm font-semibold text-va-paper shadow-[0_12px_30px_-18px_rgb(16_21_32/0.85)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-va-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-va-rust-bright/80 dark:bg-[#f3eee6] dark:text-va-ink dark:hover:bg-white"
							>
								✨ Synthèse IA
							</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}

export const ArticleCard = memo(ArticleCardComponent);
