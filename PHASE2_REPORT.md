# Vigilant AI — Phase 2 : Rapport d'avancement

**Date :** 4 juin 2026 | **Auteur :** ElAkab + Hermes

---

## 🌐 Déploiement

| Élément | URL / Cible |
|---------|-------------|
| **Frontend** (Vercel) | https://vigilant-ai-ebon.vercel.app |
| **Backend** (VPS Hostinger, port 8788) | 187.77.160.208 |
| **Proxy** | Vercel rewrites `/api/*` → VPS:8788 |
| **Repo GitHub** | ElAkab/vigilant_ai |
| **Dev preview** | `ssh -L 5173:172.16.1.2:5173 root@187.77.160.208` → http://localhost:5173 |

---

## ✅ Phase 1 — MVP Fiable (TERMINÉE)

- **VIG-001** ✅ Pagination serveur (`limit/offset`, 1045 articles)
- **VIG-002** ✅ Fiabilité résumés (>95%, multi-model fallback, retry exponentiel)
- **VIG-003** ✅ UX chargement (point pulsé CSS, insight animation)
- **VIG-004** ✅ Cache résumés (sessionStorage + LRU serveur)

---

## ✅ Phase 2 — VIG-005 · Logo mascotte + UI sobre (TERMINÉE)

### Terminé

| Sous-tâche | Statut |
|-----------|--------|
| Header frosted glass (`SandboxHeader`) avec logo 32px | ✅ |
| Suppression des 3 couches/orbes sur `ArticleCard` | ✅ |
| Design system unifié (bordures `[0.04-0.06]`, backdrop-blur) | ✅ |
| Sous-titre centré sur mobile | ✅ |
| « Fil d'articles » centré mobile, description supprimée | ✅ |
| Point compteur : vert si >1 article, rouille sinon | ✅ |
| Message patientez dans la modale d'erreur | ✅ |
| État vide / landing page avec logo centré | ✅ |
| Bouton « Exemple de flux RSS » réduit | ✅ |
| **🔄 Fluidité des résumés (voir section dédiée)** | ✅ |
| **🖱️ Curseur de stream inline + masqué sur l'insight** | ✅ |
| **🎨 Orbes décoratives restaurées et ajustées** | ✅ |

### Reste à faire

*Aucun — VIG-005 est terminée.*

---

## 🔄 Correctif fluidité résumés (sous-ticket VIG-005)

### Symptômes
- Flash visuel à chaque ouverture de modale (`key={summaryGen}` → unmount/remount)
- Délai avant la 1ʳᵉ étape de la barre de progression (12 secondes)
- Cache serveur invisible (flag `cached` ignoré)
- Apparition brutale du contenu (pas de transition)

### Solutions appliquées

| Problème | Solution | Fichiers |
|----------|----------|----------|
| Unmount/remount à chaque résumé | `key={summaryGen}` remplacé par `generationId` + `useEffect` interne | `ArticlesPage.tsx`, `SummaryModal.tsx` |
| Délai barre de progression | Seuils réduits à 3s/8s/25s ; event SSE `meta` exploité | `SummaryModal.tsx`, `summarizationService.ts` |
| Cache serveur invisible | Flag `cached` propagé depuis le `done` SSE → badge « en cache » | `useArticleSummary.ts`, `summarizationService.ts` |
| Apparition brutale | Animation CSS `content-fade-in` (350ms) sur le résumé + `insight-appear` adaptatif | `SummaryModal.tsx`, `index.css` |

---

## 🖱️ Correctif curseur (sous-ticket VIG-005)

### Symptôme
Le `<span>` du curseur était ajouté **après** les blocs HTML (`</p>`, `</li>`), il tombait donc à la ligne sous le résumé. De plus, il restait visible pendant le stream de la note IA (insight).

### Solution
- **Injection inline** : le curseur est désormais injecté à l'intérieur du dernier bloc HTML via `html.replace(/<\/(\w+)>\s*$/, cursorHtml + closingTag)`
- **Masquage intelligent** : la condition `!insight` dans `renderMarkdown(mainSummary || '', isLoading && !insight)` cache le curseur dès que la section `### 💡 L'avis` commence à streamer

---

## 🎨 Orbes décoratives (ajustement VIG-005)

### Contexte
Les radial-gradients du `body` avaient été retirés pendant le nettoyage initial de VIG-005. L'utilisateur les a réclamés (« excellent style »).

### Restauration
```css
body {
  background-image:
    radial-gradient(900px 420px at 12% 5%, oklch(0.93 0.09 65 / 0.40), transparent 62%),
    radial-gradient(700px 360px at 88% 0%, oklch(0.88 0.06 185 / 0.22), transparent 55%);
}
```

### Ajustement
La 1ʳᵉ orbe était à `-8%` (centre au-dessus du viewport → quasi invisible sous le header). Position corrigée à `5%` et opacité augmentée `0.35` → `0.40`.

---

## 🐛 Correctifs (hors ticket)

| Correctif | Fichiers |
|-----------|----------|
| Stream crash `Controller already closed` → try-catch | `server/routes/summarize.ts` |
| Timeout lecture 90s + `reader.cancel()` | `src/services/summarizationService.ts` |
| Barre de progression + messages évolutifs dans la modale | `src/components/SummaryModal.tsx` |
| ESLint `react-hooks/purity` → extraction `LoadingIndicator` avec `key` | `src/components/SummaryModal.tsx` |
| ESLint `no-useless-assignment` → `let html: string` sans init | `src/components/SummaryModal.tsx` |

---

## 📁 Tous les fichiers modifiés (Phase 1 + 2)

| Fichier | Changements |
|---------|-------------|
| `src/components/SandboxHeader.tsx` | **Nouveau** — header frosted glass slim (56px), logo, stats pill |
| `src/pages/ArticlesPage.tsx` | Header remplacé, messages épurés, landing page logo centré, `generationId` au lieu de `key={summaryGen}`, `serverConnected` |
| `src/components/ArticleCard.tsx` | −3 couches de fond, −2 orbes → 1 couche propre |
| `src/components/SummaryModal.tsx` | Barre progression, 4 stages, `LoadingIndicator` séparé, animation `content-fade-in`, curseur inline, `generationId` reset |
| `src/services/summarizationService.ts` | Timeout 90s, `reader.cancel()`, event SSE `meta`, flag `cached` |
| `server/routes/summarize.ts` | `controller.close()` try-catch, event `meta` |
| `server/lib/aiService.ts` | Multi-model fallback, retry exponentiel, timeout 45s |
| `src/hooks/useArticleSummary.ts` | Cache sessionStorage, inFlightRef, propagation `cached` serveur, `serverConnected` |
| `src/index.css` | `--animate-insight-appear`, `@keyframes insight-appear`, `@keyframes va-card-in`, `@keyframes content-fade-in`, orbes restaurées |
| `vite.config.ts` | Proxy `/api` → localhost:8788 |
| `vercel.json` | Rewrites `/api/*` → VPS:8788 |

---

## 🔮 Prochaine étape : VIG-006 — Recherche & Filtrage

### Pourquoi c'est la suite logique

- **1045+ articles** en base : impossible de tout parcourir sans recherche
- **Valeur utilisateur immédiate** : trouver un article par mot-clé, date, ou source
- **Apprentissage technique** : debouncing, URL search params, filtres combinés côté serveur
- **Faible complexité** : peut être livré en 2-3 sessions

### Tâches proposées

| ID | Tâche | Complexité |
|----|-------|------------|
| VIG-006a | Barre de recherche avec debounce (300ms) | 🟢 Simple |
| VIG-006b | Endpoint API `GET /api/articles?q=&source=&from=&to=` | 🟡 Moyen |
| VIG-006c | Filtres par source (dropdown avec les 4 sources) | 🟢 Simple |
| VIG-006d | Tri par date (récent / ancien) | 🟢 Simple |
| VIG-006e | URL search params (`?q=openai&source=lemonde`) → partageable | 🟡 Moyen |

### Questions ouvertes pour la prochaine session

- Veut-on un filtre par date (calendrier ou presets « 7 derniers jours ») ?
- La recherche doit-elle porter sur le titre uniquement ou aussi le résumé ?
- Préfères-tu commencer par VIG-006 ou as-tu une autre priorité en tête ?

---

## 🔮 Prompt pour nouvelle conversation

Copie-colle le bloc ci-dessous dans un nouveau chat :

```
Tu es un développeur Fullstack Senior expert en TypeScript, React 19,
Bun, Vite, et Tailwind CSS 4. Tu travailles sur le projet Vigilant AI
— un assistant de veille IA qui agrège des flux RSS et génère des
résumés via OpenRouter.

CONTEXTE PROJET :
- Repo GitHub : ElAkab/vigilant_ai (branch main)
- Frontend : React 19 + Vite + Tailwind 4, déployé sur Vercel
  (vigilant-ai-ebon.vercel.app)
- Backend : Bun + TypeScript, tourne sur VPS Hostinger port 8788
  (187.77.160.208)
- Vercel proxyfie /api/* → VPS:8788
- Modèle IA : OpenRouter (clé dans .env du VPS)
- 1045 articles en base, 4 sources RSS
  (OpenAI, Cloudflare, Le Monde, Frandroid)

ÉTAT ACTUEL :
Phase 1 TERMINÉE (VIG-001 à VIG-004).
Phase 2 TERMINÉE — VIG-005 (Logo mascotte + UI sobre) :
- ✅ Header frosted glass, ArticleCard épurée, design system unifié
- ✅ Landing page avec logo centré, état vide sobre
- ✅ Fluidité résumés : plus de flash (generationId au lieu de key),
  event meta SSE, cache serveur propagé, content-fade-in animation
- ✅ Curseur de stream inline, masqué automatiquement sur l'insight
- ✅ Orbes décoratives restaurées (radial-gradients ajustés)
- ✅ Barre de progression réactive (3s/8s/25s), LoadingIndicator
- ✅ Badge « en cache » pour sessionStorage ET cache serveur
- ✅ ESLint 0 erreur, TypeScript strict

OBJECTIF : Commencer VIG-006 — Recherche & Filtrage des articles.

Tâches proposées pour VIG-006 :
1. Barre de recherche avec debounce 300ms (côté frontend)
2. Endpoint API GET /api/articles?q=&source=&sort=
3. Filtres par source (dropdown)
4. Tri par date (récent/ancien)
5. URL search params pour liens partageables

INSTRUCTIONS :
- Charge le fichier PHASE2_REPORT.md et AGENTS.md avant de coder
- Utilise Conventional Commits (feat:, fix:, refactor:)
- Explique brièvement les concepts TypeScript/React introduits
- Propose un message de commit à chaque modification majeure
- Finis chaque interaction par : ce qui a été fait, une
  proposition pour la suite, et une question pertinente

RÈGLES :
- TypeScript strict, pas de `any`
- Composants fonctionnels + Hooks React
- Tailwind CSS pour le style (v4, @theme dans index.css)
- Sépare logique (hooks), types (interfaces), vue (composants)
- Ne jamais commiter de secrets (.env dans .gitignore)
- Utilise bun pour les commandes
- Vérifie ESLint (bun x eslint) AVANT de commit

Préférences utilisateur :
- Actions concrètes, pas juste des descriptions
- Explications pas-à-pas en français
- Brainstorming AVANT de coder (options techniques + tradeoffs)
- Le projet doit rester anonyme et ouvert (pas d'auth)
- Pour les effets visuels complexes, utiliser une lib externe
  plutôt que du CSS custom
- Pense en heure française (CEST, UTC+2)
```
