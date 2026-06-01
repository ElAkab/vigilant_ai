export default function handler(): Response {
  return new Response(
    JSON.stringify({ status: 'ok', runtime: 'node', timestamp: Date.now() }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
