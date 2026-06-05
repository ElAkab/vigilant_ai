import Parser from 'rss-parser'
import { createHash } from 'node:crypto'

import type { Article } from '../../src/types/article'
import type { RssSource } from '../config/sources'
import { HttpError } from './http'

const parser = new Parser()

/** Nombre max d'articles conservés par source (les plus récents) */
const MAX_PER_SOURCE = 640

function stableId(input: string): string {
  return createHash('sha1').update(input).digest('hex').slice(0, 16)
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'vigilant-ai/0.0 (bun)',
        accept: 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1',
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeDate(isoLike: string | undefined): string {
  if (!isoLike) return new Date().toISOString()
  const date = new Date(isoLike)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function extractImageUrl(item: Record<string, unknown>): string | undefined {
  if (item.enclosure) {
    console.log(`[RSS] Enclosure trouvé pour "${item.title}":`, item.enclosure);
    if (item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
      return item.enclosure.url;
    }
  }
  
  const mediaContent = item['media:content'];
  if (mediaContent) {
    console.log(`[RSS] media:content trouvé pour "${item.title}":`, mediaContent);
    if (mediaContent.$ && mediaContent.$.url) return mediaContent.$.url;
    if (mediaContent.url) return mediaContent.url;
  }

  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail) {
    console.log(`[RSS] media:thumbnail trouvé pour "${item.title}":`, mediaThumbnail);
    if (mediaThumbnail.$ && mediaThumbnail.$.url) return mediaThumbnail.$.url;
    if (mediaThumbnail.url) return mediaThumbnail.url;
  }

  const content = item['content:encoded'] || item.content || item.contentSnippet || '';
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) {
    console.log(`[RSS] <img> trouvé dans le contenu pour "${item.title}":`, match[1]);
    return match[1];
  }

  return undefined;
}

export async function fetchRssArticles(source: RssSource): Promise<Article[]> {
  console.log(`[RSS] Fetching ${source.label} (${source.url})...`);
  const res = await fetchWithTimeout(source.url, source.timeoutMs ?? 8_000)
  console.log(`[RSS] Response ${res.status} for ${source.label}`);
  
  if (!res.ok) {
    throw new HttpError(502, 'RSS_BAD_RESPONSE', `Flux RSS indisponible (${res.status}) pour ${source.label}`)
  }

  const xml = await res.text()
  console.log(`[RSS] XML reçu pour ${source.label} (${xml.length} octets)`);

  let feed: Awaited<ReturnType<typeof parser.parseString>>
  try {
    feed = await parser.parseString(xml)
  } catch (err) {
    console.error(`[RSS] Erreur de parsing pour ${source.label}:`, err);
    throw new HttpError(
      502,
      'RSS_PARSE_ERROR',
      `Impossible de parser le flux RSS pour ${source.label}: ${err instanceof Error ? err.message : 'erreur'}`,
    )
  }

  const items = feed.items ?? []
  console.log(`[RSS] ${items.length} articles trouvés pour ${source.label}`);
  
  if (items.length > 0) {
    console.log(`[RSS] Clés de l'item pour ${source.label}:`, Object.keys(items[0]));
    const contentSample = items[0].content || items[0].contentSnippet || '';
    console.log(`[RSS] Extrait contenu pour ${source.label}:`, contentSample.slice(0, 150));
  }

  return items
    .map((item) => {
      const urlSource = item.link?.trim()
      if (!urlSource) return null

      const titre = (item.title ?? '').trim() || 'Sans titre'
      const resume =
        (item.contentSnippet ?? item.summary ?? item.content ?? '').toString().replace(/\s+/g, ' ').trim() ||
        `Résumé indisponible. Source: ${source.label}.`
      const datePublication = normalizeDate(item.isoDate ?? item.pubDate)
      const rawId = (item.guid ?? item.id ?? item.link ?? '') + '|' + source.id
      const imageUrl = extractImageUrl(item)

      return {
        id: stableId(rawId || `${urlSource}|${datePublication}`),
        titre,
        resume,
        datePublication,
        urlSource,
        imageUrl,
        sourceLabel: source.label,
        categorie: source.categorie,
      } satisfies Article
    })
    .filter((x): x is Article => Boolean(x))
    .slice(0, MAX_PER_SOURCE)
}

