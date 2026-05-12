import Parser from 'rss-parser'
import { createHash } from 'node:crypto'

import type { Article } from '../../src/types/article'
import type { RssSource } from '../config/sources'
import { HttpError } from './http'

const parser = new Parser()

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

export async function fetchRssArticles(source: RssSource): Promise<Article[]> {
  const res = await fetchWithTimeout(source.url, 12_000)
  if (!res.ok) {
    throw new HttpError(502, 'RSS_BAD_RESPONSE', `Flux RSS indisponible (${res.status}) pour ${source.label}`)
  }

  const xml = await res.text()

  let feed: Awaited<ReturnType<typeof parser.parseString>>
  try {
    feed = await parser.parseString(xml)
  } catch (err) {
    throw new HttpError(
      502,
      'RSS_PARSE_ERROR',
      `Impossible de parser le flux RSS pour ${source.label}: ${err instanceof Error ? err.message : 'erreur'}`,
    )
  }

  const items = feed.items ?? []

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

      return {
        id: stableId(rawId || `${urlSource}|${datePublication}`),
        titre,
        resume,
        datePublication,
        urlSource,
      } satisfies Article
    })
    .filter((x): x is Article => Boolean(x))
}

