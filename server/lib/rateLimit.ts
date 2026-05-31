type Bucket = {
  remaining: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function now() {
  return Date.now()
}

export type RateLimitConfig = {
  keyPrefix: string
  windowMs: number
  max: number
}

export function getClientIp(req: Request): string {
  const header = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const candidate = header.split(',')[0]?.trim()
  return candidate || 'unknown'
}

export function checkRateLimit(req: Request, cfg: RateLimitConfig): { ok: true } | { ok: false; retryAfterMs: number } {
  const ip = getClientIp(req)
  const key = `${cfg.keyPrefix}:${ip}`
  const t = now()

  const existing = buckets.get(key)
  if (!existing || t >= existing.resetAt) {
    buckets.set(key, { remaining: cfg.max - 1, resetAt: t + cfg.windowMs })
    return { ok: true }
  }

  if (existing.remaining <= 0) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - t) }
  }

  existing.remaining -= 1
  return { ok: true }
}

