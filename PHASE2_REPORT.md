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

## 🔄 Phase 2 — VIG-005 · Logo mascotte + UI sobre (EN COURS)

### Terminé

| Sous-tâche | Statut |
|-----------|--------|
| Header frosted glass (`SandboxHeader`) avec logo 32px | ✅ |
| Suppression des 3 couches/orbes sur `ArticleCard` | ✅ |
| Design system unifié (bordures `[0.04-0.06]`, backdrop-blur) | ✅ |
| Sous-titre centré sur mobile | ✅ |
| État vide : message sobre, mention dev discrète | ✅ |
| « Fil d'articles » centré mobile, description supprimée | ✅ |
| Point compteur : vert si >1 article, rouille sinon | ✅ |
| Message patientez dans la modale d'erreur | ✅ |

### Reste à faire

- État vide / landing page avec logo centré
- Nettoyer `index.css` (radial-gradients body, `@keyframes va-card-in`)
- Réduire bouton « Exemple de flux RSS » dans l'état vide

---

## 🐛 Correctifs (hors ticket)

| Correctif | Fichiers |
|-----------|----------|
| Stream crash `Controller already closed` → try-catch | `server/routes/summarize.ts` |
| Timeout lecture 90s + `reader.cancel()` | `src/services/summarizationService.ts` |
| Barre de progression + messages évolutifs dans la modale | `src/components/SummaryModal.tsx` |

---

## 📁 Fichiers modifiés (Phase 1 + 2)

| Fichier | Changements |
|---------|-------------|
| `src/components/SandboxHeader.tsx` | **Nouveau** — header frosted glass slim (56px), logo, stats pill |
| `src/pages/ArticlesPage.tsx` | Header remplacé, messages épurés, padding réduit |
| `src/components/ArticleCard.tsx` | −3 couches de fond, −2 orbes → 1 couche propre |
| `src/components/SummaryModal.tsx` | Barre progression + 4 stages de chargement |
| `src/services/summarizationService.ts` | Timeout 90s, `reader.cancel()` |
| `server/routes/summarize.ts` | `controller.close()` try-catch |
| `server/lib/aiService.ts` | Multi-model fallback, retry exponentiel, timeout 45s |
| `src/hooks/useArticleSummary.ts` | Cache sessionStorage, inFlightRef |
| `src/index.css` | `--animate-insight-appear`, `@keyframes insight-appear` |
| `vite.config.ts` | Proxy `/api` → localhost:8788 |
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
- 1045 articles en base, 4 sources RSS
  (OpenAI, Cloudflare, Le Monde, Frandroid)

ÉTAT ACTUEL :
Phase 1 TERMINÉE (VIG-001 à VIG-004 : pagination, fiabilité résumés,
UX chargement, cache).
Phase 2 EN COURS — VIG-005 (Logo mascotte + UI sobre) :
- ✅ Header frosted glass avec logo 32px (SandboxHeader.tsx)
- ✅ ArticleCard nettoyée (−2 orbes, −3 couches de fond)
- ✅ Design system unifié (bordures subtiles, backdrop-blur)
- ✅ Sous-titre centré mobile, messages épurés
- ✅ Barre de progression + timeout 90s sur les résumés IA
- ❌ État vide / landing page avec logo centré
- ❌ Nettoyage index.css (radial-gradients, keyframes)
- ❌ Bouton "Exemple de flux RSS" à réduire

OBJECTIF : Terminer VIG-005, puis attaquer la suite du backlog.

Tâches restantes pour VIG-005 :
1. Créer un état vide/landing stylé avec le logo centré quand
   aucun article n'est sélectionné (ou première visite)
2. Nettoyer index.css : supprimer/simplifier les radial-gradients
   du body et les keyframes inutilisées
3. Réduire le bouton "Exemple de flux RSS" dans l'état vide
4. Déployer sur Vercel et vérifier le rendu final

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

Préférences utilisateur :
- Actions concrètes, pas juste des descriptions
- Explications pas-à-pas en français
- Brainstorming AVANT de coder (options techniques + tradeoffs)
- Le projet doit rester anonyme et ouvert (pas d'auth)
- Pour les effets visuels complexes, utiliser une lib externe
  plutôt que du CSS custom
- Pense en heure française (CEST, UTC+2)
```
