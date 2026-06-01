import { handleSummarize } from '../../server/routes/summarize'
import { errorResponse } from '../../server/lib/http'

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleSummarize(req)
  } catch (err) {
    return errorResponse(err)
  }
}
