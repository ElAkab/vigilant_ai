# 📋 Vigilant AI — Product Backlog

> **Auteur :** Lead PM / Solution Architect
> **Dernière mise à jour :** 2026-06-01
> **Statut global :** VIG-001 ✅ — 10 tickets restants (1 bloquant, 3 importants, 2 fondations, 4 futur)

---

## 🏗️ Architecture actuelle

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Vercel — vite)                           │
│  React 19 · Vite 8 · Tailwind 4                     │
│                                                      │
│  Composants : ArticleList · ArticleCard              │
│              SummaryPanel · SummaryModal              │
│  Hooks : useArticles · useArticleSummary             │
│  Service : articlesService → /api/articles            │
│                                                      │
│  Vite proxy : /api → localhost:8788                  │
└──────────────┬──────────────────────────────────────┘
               │  Vercel reverse proxy → VPS
┌──────────────┴──────────────────────────────────────┐
│  Backend (VPS Docker — port 8788)                    │
│  Bun · TypeScript                                    │
│                                                      │
│  Routes : /api/articles · /api/summarize             │
│          · /api/debug                                │
│  Lib    : rss.ts (RSS fetch + dédoublonnage)         │
│          · aiService.ts (OpenRouter)                 │
│          · cache.ts (LRU mémoire, 500 entrées)       │
│          · rateLimit.ts (rate limiting)              │
│          · http.ts (helpers HTTP)                    │
│  Config : sources.ts (14 flux RSS)                   │
│          · models.ts (modèles OpenRouter)             │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Phase 0 — Terminé

### VIG-001 — Correction compteur d'articles & pagination serveur
| Champ | Valeur |
|-------|--------|
| **Objectif** | API paginée (`?limit=10&offset=0`), compteur = `total` (1035), dédoublonnage par `id`, pageSize=10 |
| **Statut** | ✅ Déployé (VPS + Vercel) |

---

## 🔴 Phase 1 — Bloquant (MVP fiable)

### VIG-002 — Fiabilité des résumés IA (>95% succès)

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔴 **Bloquant** — le résumé est la killer feature. Sans fiabilité, l'utilisateur part. |
| **Objectif** | Passer de ~50% de succès à >95%. Le résumé IA ne doit jamais retourner une erreur silencieuse. |
| **Modèle LLM recommandé** | `claude-sonnet-4` |
| **Estimation** | 2-3 jours |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Quelle est la cause racine des échecs ?**
   - Timeout OpenRouter (>15s) ?
   - Rate limiting (429 → pas de retry) ?
   - Modèle indisponible (503) ?
   - Erreur réseau VPS → OpenRouter ?
   - Le `AbortController` côté frontend annule-t-il prématurément ?

2. **Stratégie de retry (3 options) :**

| Option | Principe | Effort | Robustesse |
|--------|----------|--------|------------|
| **A. Retry exponentiel serveur** | 3 tentatives (1s → 2s → 4s), backoff jitter | ~3h | ⭐⭐⭐ |
| **B. Fallback multi-modèles** | Si `claude-haiku` échoue → `gpt-4o-mini` → `gemini-flash` | ~5h | ⭐⭐⭐⭐ |
| **C. Queue asynchrone** | File d'attente + polling (compliqué, overkill pour MVP) | ~2j | ⭐⭐⭐⭐⭐ |
| **D. Retry simple + meilleur logging** | Option A mais avec logging structuré pour diagnostic | ~3h | ⭐⭐⭐ |

→ **Recommandation : Option D (Retry exponentiel + logging structuré).** On garde le fallback multi-modèles (Option B) pour un futur ticket si le retry ne suffit pas.

3. **Points à valider :**
   - Le `AbortController` côté client est-il correctement lié au cycle de vie React ?
   - Le timeout est-il configuré côté serveur (`fetch()` avec `AbortSignal.timeout()`) ?
   - Logging : que remonte-t-on côté serveur quand ça échoue ? (nécessaire pour debugger)

#### 📝 Spécification technique (après validation)

**Fichiers modifiés :**
- `server/routes/summarize.ts` — ajout retry exponentiel + timeout explicite
- `server/lib/aiService.ts` — wrapper `withRetry()` réutilisable
- `src/hooks/useArticleSummary.ts` — meilleure gestion d'erreur + état `error`

**Bugs corrigés au passage :**
- Erreurs silencieuses → désormais visibles dans l'UI
- AbortController non nettoyé au démontage du composant

**Tests manuels :**
1. Nominal : Cliquer sur un article → résumé affiché en <8s
2. Edge : Simuler un timeout réseau → retry automatique → résumé affiché
3. Edge : Simuler 3 échecs consécutifs → message d'erreur explicite
4. Regression : Naviguer rapidement article → article → pas de résumés fantômes

**Commit :** `fix(summarize): add exponential retry and structured error logging`

---

### VIG-003 — Fluidité streaming + note de synthèse

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔴 **Bloquant** — l'UX du streaming est cassée (loading dots parasites, délai de 600ms). |
| **Objectif** | Streaming continu sans artefacts visuels. La note de synthèse (dernière phrase) apparaît naturellement dans le flux, pas après un délai. |
| **Modèle LLM recommandé** | `claude-sonnet-4` |
| **Estimation** | 1-2 jours |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Pourquoi les loading dots apparaissent-ils ?**
   - Le stream s'interrompt-il entre deux chunks ?
   - Y a-t-il un double rendu React qui vide temporairement le buffer ?
   - Le composant réinitialise-t-il son état entre deux tokens ?

2. **Pourquoi l'insight final a-t-il 600ms de retard ?**
   - Le backend envoie-t-il un chunk spécial en fin de stream ?
   - La détection de "fin de phrase" est-elle faite côté client (coûteux) ?
   - Y a-t-il un `setTimeout()` ou `debounce()` mal calibré ?

3. **Architecture du streaming (2 options) :**

| Option | Principe | Effort | Fluidité |
|--------|----------|--------|----------|
| **A. Streaming SSE natif** | `/api/summarize` renvoie un flux SSE. Frontend lit avec `EventSource` ou `fetch()` + `ReadableStream`. Les chunks arrivent en continu, pas de reconstruction. | ~4h | ⭐⭐⭐⭐ |
| **B. Accumulation côté serveur** | Le serveur attend la réponse complète, puis la renvoie d'un bloc. Simple mais zéro streaming. | ~1h | ⭐ |

→ **Recommandation : Option A (SSE natif).** C'est ce qu'il y a déjà en partie. Le bug est probablement dans la gestion des chunks côté client.

4. **Points à valider :**
   - Le streaming utilise-t-il `fetch()` avec `response.body.getReader()` ou un wrapper ?
   - La note de synthèse est-elle un prompt séparé ou incluse dans le même flux ?
   - Le `useArticleSummary` hook gère-t-il correctement les updates d'état partiels ?

#### 📝 Spécification technique

**Fichiers modifiés :**
- `server/routes/summarize.ts` — stream SSE propre, pas de reconstruction
- `src/hooks/useArticleSummary.ts` — refonte du reader, élimination des artefacts
- `server/lib/aiService.ts` — prompt système : l'insight final fait partie du flux, pas un appel séparé

**Bugs corrigés au passage :**
- Loading dots parasites → corrigé par gestion correcte des états `loading` / `streaming`
- Délai de 600ms → supprimé car l'insight est désormais dans le même prompt

**Tests manuels :**
1. Nominal : Cliquer article → texte apparaît progressivement → insight final apparaît naturellement
2. Edge : Connexion lente (throttle réseau) → le streaming ne "saute" pas
3. Edge : Changement rapide d'article → le stream précédent est bien annulé
4. Regression : Résumé en français OK, pas de texte en anglais mélangé

**Commit :** `fix(summarize): smooth SSE streaming, remove loading artifacts and delay`

---

### VIG-004 — Cache résumés : affichage instantané

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔴 **Bloquant** — si l'utilisateur revoit un article, il attend pour rien. |
| **Objectif** | Si le résumé est déjà en cache (LRU serveur + sessionStorage navigateur), l'afficher instantanément sans appel réseau. Fondre vers le contenu frais si le cache est périmé. |
| **Modèle LLM recommandé** | `claude-haiku` |
| **Estimation** | 1 jour |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Pourquoi le rechargement n'est pas fluide actuellement ?**
   - Le cache est ignoré lors du deuxième clic ?
   - La clé de cache ne matche pas (différence d'URL, d'ID) ?
   - Le composant réinitialise l'état au lieu de lire le cache d'abord ?

2. **Stratégie de cache (2 options) :**

| Option | Principe | Effort | Instantanéité |
|--------|----------|--------|---------------|
| **A. Cache-first, stale-while-revalidate** | Afficher cache immédiatement → appeler API en arrière-plan → mettre à jour si différent | ~3h | ⭐⭐⭐⭐ |
| **B. Cache-only** | Afficher cache, pas d'appel API. Péremption par TTL (24h) ou invalidation manuelle. | ~1h | ⭐⭐⭐ |

→ **Recommandation : Option A (cache-first, SWR).** Les articles peuvent être mis à jour (corrections, nouvelles éditions). On veut le meilleur des deux mondes.

3. **Points à valider :**
   - Le LRU serveur utilise-t-il l'ID d'article comme clé ?
   - Le sessionStorage côté client est-il synchronisé avec le cache serveur ?
   - Que se passe-t-il si le cache contient une erreur précédente ? (ne pas recacher les erreurs)

#### 📝 Spécification technique

**Fichiers modifiés :**
- `src/hooks/useArticleSummary.ts` — pattern SWR : cache-first, revalidate en fond
- `server/lib/cache.ts` — ajout TTL + `isStale()` helper
- `server/routes/summarize.ts` — endpoint accepte header `If-None-Match` (ETag)

**Bugs corrigés au passage :**
- Erreurs cachées → jamais mises en cache
- Cache hit ignoré → corrigé par lecture prioritaire

**Tests manuels :**
1. Nominal : Cliquer article → résumé. Revenir à la liste → re-cliquer même article → instantané
2. Edge : Forcer revalidation → le résumé se met à jour sans clignoter
3. Edge : Article modifié (ETag différent) → mise à jour silencieuse
4. Regression : Article jamais résumé → appel API normal, pas de faux cache hit

**Commit :** `feat(summarize): instant cache display with stale-while-revalidate pattern`

---

## 🟡 Phase 2 — Important (UX/Design)

### VIG-005 — Logo mascotte + UI sobre

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 **Important** — l'identité visuelle donne confiance. |
| **Objectif** | Intégrer `vigilan-ai.png` comme logo dans le header. Réduire les éléments visuels superflus pour une UI plus sobre et professionnelle. |
| **Modèle LLM recommandé** | `claude-sonnet-4` |
| **Estimation** | 0.5-1 jour |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Où placer le logo ?**
   - Header gauche (classique, visible) → recommandé
   - Centré en haut (minimaliste)
   - Favicon uniquement (trop discret)

2. **Que réduire dans l'UI ?**
   - Audit visuel nécessaire : quels éléments sont purement décoratifs ?
   - Bordures, ombres, dégradés — simplifier vers Tailwind minimal
   - La landing page actuelle est-elle trop chargée ?

3. **Points à valider :**
   - Le fichier `vigilan-ai.png` est-il optimisé (taille, format WebP) ?
   - Faut-il un mode sombre pour le logo ?
   - Le nom "Vigilant AI" apparaît-il à côté du logo ou seulement le logo ?

#### 📝 Spécification technique

**Fichiers modifiés :**
- `src/App.tsx` ou composant racine — ajout du logo
- `public/vigilan-ai.png` → conversion WebP + redimensionnement
- `index.html` — favicon + meta tags

**Tests manuels :**
1. Nominal : Logo visible dans le header en desktop et mobile
2. Edge : Mode sombre → le logo reste lisible
3. Regression : L'UI n'a pas perdu de fonctionnalité après simplification

**Commit :** `feat(ui): add vigilant AI logo and streamline visual design`

---

### VIG-006 — Miniatures universelles

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 **Important** — les articles sans image donnent une impression de bug. |
| **Objectif** | Tous les articles ont une miniature, quel que soit le flux RSS source. Utiliser `og:image`, favicon du site, ou un fallback par défaut. |
| **Modèle LLM recommandé** | `claude-sonnet-4` |
| **Estimation** | 1 jour |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Fallback à plusieurs niveaux :**

| Niveau | Source | Fiabilité |
|--------|--------|-----------|
| 1 | `og:image` / `twitter:image` depuis la page HTML | 80% |
| 2 | `favicon` ou `apple-touch-icon` du domaine | 95% |
| 3 | Image de fallback par source (ex: logo Le Monde) | 99% |
| 4 | Image de fallback générique (`vigilan-ai.png` grisé) | 100% |

2. **Extraction côté serveur ou client ?**
   - **Serveur** : fetch HTML → parse `og:image` → stocker dans l'objet Article → toujours dispo. Effort : ~3h
   - **Client** : `new Image()` → si erreur → fallback. Plus simple mais flash visuel. Effort : ~1h

   → **Recommandation : Serveur**, pour éviter le flash visuel.

3. **Points à valider :**
   - Le parsing d'`og:image` peut être fait avec une regex simple ou un parser HTML léger (type `cheerio` sans dépendance) ?
   - Faut-il un cache pour les miniatures extraites (ne pas refetch à chaque fois) ?
   - Sources problématiques connues : Le Monde, Cloudflare Blog, OpenAI Blog ?

#### 📝 Spécification technique

**Fichiers modifiés :**
- `server/lib/rss.ts` — enrichir chaque article avec `thumbnail` (niveau 1-4)
- `server/lib/http.ts` — helper `fetchOgImage(url)` avec timeout court (3s)
- `src/types/article.ts` — ajout champ `thumbnail?: string`
- `src/components/ArticleCard.tsx` — rendu conditionnel de l'image

**Tests manuels :**
1. Nominal : Article avec og:image → miniature visible
2. Edge : Article sans og:image → favicon ou fallback
3. Edge : URL d'image invalide → fallback final (pas d'image cassée)
4. Regression : Les articles qui avaient déjà une image continuent de l'afficher

**Commit :** `feat(rss): universal thumbnail extraction with multi-level fallback`

---

### VIG-007 — Filtrage par catégories

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 **Important** — 1035 articles, l'utilisateur doit filtrer. |
| **Objectif** | Boutons de filtre : Tech, Géopolitique, Jeux vidéo, Général. Classification automatique des articles par source ou par LLM. |
| **Modèle LLM recommandé** | `claude-sonnet-4` |
| **Estimation** | 2 jours |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Stratégie de classification (3 options) :**

| Option | Principe | Effort | Précision |
|--------|----------|--------|-----------|
| **A. Par source** | Chaque flux RSS a une catégorie fixe (Le Monde → Géopolitique, Hacker News → Tech). Simple mais rigide — Le Monde a aussi des articles Tech. | ~2h | ⭐⭐ |
| **B. Par mots-clés** | Titre + description → correspondance de mots-clés prédéfinis | ~4h | ⭐⭐⭐ |
| **C. Par LLM (batch)** | Classification LLM asynchrone au moment du fetch RSS. Plus lent mais plus précis. | ~8h | ⭐⭐⭐⭐ |
| **D. Hybride B+C** | Source → catégorie par défaut. Si le titre contredit → LLM tranche. | ~6h | ⭐⭐⭐⭐ |

→ **Recommandation : Option A pour le MVP, puis migration vers D.** La classification par source est suffisante pour 80% des cas. On raffine plus tard.

2. **Quelles catégories ?**
   - Tech (Hacker News, Cloudflare Blog, OpenAI Blog, etc.)
   - Géopolitique (Le Monde, BBC, Reuters)
   - Jeux vidéo (flux gaming)
   - Général (tout le reste)

3. **Points à valider :**
   - Le mapping source → catégorie est-il dans `sources.ts` ?
   - Le filtre est-il côté client (useState) ou serveur (paramètre `?category=tech`) ?
   - Faut-il compter les articles par catégorie dans le badge du bouton ?

#### 📝 Spécification technique

**Fichiers modifiés :**
- `server/config/sources.ts` — ajout champ `category` par source
- `src/components/ArticleList.tsx` — barre de filtres + logique de filtrage
- `src/hooks/useArticles.ts` — paramètre `category` optionnel
- `src/types/article.ts` — ajout `category?: string`

**Tests manuels :**
1. Nominal : Cliquer "Tech" → seuls les articles Tech apparaissent
2. Edge : Catégorie vide (aucun article) → message "Aucun article dans cette catégorie"
3. Edge : URL avec `?category=tech` → filtre appliqué au chargement
4. Regression : Sans filtre → tous les articles visibles

**Commit :** `feat(articles): source-based category filtering`

---

### VIG-008 — Internationalisation (i18n)

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 **Important** — le produit sera utilisé en France, mais le contenu est international. |
| **Objectif** | Interface et prompts LLM adaptés automatiquement à la langue du navigateur (FR/EN/ES). |
| **Modèle LLM recommandé** | `claude-sonnet-4` |
| **Estimation** | 2-3 jours |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Approche i18n (3 options) :**

| Option | Principe | Effort | Maintenabilité |
|--------|----------|--------|----------------|
| **A. `react-i18next`** | Librairie complète : interpolation, pluriels, lazy loading des traductions. Standard React. | ~6h | ⭐⭐⭐⭐ |
| **B. Contexte React custom** | `useLocale()` + JSON de traductions. Simple, pas de dépendance externe. | ~4h | ⭐⭐ |
| **C. `next-intl` ou similaire** | Overkill pour Vite, conçu pour Next.js. | ~2h | ⭐⭐⭐ |

→ **Recommandation : Option A (`react-i18next`).** Standard de l'industrie, bien documenté, facile à maintenir.

2. **Quoi traduire ?**
   - UI : boutons, labels, messages d'erreur, placeholders
   - Prompts LLM : le prompt système et les instructions de résumé doivent être dans la langue de l'utilisateur
   - Contenu : les articles restent dans leur langue d'origine (pas de traduction automatique)

3. **Points à valider :**
   - Détection automatique : `navigator.language` ou `Accept-Language` header ?
   - L'utilisateur peut-il forcer une langue (language picker) ?
   - Les prompts LLM traduits sont-ils stockés dans des fichiers JSON ou inline dans le code ?

#### 📝 Spécification technique

**Fichiers modifiés :**
- `src/i18n/` — nouveau dossier : `index.ts`, `locales/fr.json`, `locales/en.json`, `locales/es.json`
- `src/components/*.tsx` — remplacer tous les textes en dur par `t('key')`
- `server/lib/aiService.ts` — prompt système paramétré par langue
- `src/main.tsx` — initialisation i18next

**Tests manuels :**
1. Nominal : Navigateur en français → UI en français, résumé en français
2. Edge : Navigateur en anglais → UI en anglais, résumé en anglais
3. Edge : Changer la langue via le picker → mise à jour instantanée
4. Regression : Tous les textes sont traduits, pas de clés `t('...')` visibles

**Commit :** `feat(i18n): add French, English, and Spanish translations`

---

## 🟢 Phase 3 — Fondations (Sécurité & Architecture)

### VIG-009 — Audit de sécurité

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟢 **Important (fondation)** — obligatoire avant toute exposition multi-utilisateurs. |
| **Objectif** | Identifier et corriger toutes les vulnérabilités : injection, CORS, rate limiting, secrets exposés, CSP headers, dépendances obsolètes. |
| **Modèle LLM recommandé** | `claude-opus-4` (audit profond) |
| **Estimation** | 2-3 jours |

#### 🔬 Brainstorming / Spécification

**Checklist d'audit :**

| Catégorie | À vérifier | Risque |
|-----------|------------|--------|
| **Injection** | Les paramètres `?limit=10&offset=0` sont-ils parsés et validés ? Les entrées utilisateur sont-elles nettoyées avant d'être passées aux flux RSS ? | 🔴 Critique |
| **CORS** | Quelles origines sont autorisées ? Actuellement `*` ou restrictif ? | 🟡 Élevé |
| **Rate Limiting** | `rateLimit.ts` existe — est-il correctement appliqué à TOUTES les routes ? Quels seuils ? | 🟡 Élevé |
| **Secrets** | La `OPENROUTER_API_KEY` est-elle dans les variables d'environnement ou hardcodée ? Jamais dans le code source ni dans le build Vite ? | 🔴 Critique |
| **CSP Headers** | Content-Security-Policy configurée ? Protège contre XSS. | 🟡 Élevé |
| **Dépendances** | `npm audit` / `bun audit` — vulnérabilités connues ? | 🟡 Élevé |
| **SSRF** | Le serveur fetch des flux RSS et des `og:image` externes — validation d'URL pour éviter SSRF (Server-Side Request Forgery) ? | 🔴 Critique |
| **Error Handling** | Les erreurs serveur exposent-elles des stack traces ou des chemins de fichiers ? | 🟢 Modéré |

**Points à valider :**
1. Audit automatique (`npm audit`, `bun audit`, ESLint security plugins) → corriger les failles critiques d'abord
2. Audit manuel du code : chaque route, chaque `fetch()` externe, chaque paramètre utilisateur
3. Mise en place de headers de sécurité manquants (CSP, HSTS, X-Content-Type-Options)
4. Validation des entrées : jamais faire confiance à un paramètre URL sans le parser/valider

**Tests manuels :**
1. Nominal : L'application fonctionne avec les headers de sécurité
2. Edge : Tentative d'injection SQL/LDAP → rejetée proprement
3. Edge : Requête depuis une origine non autorisée → bloquée par CORS
4. Edge : Appel à une URL interne (SSRF) → bloqué par la validation
5. Regression : Tous les tests existants passent

**Commit :** `fix(security): comprehensive security audit and hardening`

---

### VIG-010 — Support multi-utilisateurs

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟢 **Important (fondation)** — prérequis pour VIG-011 (emails) et toute feature personnalisée. |
| **Objectif** | Authentification (OAuth/magic link), isolation des données par utilisateur, cache par userId, base de données. |
| **Modèle LLM recommandé** | `claude-opus-4` (refonte architecturale) |
| **Estimation** | 5-7 jours |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Stratégie d'authentification (3 options) :**

| Option | Principe | Effort | UX |
|--------|----------|--------|-----|
| **A. Magic Link (Resend)** | Email → lien → session JWT. Simple, pas de mot de passe. | ~1j | ⭐⭐⭐⭐ |
| **B. OAuth (GitHub + Google)** | Connexion via provider tiers. Plus complexe mais standard. | ~2j | ⭐⭐⭐⭐⭐ |
| **C. Session simple (sans auth)** | Cookie de session anonyme. Pas de sécurité mais isole les données. | ~3h | ⭐⭐ |

→ **Recommandation : Option A (Magic Link).** Simple à implémenter, UX fluide, compatible avec VIG-011 (emails).

2. **Base de données (3 options) :**

| Option | Principe | Effort | Complexité |
|--------|----------|--------|------------|
| **A. SQLite (libsql/turso)** | Fichier local, zéro infra. Migrations simples. Compatible Turso pour le cloud plus tard. | ~4h | ⭐⭐ |
| **B. PostgreSQL** | Classique, puissant. Nécessite un conteneur Docker sur le VPS. | ~6h | ⭐⭐⭐ |
| **C. Upstash Redis** | Serverless, gratuit jusqu'à 10k requêtes/jour. Pas de schéma, limité. | ~3h | ⭐ |

→ **Recommandation : Option A (SQLite via libsql).** Zéro infra, migration facile vers Turso si besoin de scale.

3. **Isolation des données :**
   - Chaque requête `/api/articles` doit être scopée par `userId`
   - Le cache LRU doit être par utilisateur (cache key = `userId:articleId`)
   - Les préférences (catégories favorites, langue) → table `user_preferences`

4. **Points à valider :**
   - Le JWT est-il stocké en `httpOnly` cookie (sécurisé contre XSS) ?
   - Rate limiting par IP ET par userId ?
   - Migration des utilisateurs existants (anonymes → authentifiés) ?

#### 📝 Spécification technique

**Fichiers modifiés :**
- `server/db/` — nouveau dossier : `schema.ts`, `index.ts`, migrations
- `server/routes/auth.ts` — magic link + JWT
- `server/middleware/auth.ts` — middleware d'authentification
- `server/lib/cache.ts` — cache scopé par userId
- `server/routes/articles.ts` — scope userId
- `src/contexts/AuthContext.tsx` — état auth global
- `src/components/Login.tsx` — formulaire email

**Tests manuels :**
1. Nominal : Email → clic lien → session active → articles chargés
2. Edge : Lien expiré → nouveau magic link demandé
3. Edge : Session expirée → redirection vers login
4. Edge : Deux utilisateurs → articles isolés, chacun voit ses propres résumés
5. Regression : Tous les tests existants passent

**Commit :** `feat(auth): magic link authentication with SQLite user isolation`

---

## 🔵 Phase 4 — Futur (post-MVP)

### VIG-011 — Synthèses quotidiennes par email

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔵 **Évolution future** — dépend de VIG-010 (auth + DB). |
| **Objectif** | Chaque matin, l'utilisateur reçoit un email avec les 5-10 articles les plus pertinents résumés, selon ses catégories favorites. |
| **Modèle LLM recommandé** | `claude-sonnet-4` |
| **Estimation** | 3-4 jours |

#### 🔬 Brainstorming / Spécification

**Questions à valider avant de coder :**

1. **Déclencheur (2 options) :**

| Option | Principe | Effort | Fiabilité |
|--------|----------|--------|-----------|
| **A. Cron serveur (node-cron)** | Tâche planifiée dans le processus Bun. Simple mais fragile (crash = pas d'email). | ~2h | ⭐⭐ |
| **B. Endpoint + cron externe (cron-job.org)** | `POST /api/cron/daily-digest` appelé par un ping externe. Résilient. | ~3h | ⭐⭐⭐⭐ |
| **C. Hermes cron (via Hermes Agent)** | Cron déjà disponible sur le VPS, pas de nouvelle infra. | ~1h | ⭐⭐⭐ |

→ **Recommandation : Option B (endpoint + cron-job.org gratuit) ou C (Hermes cron).** Le cron-job.org est gratuit pour du quotidien.

2. **Service d'email (2 options) :**

| Option | Principe | Gratuit ? |
|--------|----------|-----------|
| **A. Resend** | API email simple, 100 emails/jour gratuits. SDK React Email. | ✅ Oui (100/j) |
| **B. SendGrid** | 100 emails/jour gratuits. Plus complexe à configurer. | ✅ Oui (100/j) |

→ **Recommandation : Resend.** Plus simple, meilleure DX, templates React Email.

3. **Personnalisation :**
   - Catégories favorites de l'utilisateur (via VIG-007 + VIG-010)
   - Fréquence : quotidienne, hebdomadaire, ou désactivée
   - Heure d'envoi configurable (par défaut 8h CET)

4. **Points à valider :**
   - Le template d'email est-il responsive (mobile-friendly) ?
   - Gestion des désabonnements (obligatoire légalement) ?
   - Limite de 100 emails/jour → scaling futur ?

#### 📝 Spécification technique

**Fichiers modifiés :**
- `server/routes/digest.ts` — endpoint `/api/cron/daily-digest`
- `server/lib/digestService.ts` — sélection des articles + résumés batch
- `server/lib/emailService.ts` — intégration Resend
- `server/emails/DailyDigest.tsx` — template React Email
- `src/components/Preferences.tsx` — settings email (fréquence, catégories)

**Tests manuels :**
1. Nominal : Cron déclenche → email reçu avec les bons articles
2. Edge : Aucun nouvel article → email "Pas de nouveautés aujourd'hui"
3. Edge : Désabonnement → flux stoppé, pas d'email fantôme
4. Regression : L'application web fonctionne normalement

**Commit :** `feat(digest): daily email summaries with Resend`

---

### 🔮 Backlog Idées (non priorisées)

| ID | Idée | Phase suggérée |
|----|------|----------------|
| VIG-SUG-001 | Recherche plein texte dans les articles | Futur |
| VIG-SUG-002 | Page "Article" dédiée avec résumé + lien source | Futur |
| VIG-SUG-003 | Mode sombre automatique (déjà partiellement là via Tailwind `dark:`) | Important |
| VIG-SUG-004 | PWA / installation hors-ligne | Futur |
| VIG-SUG-005 | Partage de résumé (lien public) | Futur |
| VIG-SUG-006 | Feedback utilisateur sur qualité du résumé (👍/👎) | Futur |
| VIG-SUG-007 | Analyse de tendances (quels sujets montent ?) | Futur |
| VIG-SUG-008 | Widget embeddable pour sites tiers | Futur |
| VIG-SUG-009 | Résumés audio (TTS) | Futur |
| VIG-SUG-010 | Détection de doublons cross-sources | Important |

---

## 🗺️ Carte des dépendances

```
VIG-001 ✅ (terminé)
  │
  ├─→ VIG-002 (retry résumés) ──→ VIG-003 (streaming) ──→ VIG-004 (cache)
  │     ↓                            ↓                        ↓
  │   Phase 1 — Bloquante          Phase 1                 Phase 1
  │
  ├─→ VIG-005 (logo)        ← indépendants les uns des autres
  ├─→ VIG-006 (miniatures)  ← exécutables en parallèle
  ├─→ VIG-007 (catégories)  ←
  └─→ VIG-008 (i18n)        ←
        │
        ↓  (toute la Phase 2 terminée)
        │
  VIG-009 (sécurité) ──→ VIG-010 (multi-utilisateurs)
        │                      │
        ↓                      ↓
     Phase 3 — Fondations    Phase 3 — Fondations
                                │
                                ↓
                           VIG-011 (emails quotidiens)
                                │
                                ↓
                           Phase 4 — Futur
```

---

## 📊 Résumé des priorités

| Priorité | Tickets | Effort total estimé |
|----------|---------|---------------------|
| 🔴 Bloquant | VIG-002, VIG-003, VIG-004 | 4-6 jours |
| 🟡 Important | VIG-005, VIG-006, VIG-007, VIG-008 | 5-7 jours |
| 🟢 Fondations | VIG-009, VIG-010 | 7-10 jours |
| 🔵 Futur | VIG-011 | 3-4 jours |
| **Total** | **10 tickets** | **19-27 jours** |

---

## 🎯 Prochaine action immédiate

**VIG-002** — Fiabilité des résumés IA (retry exponentiel + logging)

Avant de coder, on doit valider ensemble :
1. Quelle est la cause racine la plus probable ? (timeout ? rate limit ? AbortController ?)
2. Option D (retry exponentiel + logging) te convient-elle ?
3. Veux-tu qu'on loggue dans un fichier (`server.log`) ou juste en console ?

Une fois ces 3 questions répondues → j'écris la spec détaillée `docs/issues/VIG-002-spec.md` → tu valides → on code.
