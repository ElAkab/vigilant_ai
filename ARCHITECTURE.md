# 🏗️ Architecture — Vigilant AI

> Généré automatiquement le 2026-06-07 11:15 UTC.
> Régénérer avec : `bun run docs:update`

---

## 📂 Arborescence du projet

```
  copilot-instructions.md
    ci.yml
.gitignore
    config.json
      favicon.svg
      icons.svg
      index.html
      vigilan-ai-removebg-preview.ico:Zone.Identifier
      vigilan-ai.ico
      vigilan-ai.png
AGENTS.md
ARCHITECTURE.md
PHASE2_REPORT.md
README.md
bun.lock
  NEW_SESSION_PROMPT.md
  backlog.md
    BACKLOG.md
    VIG-001-spec.md
    VIG-001.md
    VIG-002-spec.md
    VIG-001-pagination-serveur.md
    articles.ts
    health.ts
    summarize.ts
    translate.ts
eslint.config.js
index.html
package.json
  favicon.svg
  icons.svg
  vigilan-ai-removebg-preview.ico:Zone.Identifier
  vigilan-ai.ico
  vigilan-ai.png
  i18n-report.md
  dev-start.sh
  openrouter_socks.sh
  openrouter_tunnel.sh
  start-vite.sh
  update-agent-docs.sh
    models.ts
    sources.dev.ts
    sources.ts
  index.ts
    aiService.ts
    cache.ts
    context7.ts
    db.ts
    env.ts
    http.ts
    models.ts
    rateLimit.ts
    rss.ts
    articles.ts
    debug.ts
    summarize.ts
    translate.ts
skills-lock.json
  App.tsx
    ArticleCard.tsx
    ArticleList.tsx
    SandboxHeader.tsx
    SearchBar.tsx
    SelectableArticleCard.tsx
    SummaryModal.tsx
    SummaryPanel.tsx
    mockArticles.ts
    useArticleSummary.ts
    useArticleTranslation.ts
    useArticles.ts
    useDebounce.ts
    LanguageContext.tsx
    LanguageContextValue.ts
    translations.ts
    types.ts
    useT.ts
  index.css
    url.ts
  main.tsx
    ArticlesPage.tsx
    articlesService.ts
    summarizationService.ts
    translationService.ts
    article.ts
tailwind.config.js
  articles.test.ts
  basic.test.ts
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vercel.json
vite.config.ts
yarn.lock
```

---

## 📡 Endpoints API

| Route | Handler |
|---|---|
| `/` | 35:	let filePath = join(distDir, pathname === "/" ? "index.html" : pathname); |
| `/api/articles` | handleListArticles |
| `/api/rss/refresh` | handleRefreshRss |
| `/api/summarize/v2/stream` | handleSummarizeV2Stream |
| `/api/summarize/v2` | handleSummarizeV2 |
| `/api/summarize` | handleSummarize |
| `/api/summarize/stream` | handleSummarizeStream |
| `/api/translate` | handleTranslate |
| `/api/debug/models` | handleGetModelStatus |

---

## 📦 Dépendances

| Package | Version |
|---|---|
| @google/generative-ai | ^0.24.1 |
| @tailwindcss/vite | ^4.2.4 |
| react | ^19.2.5 |
| react-dom | ^19.2.5 |
| rss-parser | ^3.13.0 |
| tailwindcss | ^4.2.4 |

---

## 🧩 Composants React

| Composant | Description |
|---|---|
| ArticleCard | `src/components/ArticleCard.tsx` |
| ArticleList | `src/components/ArticleList.tsx` |
| SandboxHeader | `src/components/SandboxHeader.tsx` |
| SearchBar | `src/components/SearchBar.tsx` |
| SelectableArticleCard | `src/components/SelectableArticleCard.tsx` |
| SummaryModal | `src/components/SummaryModal.tsx` |
| SummaryPanel | `src/components/SummaryPanel.tsx` |

---

## 🪝 Hooks React

| Hook | Description |
|---|---|
| useArticleSummary | `src/hooks/useArticleSummary.ts` |
| useArticleTranslation | `src/hooks/useArticleTranslation.ts` |
| useArticles | `src/hooks/useArticles.ts` |
| useDebounce | `src/hooks/useDebounce.ts` |

---

## 🌍 Variables d'environnement

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OPENROUTER_API_KEY=sk-or-v1-... |
| `APP_ENV` | APP_ENV=development |
| `PORT` | PORT=8787 |
| `DB_PATH` | DB_PATH=server/data/articles.db |

---

## 🔀 Workflow Git

| Branche | Environnement | Sources RSS | DB | Déploiement |
|---|---|---|---|---|
| `dev` | `APP_ENV=development` | 3 sources | `articles_dev.db` | `http://187.77.160.208:8788` |
| `main` | `APP_ENV=production` | 12 sources | `articles.db` | Vercel |

---

*Ce fichier est régénéré automatiquement via `bun run docs:update` ou le hook post-commit.*
*Pour le profil agent et les règles de code, voir `AGENTS.md`.*
