export type Categorie = 'Tech' | 'Géopolitique' | 'Jeux vidéo' | 'Général'

export type Article = {
  id: string
  titre: string
  resume: string
  datePublication: string
  urlSource: string
  imageUrl?: string
  sourceLabel?: string
  categorie?: Categorie | ''
}

export type ArticleQueryParams = {
  limit?: number
  offset?: number
  q?: string
  source?: string
  categorie?: Categorie | ''
  sort?: 'recent' | 'ancien'
}

export interface PaginatedArticles {
  items: Article[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  meta?: {
    sourceCount?: number
    errors?: Array<{ sourceId: string; message: string }>
  }
}

