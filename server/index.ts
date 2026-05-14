import { errorResponse } from './lib/http'
import { handleListArticles } from './routes/articles'
import { handleSummarize, handleSummarizeStream } from './routes/summarize'
import { handleGetModelStatus } from './routes/debug'
import { globalAIService } from './lib/aiService'

const port = Number(process.env.PORT ?? '8787')

function route(req: Request): Promise<Response> | Response {
  const url = new URL(req.url)

  if (url.pathname === '/api/articles') return handleListArticles(req)
  if (url.pathname === '/api/summarize') return handleSummarize(req)
  if (url.pathname === '/api/summarize/stream') return handleSummarizeStream(req)
  if (url.pathname === '/api/debug/models') return handleGetModelStatus(req)

  return new Response('Not found', { status: 404 })
}

const server = Bun.serve({
  port,
  async fetch(req: Request) {
    try {
      const started = performance.now()
      const res = await route(req)
      const ms = Math.round(performance.now() - started)

      const url = new URL(req.url)
      console.log(JSON.stringify({ method: req.method, path: url.pathname, status: res.status, ms }))
      return res
    } catch (err) {
      return errorResponse(err)
    }
  },
})

console.log(`API ready: http://localhost:${server.port}`)

