import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import type { Article, Categorie } from '../../src/types/article'

const DB_PATH = 'server/data/articles.db'

let db: Database | null = null

function getDb(): Database {
  if (!db) {
    // Créer le dossier parent si nécessaire
    const dir = DB_PATH.substring(0, DB_PATH.lastIndexOf('/'))
    mkdirSync(dir, { recursive: true })

    db = new Database(DB_PATH)
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA synchronous = NORMAL')
    initSchema()
  }
  return db
}

function initSchema(): void {
  const d = getDb()
  d.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      titre TEXT NOT NULL,
      resume TEXT NOT NULL,
      date_publication TEXT NOT NULL,
      url_source TEXT NOT NULL,
      image_url TEXT,
      source_label TEXT NOT NULL,
      categorie TEXT NOT NULL,
      inserted_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  // Index pour les filtres courants
  d.exec('CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_label)')
  d.exec('CREATE INDEX IF NOT EXISTS idx_articles_categorie ON articles(categorie)')
  d.exec('CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date_publication)')
}

export interface ArticleFilters {
  q?: string
  source?: string
  categorie?: Categorie
  sort?: 'recent' | 'ancien'
  limit?: number
  offset?: number
}

export interface QueryResult {
  items: Article[]
  total: number
}

/**
 * Insère ou remplace une liste d'articles dans la base.
 * Après insertion, applique la rétention : max 640 articles par source.
 */
export function upsertArticles(articles: Article[]): void {
  if (articles.length === 0) return

  const d = getDb()
  const stmt = d.prepare(`
    INSERT OR REPLACE INTO articles (id, titre, resume, date_publication, url_source, image_url, source_label, categorie, inserted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const insertAll = d.transaction((items: Article[]) => {
    for (const a of items) {
      stmt.run(
        a.id,
        a.titre,
        a.resume,
        a.datePublication,
        a.urlSource,
        a.imageUrl ?? null,
        a.sourceLabel ?? 'inconnu',
        a.categorie ?? 'Général',
      )
    }
  })

  insertAll(articles)
  enforceRetention()
}

/**
 * Supprime les articles excédentaires : garde les 640 plus récents par source.
 */
function enforceRetention(): void {
  const d = getDb()
  d.exec(`
    DELETE FROM articles
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY source_label ORDER BY date_publication DESC) as rn
        FROM articles
      ) WHERE rn > 640
    )
  `)
}

/**
 * Requête les articles avec filtres, tri et pagination.
 */
export function queryArticles(filters: ArticleFilters): QueryResult {
  const d = getDb()
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (filters.q) {
    conditions.push('(titre LIKE ? OR resume LIKE ?)')
    const pattern = `%${filters.q}%`
    params.push(pattern, pattern)
  }

  if (filters.source) {
    conditions.push('source_label LIKE ?')
    params.push(`%${filters.source}%`)
  }

  if (filters.categorie) {
    conditions.push('categorie = ?')
    params.push(filters.categorie)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const order = filters.sort === 'ancien' ? 'ASC' : 'DESC'

  // Compter le total
  const countStmt = d.prepare(`SELECT COUNT(*) as cnt FROM articles ${where}`)
  const total = (countStmt.get(...params) as { cnt: number }).cnt

  // Récupérer la page (ou tout si pas de limite)
  const limit = filters.limit
  const offset = filters.offset ?? 0

  let querySql = `
    SELECT id, titre, resume, date_publication, url_source, image_url, source_label, categorie
    FROM articles ${where}
    ORDER BY date_publication ${order}
  `
  const queryParams: (string | number)[] = [...params]

  if (limit !== undefined) {
    querySql += ' LIMIT ? OFFSET ?'
    queryParams.push(limit, offset)
  }

  const queryStmt = d.prepare(querySql)
  const rows = queryStmt.all(...queryParams) as Row[]

  const items: Article[] = rows.map(rowToArticle)

  return { items, total }
}

/**
 * Retourne le nombre total d'articles en base, et le décompte par source.
 */
export function getStats(): { total: number; perSource: Record<string, number> } {
  const d = getDb()
  const total = (d.prepare('SELECT COUNT(*) as cnt FROM articles').get() as { cnt: number }).cnt
  const perSource: Record<string, number> = {}
  const rows = d.prepare('SELECT source_label, COUNT(*) as cnt FROM articles GROUP BY source_label').all() as Array<{ source_label: string; cnt: number }>
  for (const r of rows) {
    perSource[r.source_label] = r.cnt
  }
  return { total, perSource }
}

interface Row {
  id: string
  titre: string
  resume: string
  date_publication: string
  url_source: string
  image_url: string | null
  source_label: string
  categorie: string
}

function rowToArticle(r: Row): Article {
  return {
    id: r.id,
    titre: r.titre,
    resume: r.resume,
    datePublication: r.date_publication,
    urlSource: r.url_source,
    imageUrl: r.image_url ?? undefined,
    sourceLabel: r.source_label,
    categorie: r.categorie as Categorie,
  }
}
