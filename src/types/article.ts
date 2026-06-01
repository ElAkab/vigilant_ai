export type Article = {
  id: string
  titre: string
  resume: string
  datePublication: string
  urlSource: string
  imageUrl?: string
  sourceLabel?: string
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

