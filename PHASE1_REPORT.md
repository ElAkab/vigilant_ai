# Vigilant AI — Phase 1 : Rapport de clôture

**Date :** 4 juin 2026 | **Auteur :** ElAkab + Hermes

---

## 🌐 Déploiement

| Élément | URL / Cible |
|---------|-------------|
| **Frontend** (Vercel) | https://vigilant-ai-ebon.vercel.app |
| **Backend** (VPS Hostinger, port 8788) | 187.77.160.208 |
| **Proxy** | Vercel rewrites `/api/*` → VPS:8788 |
| **Repo GitHub** | ElAkab/vigilant_ai |

---

## ✅ Phase 1 — MVP Fiable (TERMINÉE)

### VIG-001 · Pagination serveur
- API paginée : `?limit=10&offset=0`, total exact (1044 articles)
- Déduplication par `id`, pageSize=10
- Header allégé avec indicateur `page X/Y`

### VIG-002 · Fiabilité des résumés IA (>95%)
- **Multi-model fallback** : le serveur essaie tous les modèles configurés (pas un seul)
- **Retry exponentiel** : backoff 1s→2s→4s avec jitter sur erreurs 429/503/timeout
- **Timeout streaming** : 45s (au lieu de 30s)
- **Race condition fix** : suppression d'un `useEffect` qui abortait la requête avant qu'elle démarre (réponses `ms:1`)
- **Garde anti-double-appel** : `inFlightRef` dans `useArticleSummary`
- Modèle actif : `openrouter/owl-alpha` (gratuit)

### VIG-003 · UX de chargement
- **Indicateur de chargement** : point orange pulsé + "Rédaction du résumé…" centré (0 lib externe, 100% CSS)
- **Insight animation** : CSS `@keyframes insight-appear` sur le bloc avis — fade-in+slide-up au montage (0ms de délai, plus de `setTimeout(600ms)`)
- **Pas de curseur** clignotant pendant le stream (retiré à la demande de l'utilisateur)
- Suppression des anciens loading dots (3 boules) et de tous les hacks de bordure animée (Yojimbo, GradientBorder, conic-gradient)

### VIG-004 · Cache des résumés
- **Client** : `sessionStorage` par `article.id` — affichage instantané si déjà résumé
- **Serveur** : `SimpleLRU` 100 entrées — évite de rappeler l'IA

---

## 🛠️ Infrastructure

- Script `~/start-vigilant-backend.sh` pour relancer le backend après restart conteneur
- Le cron Hermes ne peut PAS agir sur le conteneur WebUI (filesystems séparés)
- Solution durable : modifier le `docker-compose.yml` VPS pour auto-start au boot
- Problème connu : `dist/assets` en root → `hermeswebui` ne peut pas build en local (Vercel build à distance, OK)

---

## 📊 Phase 2 — Prochaine étape

### VIG-005 · Logo mascotte + UI sobre
- **Indépendant** — ne dépend d'aucun autre ticket
- **Impact visuel immédiat** — rend l'app plus professionnelle
- **Estimation** : 2-3h
- **Objectifs** :
  1. Intégrer `vigilan-ai.png` dans le header
  2. Nettoyer les dégradés superflus sur `ArticleCard`
  3. Ajouter un état vide stylé avec le logo
  4. Uniformiser les ombres et espacements

---

## 📁 Fichiers clés modifiés en Phase 1

| Fichier | Changements |
|---------|-------------|
| `server/lib/aiService.ts` | Multi-model fallback, retry exponentiel, timeout 45s |
| `server/routes/summarize.ts` | Validation, cache LRU, logging structuré |
| `src/hooks/useArticleSummary.ts` | Cache sessionStorage, inFlightRef, retry client |
| `src/components/SummaryModal.tsx` | Insight animation CSS, loading UX simplifié, pas de curseur |
| `src/index.css` | `--animate-insight-appear`, `@keyframes insight-appear` |
| `vite.config.ts` | Proxy `/api` → localhost:8788 (dev) |
| `vercel.json` | Rewrites `/api/*` → VPS:8788 |

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
- 1044 articles en base, 4 sources RSS (OpenAI, Cloudflare,
  Le Monde, Frandroid)

ÉTAT ACTUEL :
Phase 1 du plan est TERMINÉE :
- VIG-001 ✅ Pagination serveur (limit/offset, 1044 articles)
- VIG-002 ✅ Fiabilité résumés (>95% succès, multi-modèle,
  retry exponentiel)
- VIG-003 ✅ UX chargement (point pulsé + texte, insight
  animation CSS, pas de curseur)
- VIG-004 ✅ Cache résumés (sessionStorage + LRU serveur)

OBJECTIF : Commencer la Phase 2 — VIG-005 : Logo mascotte + UI sobre.

Tâches à réaliser :
1. Intégrer vigilan-ai.png (dans public/) comme logo dans le
   header de l'app
2. Nettoyer l'UI des éléments superflus :
   - Simplifier les 3 couches de dégradés/blur sur ArticleCard
   - Uniformiser les ombres et espacements
   - Réduire les animations trop chargées
3. Ajouter un état vide/landing stylé avec le logo quand aucun
   article n'est sélectionné
4. Déployer sur Vercel et vérifier

INSTRUCTIONS :
- Charge le fichier docs/issues/BACKLOG.md pour le plan complet
- Consulte toujours AGENTS.md avant de coder
- Utilise Conventional Commits (feat:, fix:, refactor:)
- Explique brièvement les concepts TypeScript/React introduits
- Propose un message de commit à chaque modification majeure
- Finis chaque interaction par : ce qui a été fait, une
  proposition pour la suite, et une question pertinente

RÈGLES :
- TypeScript strict, pas de `any`
- Composants fonctionnels + Hooks React
- Tailwind CSS pour le style
- Sépare logique (hooks), types (interfaces), vue (composants)
- Ne jamais commiter de secrets (.env dans .gitignore)
- Utilise bun pour les commandes (bun install, bun run build, etc.)

Préférences utilisateur :
- Actions concrètes, pas juste des descriptions
- Explications pas-à-pas en français
- Ne pas demander de taper des commandes avant d'avoir TOUT essayé
- Le projet doit rester anonyme et ouvert (pas d'auth)
- Pense en heure française (CEST, UTC+2)
```
