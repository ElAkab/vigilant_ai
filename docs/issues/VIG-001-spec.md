# VIG-001 · Spécification technique — Option A (Pagination serveur)

**Date :** 2026-06-01 | **Auteur :** Hermes (PM) | **Statut :** Spécification

---

## 🎯 Objectif

Remplacer la pagination 100% locale (slice sur `items[]`) par une pagination côté serveur avec paramètres `limit`/`offset`. Le compteur du header affiche le **total réel** remonté par l'API.

---

## 📡 Contrat API

### Requête

```
GET /api/articles?limit=10&offset=0
```

| Paramètre | Type   | Défaut | Min | Max   | Description          |
|-----------|--------|--------|-----|-------|----------------------|
| `limit`   | number | 10     | 1   | 200   | Articles par page    |
| `offset`  | number | 0      | 0   | —     | Index de départ      |

### Réponse (200 OK)

```json
{
  "items": [ Article, ... ],
  "total": 80,
  "page": 1,
  "pageSize": 10,
  "totalPages": 8,
  "meta": {
    "sourceCount": 4,
    "errors": []
  }
}
```

| Champ        | Type      | Description                                      |
|--------------|-----------|--------------------------------------------------|
| `items`      | Article[] | Les articles de la page courante                 |
| `total`      | number    | Nombre TOTAL d'articles (avant slice)            |
| `page`       | number    | Page courante (1-indexed, calculé depuis offset) |
| `pageSize`   | number    | Taille de page effective (≡ limit)               |
| `totalPages` | number    | Nombre total de pages                            |
| `meta`       | object    | Inchangé : sourceCount, errors                   |

### Codes d'erreur

| Code | Interne              | Signification                           |
|------|----------------------|-----------------------------------------|
| 400  | `BAD_REQUEST`        | `limit` ou `offset` invalide            |
| 429  | `RATE_LIMITED`       | Trop de requêtes                        |
| 502  | `RSS_UNAVAILABLE`    | Aucun flux RSS joignable                |

---

## 🔧 Modifications serveur

### 1. `server/routes/articles.ts`

**Fichier :** `/workspace/vigilant_ai/server/routes/articles.ts`

#### Changements

```typescript
// AVANT
const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam))) : 60
// ...
return json({ items: merged.slice(0, limit), meta: { ... } })

// APRÈS
const limit = Math.max(1, Math.min(200, Number(limitParam || 10)))
const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
const total = merged.length
const page = Math.floor(offset / limit) + 1
const totalPages = Math.ceil(total / limit)

return json({
  items: merged.slice(offset, offset + limit),
  total,
  page,
  pageSize: limit,
  totalPages,
  meta: { sourceCount: RSS_SOURCES.length, errors },
})
```

**Points d'attention :**
- `total` = `merged.length` (avant slice) → c'est le nombre réel d'articles disponibles
- `page` = `Math.floor(offset / limit) + 1` → 1-indexed pour l'UX
- Si `offset` dépasse `total`, renvoyer `items: []` et `page` calculé normalement (le front gère le cas)

---

### 2. `server/lib/rss.ts` — Correction du dédoublonnage

**Fichier :** `/workspace/vigilant_ai/server/lib/rss.ts`  
**Ligne :** 10-19

#### Problème actuel

```typescript
function dedupeAndSort(items: Article[]): Article[] {
  const map = new Map<string, Article>()
  for (const item of items) {
    map.set(item.urlSource, item) // ❌ Clé = URL source, pas l'id unique
  }
  // ...
}
```

Si deux articles différents pointent vers la même URL source (ex: page d'accueil d'un journal), le second écrase le premier. On perd des articles.

#### Correction

```typescript
function dedupeAndSort(items: Article[]): Article[] {
  const map = new Map<string, Article>()
  for (const item of items) {
    // ✅ Dédoublonne par id (hash SHA1 unique) + urlSource (filet de sécurité)
    const existing = map.get(item.id)
    if (!existing) {
      map.set(item.id, item)
    }
  }
  const deduped = [...map.values()]
  deduped.sort((a, b) =>
    a.datePublication < b.datePublication ? 1
    : a.datePublication > b.datePublication ? -1
    : 0
  )
  return deduped
}
```

---

## 🔧 Modifications client

### 3. `src/types/article.ts` — Ajout du type de réponse paginée

```typescript
// Ajouter après le type Article existant

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
```

---

### 4. `src/services/articlesService.ts` — Paramètres de pagination

```typescript
// AVANT
export async function listArticles(): Promise<ListArticlesResult> {
  const res = await fetch('/api/articles?limit=60', ...)
  // ...
}

// APRÈS
interface ListArticlesParams {
  limit?: number   // défaut 10
  offset?: number  // défaut 0
}

export async function listArticles(
  params: ListArticlesParams = {}
): Promise<PaginatedArticles> {
  const { limit = 10, offset = 0 } = params
  const url = `/api/articles?limit=${limit}&offset=${offset}`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  // ... gestion d'erreur inchangée ...
  return (await res.json()) as PaginatedArticles
}
```

- Le type de retour devient `PaginatedArticles` (pas besoin du `ListArticlesResult` actuel)
- Les paramètres `limit`/`offset` sont optionnels avec des défauts

---

### 5. `src/hooks/useArticles.ts` — Stockage du `total` + fetch paginé

```typescript
type UseArticlesState = {
  items: Article[]
  total: number        // ← NOUVEAU : total réel
  loading: boolean
  error: string | null
}

// La fonction listArticles() est maintenant appelée avec les params
// de pagination depuis ArticlesPage, pas depuis le hook.

export function useArticles() {
  const [state, setState] = useState<UseArticlesState>({
    items: [],
    total: 0,          // ← initialisé à 0
    loading: true,
    error: null,
  })

  // reload() accepte les params de pagination
  const reload = useCallback(async (params?: { limit?: number; offset?: number }) => {
    const runId = ++seqRef.current
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const result = await listArticles(params)
      if (cancelledRef.current) return
      if (runId !== seqRef.current) return
      setState({
        items: result.items,
        total: result.total,    // ← stocke le total réel
        loading: false,
        error: null,
      })
    } catch (err) {
      // ... inchangé ...
    }
  }, [])

  // Premier chargement : page 1
  useEffect(() => {
    cancelledRef.current = false
    reload({ limit: 10, offset: 0 })
    return () => { cancelledRef.current = true }
  }, [reload])

  return { ...state, reload }
}
```

**Note importante :** `reload()` accepte maintenant les paramètres de pagination. `ArticlesPage` appelle `reload({ limit: pageSize, offset: newOffset })` quand l'utilisateur change de page.

---

### 6. `src/pages/ArticlesPage.tsx` — Refonte pagination

Changements principaux :
- `pageSize` passe de 5 à **10** (constante `DEFAULT_PAGE_SIZE`)
- Suppression de `paginatedItems` (plus de slice local)
- Le changement de page déclenche un appel API avec `reload({ limit, offset })`
- Le compteur utilise `total` au lieu de `items.length`
- L'UI pagination utilise `totalPages` de l'API

```typescript
const DEFAULT_PAGE_SIZE = 10

export function ArticlesPage() {
  const { items, total, loading, error, reload } = useArticles()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = DEFAULT_PAGE_SIZE

  // Calculer totalPages depuis total (pas items.length)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // Navigation : recalculer offset et re-fetch
  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(clamped)
    const offset = (clamped - 1) * pageSize
    reload({ limit: pageSize, offset })
  }, [pageSize, totalPages, reload])

  // Compteur dans le header
  <span>{loading ? '…' : total}</span>  // ← utilise total, pas items.length

  // Pagination UI
  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>←</button>
  <span>{currentPage}/{totalPages}</span>
  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>→</button>
```

**Piège à éviter :** `useEffect` de `useArticles` appelle `reload()` au montage → page 1 chargée automatiquement. Le compteur affiche `total` (ex: 80) dès le premier rendu.

---

### 7. `src/components/SelectableArticleCard.tsx` — Reset animation par page

Pas de changement fonctionnel nécessaire. L'animation `va-card-in` se déclenche naturellement au re-render causé par le changement d'`items[]`. Le `styleIndex` repart de 0 pour chaque page (items.map index).

---

## 🐛 Bug satellites corrigés dans ce ticket

| Bug | Fichier | Correction |
|-----|---------|------------|
| Dédoublonnage par URL au lieu d'ID | `server/lib/rss.ts` | Clé = `item.id` |
| Compteur = `items.length` (tronqué) | `ArticlesPage.tsx` | Compteur = `total` |
| pageSize=5 → 16 pages pour 80 articles | `ArticlesPage.tsx` | pageSize=10 → 8 pages |
| Pas de notion de page côté API | `server/routes/articles.ts` | Ajout `offset`, métadonnées pagination |

---

## 🧪 Tests manuels

### Cas nominal
```
1. Ouvrir l'app → compteur affiche le total réel (ex: 80)
2. Page 1 affiche 10 articles (index 0-9)
3. Cliquer "→" → page 2 affiche 10 articles (index 10-19)
4. Compteur toujours à 80 (ne change pas entre les pages)
5. Page 8 affiche les derniers articles
6. Bouton "→" désactivé sur la dernière page
```

### Cas limite
```
7. offset > total → page affiche 0 article, pas d'erreur
8. limit=1 → 1 article par page, totalPages = total
9. limit=200 (max) → tout sur une page, totalPages = 1
10. total = 0 → "Aucun article à afficher"
11. Changement rapide de page → seul le dernier fetch est affiché (runId check)
```

### Régression
```
12. Le chargement initial n'est pas plus lent (le TTL cache 10 min évite de re-fetch les RSS)
13. Le bouton "Réessayer" fonctionne toujours en cas d'erreur
14. L'URL d'un article s'ouvre toujours dans un nouvel onglet
```

---

## 📁 Plan de commit (Conventional Commits)

```bash
git commit -m "fix: pagination serveur avec total exact + pageSize=10

- API /api/articles accepte limit + offset, renvoie total/page/totalPages
- Correction dédoublonnage RSS (clé=id au lieu de urlSource)
- Compteur header affiche total au lieu de items.length
- Suppression pagination locale (slice client)
- PageSize passe de 5 à 10 pour une navigation plus fluide

Closes VIG-001"
```

---

## ⏱️ Estimation

| Tâche | Temps |
|-------|-------|
| Modification `server/routes/articles.ts` | 20 min |
| Correction `server/lib/rss.ts` (dedup) | 10 min |
| Modification `src/types/article.ts` | 5 min |
| Modification `src/services/articlesService.ts` | 10 min |
| Modification `src/hooks/useArticles.ts` | 15 min |
| Modification `src/pages/ArticlesPage.tsx` | 20 min |
| Tests manuels | 15 min |
| **Total** | **~1h35** |

---

*Spécification prête pour implémentation. Passage en « Ready for Dev » après validation.*
