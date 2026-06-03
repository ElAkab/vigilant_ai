# VIG-001 — Spécification Technique : Pagination Serveur

**Option retenue :** A — Pagination côté serveur  
**Rédacteur :** PM/Architecte | **Date :** 2026-06-01 | **Statut :** Spec validée, en attente d'implémentation

---

## 1. Nouveau contrat API

### 1.1 Requête

```
GET /api/articles?limit=10&offset=0
```

| Paramètre | Type | Défaut | Contrainte |
|-----------|------|--------|------------|
| `limit` | `number` | `10` | `1..100` |
| `offset` | `number` | `0` | `≥ 0` |

Exemples :
- `GET /api/articles` → page 1, 10 articles
- `GET /api/articles?limit=5&offset=15` → page 4, 5 articles
- `GET /api/articles?limit=20&offset=0` → page 1, 20 articles

### 1.2 Réponse (succès)

```json
{
  "items": [ { "id": "...", "titre": "...", ... } ],
  "pagination": {
    "total": 80,
    "limit": 10,
    "offset": 0,
    "page": 1,
    "totalPages": 8
  },
  "meta": {
    "sourceCount": 4,
    "errors": []
  }
}
```

### 1.3 Types TypeScript (nouveaux)

```typescript
// === server/lib/types.ts (nouveau fichier) ===

export interface PaginationMeta {
  total: number       // nombre TOTAL d'articles (avant slice)
  limit: number       // limite demandée
  offset: number      // offset demandé
  page: number        // page courante (1-based: floor(offset/limit) + 1)
  totalPages: number  // nombre total de pages (ceil(total/limit))
}

export interface ListArticlesResult {
  items: Article[]
  pagination: PaginationMeta
  meta?: {
    sourceCount?: number
    errors?: Array<{ sourceId: string; message: string }>
  }
}
```

### 1.4 Réponse (erreur)

Inchangé — les erreurs existantes (`RATE_LIMITED`, `RSS_UNAVAILABLE`, etc.) restent identiques.

---

## 2. Modifications côté serveur

### 2.1 `server/routes/articles.ts` — Refactor de `handleListArticles`

**Fichier :** `server/routes/articles.ts:21-61`

**Changements :**

1. **Extraire `offset` du query string** — ligne ~30
   ```typescript
   const offsetParam = url.searchParams.get('offset')
   const offset = offsetParam ? Math.max(0, Number(offsetParam)) : 0
   ```

2. **Changer la limite par défaut** de 60 à 10
   ```typescript
   const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : 10
   ```

3. **Ne plus slicer avant de compter** — la variable `merged` contient le total. On slice seulement pour `items`.
   ```typescript
   const merged = dedupeAndSort(results.flat()) // ne pas toucher
   const total = merged.length                   // <-- NOUVEAU : compter AVANT slice
   const sliced = merged.slice(offset, offset + limit)
   ```

4. **Construire l'objet `pagination`**
   ```typescript
   const pagination: PaginationMeta = {
     total,
     limit,
     offset,
     page: Math.floor(offset / limit) + 1,
     totalPages: Math.ceil(total / limit),
   }
   ```

5. **Réponse finale**
   ```typescript
   return json({
     items: sliced,
     pagination,
     meta: { sourceCount: RSS_SOURCES.length, errors },
   })
   ```

6. **Cas limite : `merged.length === 0`** — inchangé (erreur 502)

### 2.2 `server/lib/rss.ts` — Correction du dédoublonnage

**Fichier :** `server/lib/rss.ts:10-19` — fonction `dedupeAndSort`

**Problème actuel :** La fonction utilise `map.set(item.urlSource, item)`, ce qui signifie qu'un seul article par URL source est conservé. Si deux articles différents pointent vers la même URL (ex: un article et sa version AMP), le second écrase le premier.

**Correction :** Dédoublonner par `id` (qui est un hash SHA1 de `guid + sourceId`) à la place.

```typescript
function dedupeAndSort(items: Article[]): Article[] {
  const map = new Map<string, Article>()
  for (const item of items) {
    // Clé : id (hash unique) plutôt que urlSource
    if (!map.has(item.id)) {
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

> **Note :** Si le besoin de dédoublonnage cross-source par URL persiste, ajouter une seconde passe : `new Map(items.map(i => [i.urlSource, i]))` APRÈS le dédoublonnage par ID. Mais pour le MVP, le dédoublonnage par ID suffit.

### 2.3 `server/lib/types.ts` — Nouveau fichier

Créer ce fichier pour les types partagés côté serveur (pour l'instant `PaginationMeta` et `ListArticlesResult`, pourra accueillir d'autres types plus tard).

### 2.4 `endpoints/api/articles.ts` — Ajustement

**Fichier :** `endpoints/api/articles.ts:1-10`

Pas de changement nécessaire — c'est un simple passe-plat vers `handleListArticles`. Le typage de retour peut être affiné mais pas obligatoire.

---

## 3. Modifications côté client

### 3.1 `src/services/articlesService.ts` — Nouveau contrat

**Fichier :** `src/services/articlesService.ts`

**Changements :**

1. Importer `PaginationMeta` depuis le nouveau fichier de types
2. Modifier `ListArticlesResult` :
   ```typescript
   export type ListArticlesResult = {
     items: Article[]
     pagination: PaginationMeta
     meta?: { sourceCount?: number; errors?: Array<...> }
   }
   ```
3. La fonction `listArticles()` accepte `limit` et `offset` en paramètres :
   ```typescript
   export async function listArticles(
     limit = 10,
     offset = 0
   ): Promise<ListArticlesResult> {
     const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
     const res = await fetch(`/api/articles?${params}`, {
       headers: { accept: 'application/json' },
     })
     // ... gestion d'erreur inchangée ...
     return (await res.json()) as ListArticlesResult
   }
   ```

### 3.2 `src/hooks/useArticles.ts` — Refactor

**Fichier :** `src/hooks/useArticles.ts` (à créer si pas déjà séparé, ou modifier le hook existant)

**Nouveau comportement :**

- Le hook expose `items`, `pagination`, `loading`, `error`, `reload`
- `reload(page?: number, limit?: number)` permet de changer de page
- L'état local ne contient QUE les articles de la page courante
- Le compteur utilise `pagination.total` (pas `items.length`)

```typescript
// Signature du hook
export function useArticles() {
  const [items, setItems] = useState<Article[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async (limit: number, offset: number) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listArticles(limit, offset)
      setItems(result.items)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  // Charge la page 1 au mount
  useEffect(() => { fetchPage(10, 0) }, [fetchPage])

  return { items, pagination, loading, error, reload: fetchPage }
}
```

### 3.3 `src/pages/ArticlesPage.tsx` — Adaptation UI

**Fichier :** `src/pages/ArticlesPage.tsx`

**Changements :**

| Ligne(s) | Actuel | Nouveau |
|----------|--------|---------|
| 10 | `const { items, loading, error, reload } = useArticles()` | `const { items, pagination, loading, error, reload } = useArticles()` |
| 13 | `const [currentPage, setCurrentPage] = useState(1)` | `const [pageSize, setPageSize] = useState(10)` |
| 15 | `const pageSize = 5` | **supprimé** (remplacé par state) |
| 26-29 | `paginatedItems` via `useMemo` + `slice` | **supprimé** — on utilise `items` directement (déjà paginé) |
| 84 | Compteur : `{loading ? '…' : items.length}` | `{loading ? '…' : pagination?.total ?? items.length}` |
| 182-228 | Pagination locale (boutons ← →) | Pagination serveur (appelle `reload(pageSize, newOffset)`) |

**Nouvelle logique de pagination :**

```typescript
const goToPage = (page: number) => {
  const offset = (page - 1) * pageSize
  reload(pageSize, offset)
}

// Bouton précédent : goToPage(currentPage - 1)
// Bouton suivant   : goToPage(currentPage + 1)
// Page courante    : pagination?.page ?? 1
// Total pages      : pagination?.totalPages ?? 1
```

> **Note importante :** L'ancien système de sélection d'article (`effectiveSelectedId`, `selectedId`) repose sur le fait que tous les articles sont en mémoire. Avec la pagination serveur, un article sélectionné peut ne pas être dans `items`. Il faut soit :
> - Réinitialiser la sélection au changement de page (le plus simple, acceptable pour le MVP)
> - Garder l'article sélectionné dans un état séparé (plus complexe)
>
> **Recommandation :** Option 1 pour l'instant.

### 3.4 `src/types/article.ts` — Ajout de `PaginationMeta`

**Fichier :** `src/types/article.ts`

Ajouter l'interface `PaginationMeta` (ou la mettre dans un fichier séparé `src/types/api.ts` pour les types DTO) :

```typescript
export interface PaginationMeta {
  total: number
  limit: number
  offset: number
  page: number
  totalPages: number
}
```

---

## 4. Plan de migration

| Étape | Fichier(s) | Risque |
|-------|-----------|--------|
| 1. Ajouter `PaginationMeta` aux types | `src/types/article.ts` | Nul |
| 2. Corriger `dedupeAndSort` | `server/lib/rss.ts` | Faible — fonction isolée |
| 3. Refactor `handleListArticles` | `server/routes/articles.ts` | Moyen — contrat API change |
| 4. Adapter `listArticles()` | `src/services/articlesService.ts` | Faible — fonction isolée |
| 5. Refactor `useArticles` | `src/hooks/useArticles.ts` | Moyen — impacte `ArticlesPage` |
| 6. Adapter `ArticlesPage` | `src/pages/ArticlesPage.tsx` | Moyen — UI pagination |
| 7. Test manuel | Navigateur | — |

**Backward compatibilité :** Si d'autres consommateurs appellent `/api/articles`, ils recevront la nouvelle forme `{ items, pagination, meta }`. Si `offset` est omis, comportement identique à l'ancien (commence à 0).

---

## 5. Plan de test

### 5.1 Tests serveur

- [ ] `GET /api/articles` → 200, `pagination.total` > 0, `items.length ≤ limit`
- [ ] `GET /api/articles?limit=5&offset=0` → page 1, 5 items max
- [ ] `GET /api/articles?limit=5&offset=5` → page 2, items différents de la page 1
- [ ] `GET /api/articles?limit=5&offset=9999` → items vides, `pagination.total` correct, pas d'erreur
- [ ] `GET /api/articles?limit=200` → limit capped à 100
- [ ] `GET /api/articles?limit=-1` → limit ramené à 1 (Math.max)
- [ ] `GET /api/articles?offset=-5` → offset ramené à 0

### 5.2 Tests client

- [ ] Compteur affiche `pagination.total` et correspond au nombre réel d'articles
- [ ] Bouton "←" désactivé sur la page 1
- [ ] Bouton "→" désactivé sur la dernière page
- [ ] Changement de page → les articles se mettent à jour
- [ ] Retour page 1 → mêmes articles qu'au premier chargement
- [ ] Sélection d'article + changement de page → sélection reset (pas de crash)

---

## 6. Convention de commit

```
fix: server-side pagination with accurate article counter

- Add offset/limit query params to GET /api/articles
- Return pagination metadata (total, page, totalPages)
- Fix dedupeAndSort to use article ID instead of urlSource
- Client: adapt useArticles and ArticlesPage for server pagination
- Default page size: 10

Closes VIG-001
```

---

## 7. Impact sur les autres tickets

| Ticket | Impact |
|--------|--------|
| VIG-003 (streaming UX) | Aucun — la modale SummaryModal n'est pas affectée |
| VIG-004 (cache affichage) | Aucun — le cache est par article, pas par page |
| VIG-005 (UI sobre) | Faible — le compteur change de source (`pagination.total`), prévoir dans le design |
| VIG-007 (catégories) | Moyen — le filtrage serveur ajoutera `?category=tech` en plus de `limit/offset` |

---

**Prêt pour implémentation.** Prochaine étape : donner le feu vert au développeur (ou agent de code) pour l'étape 1 (types).
