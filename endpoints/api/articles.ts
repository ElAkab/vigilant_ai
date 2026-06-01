import { handleListArticles } from '../../server/routes/articles'
import { errorResponse } from '../../server/lib/http'

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleListArticles(req)
  } catch (err) {
    return errorResponse(err)
  }
}
