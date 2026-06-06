import { handleTranslate } from '../../server/routes/translate'
import { errorResponse } from '../../server/lib/http'

export default async function handler(req: Request): Promise<Response> {
  try {
    return await handleTranslate(req)
  } catch (err) {
    return errorResponse(err)
  }
}
