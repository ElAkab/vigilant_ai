import type { Categorie } from '../../src/types/article'

export type RssSource = {
	id: string;
	label: string;
	url: string;
	categorie: Categorie;
};

// MVP: une poignée de flux stables. Ajuste librement.
export const RSS_SOURCES: RssSource[] = [
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
		id: "le-monde",
		label: "Le Monde",
		url: "https://www.lemonde.fr/international/rss_full.xml",
		categorie: "Géopolitique",
	},
	{
		id: "frandroid",
		label: "Frandroid",
		url: "https://www.frandroid.com/feed",
		categorie: "Tech",
	},
];
