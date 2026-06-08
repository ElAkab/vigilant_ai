import type { Categorie } from '../../src/types/article'

export type RssSource = {
	id: string;
	label: string;
	url: string;
	categorie: Categorie;
	timeoutMs?: number; // défaut 8s si non spécifié
};

// Toutes les sources RSS — identiques en dev et en prod.
// Seules la clé API et la DB diffèrent selon APP_ENV.
export const RSS_SOURCES: RssSource[] = [
	// ── Tech ──────────────────────────────────────────────────────────
	{
		id: "openai-blog",
		label: "OpenAI (blog)",
		url: "https://openai.com/blog/rss.xml",
		categorie: "Tech",
	},
	{
		id: "cloudflare-blog",
		label: "Cloudflare",
		url: "https://blog.cloudflare.com/rss/",
		categorie: "Tech",
	},
	{
		id: "frandroid",
		label: "Frandroid",
		url: "https://www.frandroid.com/feed",
		categorie: "Tech",
	},
	{
		id: "the-verge",
		label: "The Verge",
		url: "https://www.theverge.com/rss/index.xml",
		categorie: "Tech",
	},
	{
		id: "ars-technica",
		label: "Ars Technica",
		url: "https://feeds.arstechnica.com/arstechnica/index",
		categorie: "Tech",
	},

	// ── Géopolitique ─────────────────────────────────────────────────
	{
		id: "le-monde",
		label: "Le Monde",
		url: "https://www.lemonde.fr/international/rss_full.xml",
		categorie: "Géopolitique",
	},
	{
		id: "bbc-world",
		label: "BBC World",
		url: "https://feeds.bbci.co.uk/news/world/rss.xml",
		categorie: "Géopolitique",
	},
	{
		id: "france24",
		label: "France 24",
		url: "https://www.france24.com/fr/actualites/rss",
		categorie: "Géopolitique",
	},
	{
		id: "al-jazeera-en",
		label: "Al Jazeera (EN)",
		url: "https://www.aljazeera.com/xml/rss/all.xml",
		categorie: "Géopolitique",
	},
	{
		id: "al-jazeera-ar",
		label: "Al Jazeera (AR)",
		url: "https://www.aljazeera.net/aljazeerarss/rss.aspx?url=rss-news.xml",
		categorie: "Géopolitique",
		timeoutMs: 12_000, // Le flux arabe peut être plus lent
	},

	// ── Jeux vidéo ───────────────────────────────────────────────────
	{
		id: "eurogamer",
		label: "Eurogamer",
		url: "https://www.eurogamer.net/feed",
		categorie: "Jeux vidéo",
	},
	{
		id: "gamekult",
		label: "Gamekult",
		url: "https://www.gamekult.com/feed.xml",
		categorie: "Jeux vidéo",
	},
];
