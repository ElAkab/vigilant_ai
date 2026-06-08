# Profil Agent — Vigilant AI

**Rôle :** Développeur Fullstack Senior expert en TypeScript, React et Bun.
**Objectif :** Maintenir et faire évoluer Vigilant AI, l'assistant de veille technologique, géopolitique et gaming.

---

## 🏗️ Architecture du projet

```
vigilant_ai/
├── server/                  # Backend Bun
│   ├── index.ts             # Point d'entrée, routes, serveur statique
│   ├── config/
│   │   ├── sources.ts       # Sources RSS (production)
│   │   └── models.ts        # Chargement dynamique des modèles OpenRouter gratuits
│   ├── lib/
│   │   ├── aiService.ts     # Service IA : OpenRouter, multi-modèle, retry, JSON, stream
│   │   ├── db.ts            # SQLite (bun:sqlite), upsert, query, rétention 640/source
│   │   ├── rss.ts           # Fetch RSS avec retry, parsing, extraction images
│   │   ├── models.ts        # Types AIModel, modèles par défaut
│   │   └── http.ts          # Helpers HTTP (errorResponse, HttpError)
│   └── routes/
│       ├── articles.ts      # /api/articles, /api/rss/refresh
│       ├── summarize.ts     # /api/summarize/v2, /api/summarize/v2/stream
│       └── translate.ts     # /api/translate
├── src/                     # Frontend React (Vite)
│   ├── App.tsx              # Racine, routage
│   ├── main.tsx             # Point d'entrée React
│   ├── components/
│   │   ├── ArticleCard.tsx          # Carte article (titre, résumé, source, catégorie)
│   │   ├── SummaryModal.tsx         # Modale de résumé IA V2 (summaryMd + insight)
│   │   ├── SearchBar.tsx            # Barre de recherche avec debounce
│   │   ├── SelectableArticleCard.tsx # Sélection d'articles pour résumé groupé
│   │   └── SandboxHeader.tsx        # Header avec navigation
│   ├── hooks/
│   │   ├── useArticles.ts           # Fetch articles avec filtres
│   │   ├── useArticleSummary.ts     # Stream SSE V2 + cache sessionStorage
│   │   └── useDebounce.ts           # Debounce générique
│   ├── services/
│   │   ├── articlesService.ts       # Appels API articles
│   │   ├── summarizationService.ts  # Appels API summarize V2
│   │   └── translationService.ts    # Appels API translate
│   ├── types/
│   │   └── article.ts              # Interface Article, type Categorie
│   └── i18n/                        # Internationalisation (useT, LanguageContext)
├── tests/
│   └── articles.test.ts            # Tests unitaires : dedup, sort, stratifiedSort
├── scripts/
│   ├── dev-start.sh                 # Démarrage dev : git pull, build, serveur
│   └── update-agent-docs.sh         # Régénère ARCHITECTURE.md automatiquement
├── endpoints/                       # Configuration Vercel (serverless)
├── .env.development                 # Variables d'environnement DEV (clé, DB, port)
├── .env.production                  # Variables d'environnement PROD
├── .env.example                     # Documentation des variables
└── AGENTS.md                        # Ce fichier
```

> **📄 Documentation technique complète** : `ARCHITECTURE.md` est généré automatiquement via `bun run docs:update` ou le hook post-commit. Il contient l'arbre complet, les routes API détaillées, le flux de données et les dépendances.

---

## 📡 Endpoints API

| Route | Méthode | Description |
|---|---|---|
| `/api/articles` | GET | Liste les articles avec filtres (`q`, `source`, `categorie`, `sort`, `limit`, `offset`) |
| `/api/rss/refresh` | POST | Force le re-fetch de tous les flux RSS |
| `/api/summarize/v2` | POST | Résumé IA structuré (JSON : `summaryMd` + `insight`) |
| `/api/summarize/v2/stream` | POST | Résumé IA streamé SSE |
| `/api/translate` | POST | Traduction multilingue |
| `/api/debug/models` | GET | État des modèles IA |

---

## 🔀 Workflow Git

| Branche | Rôle | Déploiement |
|---|---|---|
| `dev` | Développement actif, toutes les features | Test sur `http://187.77.160.208:8788` |
| `main` | Production, version simplifiée (template) | Vercel |

**Règle :** Ne jamais travailler sur `main` pour les fonctionnalités avancées. `main` est un template simplifié.

---

## 🌍 Environnements

La variable `APP_ENV` pilote tout :
- `APP_ENV=development` → charge `.env.development` (clé OpenRouter DEV, DB séparée)
- `APP_ENV=production` → charge `.env.production` (clé OpenRouter PROD)
- Les sources RSS sont identiques (12) dans les deux environnements

**Variables d'environnement documentées dans `.env.example` :**
- `OPENROUTER_API_KEY` — Clé API OpenRouter (obligatoire)
- `OPENROUTER_MODEL` — Modèle prioritaire (optionnel)
- `DB_PATH` — Chemin de la base SQLite (défaut : `server/data/articles.db`)
- `PORT` — Port du serveur (défaut : 8787)
- `MOCK_AI` — Mode mock pour les tests (`true`/`false`)
- `APP_ENV` — Environnement (`development`/`production`)
- `STATIC_DIR` — Dossier des fichiers statiques (défaut : `dist`)

---

## 🛠️ Outils Agent (quand et comment les utiliser)

### Recherche web & documentation fraîche
- **Exa MCP** (`mcp_exa_web_search_exa`, `mcp_exa_web_fetch_exa`) → À utiliser automatiquement pour toute recherche d'actualités, de documentations de librairies (React, Bun, Tailwind, OpenRouter), de tutoriels récents, ou de comparaisons techniques. Privilégier Exa plutôt que DuckDuckGo pour la qualité des résultats.
- **DuckDuckGo MCP** → Fallback si Exa ne trouve pas.

### Raisonnement structuré
- Pour les décisions d'architecture, les refactorings complexes, ou les choix techniques avec plusieurs alternatives, structurer le raisonnement de manière séquentielle : problème → contraintes → alternatives → décision. Poser le raisonnement dans la réponse avant de coder.

---

## 📝 Règles de Code

### TypeScript
- Typage strict. Pas de `any`.
- Interfaces pour les objets, types pour les unions.
- `// @ts-expect-error` uniquement avec justification en commentaire.

### React
- Composants fonctionnels + Hooks modernes.
- **Pas de `set-state-in-effect`** → utiliser `useRef` + `useEffect` pour les timers/debounce. Pattern : `const timerRef = useRef<ReturnType<typeof setTimeout>>(); useEffect(() => { timerRef.current = setTimeout(...); return () => clearTimeout(timerRef.current); }, [deps])`
- **Ref sync dans useEffect** → `useEffect(() => { ref.current = value })` est autorisé.

### Style
- Tailwind CSS v4 (plugin Vite `@tailwindcss/vite`).
- Design sombre cohérent.

### Architecture
- **Logique** → `hooks/`
- **Types** → `types/`
- **Vue** → `components/`
- **Services API** → `services/`

---

## 🔒 Sécurité

- **`.env` est dans `.gitignore`** — ne jamais commiter de secrets.
- **Deux clés OpenRouter distinctes** : une pour dev, une pour prod.
- **`OPENROUTER_API_KEY` côté serveur uniquement** — jamais exposée au client.
- **Toute clé exposée → rotation immédiate** sur openrouter.ai/keys.
- **`.env.example`** documente toutes les variables sans valeurs secrètes.

---

## 🛡️ Gestion des erreurs et résilience

- **Codes HTTP précis** : `500`/`502`/`429`/`400` avec code interne (`CONFIG_MISSING`, `AI_SERVICE_ERROR`, `RSS_PARSE_ERROR`).
- **Retry avec backoff** : 2 tentatives max, délai exponentiel + jitter aléatoire.
- **Multi-modèle fallback** : si un modèle échoue, le suivant est essayé (round-robin).
- **Timeout** : 45s par défaut sur les appels OpenRouter, 8-12s sur les flux RSS.
- **Troncature prompts** : `maxTokens: 2000` pour limiter les coûts.

---

## 🧪 Tests

```bash
bun test                    # Tous les tests
bun test --watch            # Mode watch
```

Tests actuels dans `tests/articles.test.ts` :
- `dedupeAndSort` — tri récent/ancien, déduplication
- `matchQuery` — recherche insensible à la casse
- `matchSource` — filtrage par source
- `stratifiedSort` — round-robin inter-sources

---

## 💬 Règles de Communication

- **Expliquer brièvement** les concepts TypeScript/Bun introduits.
- **Conventional Commits** pour les messages : `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- **Concis et efficace** — aller à l'essentiel.
- **Brainstormer avant de coder** pour les features UX — proposer des options, clarifier le comportement attendu.
- **Tests en live** : après chaque déploiement sur dev, l'utilisateur teste sur `http://187.77.160.208:8788`.

---

## ✅ Checklist avant commit

- [ ] `bun x eslint src/` passe sans erreur (⚠️ CI rouge = bloquant)
- [ ] `.env` pas modifié / pas de secret commité
- [ ] `OPENROUTER_API_KEY` utilisé côté serveur uniquement
- [ ] Tests manuels : `/api/summarize/v2` répond correctement
- [ ] Les messages d'erreur sont clairs et en français
- [ ] Message de commit au format Conventional Commits
