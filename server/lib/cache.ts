export type CacheEntry<V> = {
  value: V
  expiresAt: number
}

export class TTLCache<K, V> {
  private readonly map = new Map<K, CacheEntry<V>>()

  constructor(private readonly defaultTtlMs: number) {}

  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (Date.now() >= entry.expiresAt) {
      this.map.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: K, value: V, ttlMs: number = this.defaultTtlMs): void {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  delete(key: K): void {
    this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  async getOrSet(key: K, fn: () => Promise<V>, ttlMs?: number): Promise<V> {
    const cached = this.get(key)
    if (cached !== undefined) return cached
    const value = await fn()
    this.set(key, value, ttlMs)
    return value
  }
}

