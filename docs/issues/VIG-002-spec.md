# VIG-002 — Fiabilité des résumés IA (>95% succès)

> **Date :** 2026-06-01
> **Statut :** ⏳ Spécification — en attente de validation
> **Modèle recommandé :** `claude-sonnet-4`
> **Estimation :** 2-3 jours

---

## 🔍 Diagnostic préalable (audit du code existant)

Avant de coder, on a audité l'architecture actuelle :

```
┌─────────────────────────────────────────────────────────────┐
│ Client (useArticleSummary.ts)                                │
│ ─────────────────────────────────────────────────────────── │
│ ✅ Retry : MAX_RETRIES=2, délai 1.5s entre tentatives       │
│ ✅ Fallback : stream → non-stream si erreur                │
│ ✅ AbortController : nettoyé au reset()                    │
│ ✅ Cache sessionStorage : lu avant l'appel réseau          │
│ ⚠️  Pas de logging côté client (impossible de savoir       │
│     POURQUOI ça échoue sans ouvrir la console)              │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/summarize/stream
┌───────────────────────────┴─────────────────────────────────┐
│ Serveur (summarize.ts → handleSummarizeStream)              │
│ ─────────────────────────────────────────────────────────── │
│ ❌ AUCUN retry : si generateContentStream() échoue → erreur │
│ ✅ Rate limiting : 12 req / 5 min                          │
│ ✅ Validation payload                                      │
│ ✅ Cache LRU (100 entrées) — cache hit = instantané        │
│ ✅ SSE propre (chunk/done/error events)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ globalAIService.generateContentStream()
┌───────────────────────────┴─────────────────────────────────┐
│ aiService.ts — generateContentStream()                      │
│ ─────────────────────────────────────────────────────────── │
│ ❌ UN SEUL modèle essayé (vs generateContent() qui les      │
│    cycle tous)                                              │
│ ✅ Timeout 30s sur fetch()                                  │
│ ⚠️  Pas de retry sur 429 (rate limit OpenRouter)           │
│ ⚠️  Pas de retry sur 503 (service unavailable)             │
│ ✅ Log console de l'échec par modèle                       │
└─────────────────────────────────────────────────────────────┘
```

### Hypothèses sur les causes racines des 50% d'échecs

| # | Hypothèse | Probabilité | Indice |
|---|-----------|-------------|--------|
| 1 | Timeout 30s trop court (modèles gratuits lents) | 🔴 Élevée | `fetchWithTimeout` fixé à 30s, pas de retry |
| 2 | Un seul modèle essayé en streaming (pas de fallback) | 🔴 Élevée | `generateContentStream` n'essaie qu'un modèle |
| 3 | Rate limit OpenRouter (429) non retryé | 🟡 Moyenne | Pas de logique 429 dans le code |
| 4 | Erreur réseau transitoire (DNS, TCP) | 🟢 Faible | Mais aggravée par l'absence de retry serveur |
| 5 | AbortController client annule prématurément | 🟢 Faible | Le hook gère déjà les `AbortError` |

**Conclusion :** Le problème principal est que `generateContentStream()` n'essaie qu'UN seul modèle sans retry. Si ce modèle timeout ou échoue → erreur remontée au client. Le client retry côté hook, mais il re-fait le même appel qui échouera pour la même raison. C'est un bug architectural.

---

## 📐 Solution proposée : Option D (retry exponentiel + logging structuré)

### Stratégie en 3 niveaux

```
Niveau 1 — aiService.ts
    Retry exponentiel par modèle (1s → 2s → 4s, backoff jitter)
    + Fallback multi-modèles (comme generateContent() le fait déjà)
    + Timeout augmenté à 45s pour le premier essai

Niveau 2 — summarize.ts
    Le retry est dans aiService, summarize devient un simple proxy
    Logging structuré : chaque appel est loggé avec {id, durée, succès/échec, modèle}

Niveau 3 — useArticleSummary.ts
    Inchangé (a déjà 2 retries + cache)
    Ajouter logging client (console.warn) pour diagnostic
```

### Pourquoi ne pas faire le fallback multi-modèles complet (Option B) maintenant ?

Parce qu'on ne sait pas encore quels modèles échouent. Le logging structuré nous donnera les données pour décider :
- Si c'est toujours le même modèle qui timeout → on le retire de la rotation
- Si c'est du rate limiting → on augmente le backoff
- Si c'est du réseau → on ajoute plus de retry

---

## 📁 Fichiers modifiés

### 1. `server/lib/aiService.ts` — ⭐ Changement principal

**Fonctions modifiées :**
- `generateContentStream()` — ajout fallback multi-modèles (comme `generateContent()`) + retry
- `callOpenRouterStream()` — timeout paramétrable, retry sur 429/503
- Nouveau : `withRetry<T>()` — helper générique de retry exponentiel
- Nouveau : `logger` — logging structuré

**Pseudo-code :**

```typescript
// Nouveau helper retry exponentiel
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; baseDelayMs: number; shouldRetry: (err: Error) => boolean }
): Promise<T> {
  let lastError: Error
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error
      if (attempt === options.maxRetries || !options.shouldRetry(lastError)) throw lastError
      const delay = options.baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5)
      console.warn(`[AI] Retry ${attempt + 1}/${options.maxRetries} in ${Math.round(delay)}ms: ${lastError.message}`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError!
}

// generateContentStream — ajout fallback multi-modèles
async generateContentStream(prompt: string): Promise<{ stream: ... }> {
  await this.ensureModelsLoaded()
  if (this.mockMode) return this.generateMockContentStream(prompt)

  const attempts = this.models.length
  let lastError: Error | null = null

  for (let i = 0; i < attempts; i++) {
    const model = this.models[this.currentModelIndex]
    const startedAt = Date.now()
    try {
      const stream = await withRetry(
        () => this.callOpenRouterStream(model, prompt),
        { maxRetries: 2, baseDelayMs: 1000, shouldRetry: (err) => isRetryable(err) }
      )
      console.log(`[AI] ✅ ${model.id} — ${Date.now() - startedAt}ms`)
      this.currentModelIndex = 0
      return { stream: /* wrap stream */ }
    } catch (err) {
      lastError = err as Error
      console.error(`[AI] ❌ ${model.id} — ${Date.now() - startedAt}ms — ${lastError.message}`)
      this.recordFailure(model.id, lastError.message)
      this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length
    }
  }
  throw new HttpError(502, "AI_SERVICE_ERROR", `All models failed: ${lastError?.message}`)
}

// Helper : quelles erreurs sont retryable ?
function isRetryable(err: Error): boolean {
  const msg = err.message.toLowerCase()
  return msg.includes("429") || msg.includes("503") || msg.includes("timeout") || msg.includes("econnrefused")
}
```

### 2. `server/routes/summarize.ts` — Changements mineurs

- `handleSummarize()` (non-stream) : déjà couvert par `generateContent()` qui a le fallback ✅
- `handleSummarizeStream()` : le retry est maintenant dans aiService → summarize devient transparent
- Ajout log au niveau route : `console.log(`[Summarize] ${article.id} → ${duration}ms`)`

### 3. `server/lib/cache.ts` — Pas modifié ✅

Le cache TTLCache existant est suffisant. Pas besoin de `isStale()` pour l'instant (ça viendra dans VIG-004).

### 4. `src/hooks/useArticleSummary.ts` — Changements mineurs

- Ajout `console.warn` en cas d'échec après retries clients
- L'état `error` affiche déjà un message à l'utilisateur ✅

### 5. `server/lib/http.ts` — Pas modifié ✅

---

## 🐛 Bugs corrigés au passage

| Bug | Fichier | Correction |
|-----|---------|------------|
| `generateContentStream` n'a pas de fallback multi-modèles | `aiService.ts` | Ajout boucle for identique à `generateContent()` |
| Timeout 30s trop court pour modèles gratuits | `aiService.ts` | Premier essai 45s, retries 30s |
| Pas de retry sur 429/503 transitoires | `aiService.ts` | `withRetry()` avec `isRetryable()` |
| Erreurs silencieuses (pas de log structuré) | `aiService.ts` + `summarize.ts` | Log avec durée, modèle, succès/échec |

---

## 🧪 Tests manuels

### Test 1 — Nominal (succès au premier essai)
1. Cliquer sur un article du fil
2. ✅ Le résumé apparaît en streaming <8s
3. ✅ La console serveur affiche : `[AI] ✅ google/gemini-flash — 3200ms`

### Test 2 — Edge (timeout premier modèle, succès fallback)
1. Simuler ou attendre que le premier modèle timeout
2. ✅ Le système essaie le modèle suivant automatiquement
3. ✅ La console affiche : `[AI] ❌ google/gemini-flash — 45000ms — timeout` puis `[AI] ✅ meta-llama/llama-3.3 — 2800ms`
4. ✅ L'utilisateur voit le résumé, n'a pas conscience du fallback

### Test 3 — Edge (rate limit 429, retry réussi)
1. Déclencher un 429 (requêtes trop rapprochées)
2. ✅ Le système retry après 1-2s avec backoff
3. ✅ Console : `[AI] Retry 1/2 in 1200ms: 429 Too Many Requests`
4. ✅ Résumé affiché au 2e essai

### Test 4 — Edge (tous les modèles échouent)
1. Déconnecter le VPS d'Internet OU tous les modèles indisponibles
2. ✅ Après 3 tentatives × N modèles → erreur remontée au client
3. ✅ Message utilisateur : "Échec du résumé après plusieurs tentatives"
4. ✅ Console serveur : `[AI] ❌ [model1]`, `[AI] ❌ [model2]`, `[AI] ❌ [model3]` puis `All models failed`

### Test 5 — Regression (streaming non affecté)
1. Le streaming continue de fonctionner normalement en cas de succès
2. ✅ Les chunks arrivent en continu sans délai supplémentaire
3. ✅ Pas de régression sur le format SSE

### Test 6 — Regression (cache toujours fonctionnel)
1. Résumer un article → succès → cache hit sur le 2e clic
2. ✅ Le cache LRU serveur est toujours alimenté en cas de succès
3. ✅ Le sessionStorage client est toujours alimenté

---

## 📊 Métriques de succès

| Métrique | Avant | Après (cible) |
|----------|-------|---------------|
| Taux de succès résumé | ~50% | >95% |
| Temps moyen premier succès | ~8s | <6s |
| Nombre de modèles essayés max | 1 | N modèles configurés × 3 retries chacun |
| Visibilité des erreurs | Silencieuses (console navigateur uniquement) | Structurées (console serveur + client) |

---

## 📝 Commit message

```
fix(summarize): add multi-model fallback and exponential retry to streaming

- aiService.generateContentStream() now cycles through all configured
  models on failure (was: single attempt)
- Add withRetry() helper with exponential backoff (1s → 2s → 4s) and
  jitter for transient errors (429, 503, timeout, ECONNREFUSED)
- Increase initial streaming timeout from 30s to 45s for slow free models
- Add structured server-side logging with model name, duration, and result
- Client hook already has retry logic (unchanged)

Bugs fixed:
- 50% summary failure rate caused by single-model attempt with no retry
- Silent failures: errors now logged with model + timing on server

Closes VIG-002
```

---

## 🔗 Références croisées

| Ticket | Relation |
|--------|----------|
| VIG-003 | Le streaming fluide dépend en partie de la fiabilité du transport → ce ticket est un prérequis |
| VIG-004 | Le cache sera plus fiable si les résumés réussissent plus souvent |
| VIG-009 | L'audit de sécurité vérifiera la validation des entrées dans summarize.ts |
