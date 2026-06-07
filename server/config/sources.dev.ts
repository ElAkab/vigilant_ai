/**
 * Sources RSS pour l'environnement de développement.
 * Un sous-ensemble réduit pour tester sans consommer de crédits/temps.
 * Chargé quand APP_ENV=development.
 */

import type { Categorie } from '../../src/types/article'

export type RssSource = {
	id: string;
	label: string;
	url: string;
	categorie: Categorie;
	timeoutMs?: number;
};

export const RSS_SOURCES_DEV: RssSource[] = [
	// ── Tech (2 sources rapides) ────────────────────────────
	{
		id: "openai-blog",
		label: "OpenAI (blog)",
		url: "https://openai.com/blog/rss.xml",
		categorie: "Tech",
	},
	{
		id: "the-verge",
		label: "The Verge",
		url: "https://www.theverge.com/rss/index.xml",
		categorie: "Tech",
	},

	// ── Géopolitique (1 source) ─────────────────────────────
	{
		id: "le-monde",
		label: "Le Monde",
		url: "https://www.lemonde.fr/international/rss_full.xml",
		categorie: "Géopolitique",
	},
];
