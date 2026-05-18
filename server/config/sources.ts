export type RssSource = {
  id: string
  label: string
  url: string
}

// MVP: une poignée de flux stables. Ajuste librement.
export const RSS_SOURCES: RssSource[] = [
  {
    id: 'openai-blog',
    label: 'OpenAI (blog)',
    url: 'https://openai.com/blog/rss.xml',
  },
  {
    id: 'cloudflare-blog',
    label: 'Cloudflare (blog)',
    url: 'https://blog.cloudflare.com/rss/',
  },
  {
    id: 'hn-frontpage',
    label: 'Hacker News (frontpage)',
    url: 'https://hnrss.org/frontpage',
  },
  {
    id: 'le-monde-intl',
    label: 'Le Monde (International)',
    url: 'https://www.lemonde.fr/international/rss_full.xml',
  },
  {
    id: 'frandroid',
    label: 'Frandroid',
    url: 'https://www.frandroid.com/feed',
  },
]

