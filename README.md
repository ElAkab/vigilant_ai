# 🦉 Vigilant AI

> *"Trop d'articles à lire chaque matin ? Résume-les en un clic."*

Je suis développeur fullstack en apprentissage, et comme beaucoup de monde, je passe mes matinées à scroller des dizaines d'articles tech. À chaque fois, le même schéma : ouvrir 15 onglets, en lire 3, sauvegarder les 12 autres pour "plus tard" (spoiler : c'est jamais plus tard).

**Et si je pouvais synthétiser tout ça en un clic ?**

C'est comme ça qu'est né **Vigilant AI** : un agrégateur de veille qui va chercher des articles frais dans des flux RSS, et qui — d'un simple clic sur "✨ Synthèse IA" — te pond un résumé intelligent, critique, et même avec une touche d'humour (parce que l'info, c'est mieux quand ça fait sourire).

---

## 🧠 Comment ça marche (version simple)

1. 🕸️ Vigilant AI va lire des flux RSS (OpenAI, Le Monde, Frandroid, etc.)
2. 📋 Il affiche les articles dans une interface propre, façon tableau de bord éditorial
3. ✨ Tu cliques sur **"Synthèse IA"** sur l'article qui t'intéresse
4. 🤖 Le serveur appelle un modèle d'IA gratuit (via OpenRouter) qui résume l'article en français
5. 💡 Il ajoute même un petit avis personnel avec une pointe d'humour

Tout ça sans payer un centime d'API. Le secret ? Des modèles gratuits sur [OpenRouter](https://openrouter.ai/) et un système de fallback automatique qui change de modèle si l'un d'eux plante.

*(C'est un MVP — le résumé est mocké quand l'API est absente, mais 100% fonctionnel quand elle est configurée !)*

---

## 🛠️ Ma stratégie "dev freemium"

Étant donné que je bosse sans gros budget, j'ai misé sur la **gratuité à tous les étages**. Voici comment :

### 👨‍💻 Des agents IA pour m'assister (gratuitement)

Plutôt que de choisir UN seul assistant IA, j'ai placé mes **règles agent** à plusieurs endroits du projet, pour que CHAQUE assistant puisse les lire :

| Fichier | Utilisé par | Gratuit ? |
|---------|------------|-----------|
| `.cursor/rules` | Cursor IDE (Claude/GPT intégré) | Freemium (200 requêtes/mois) 🦀 |
| `.github/copilot-instructions.md` | GitHub Copilot (VS Code, Antigravity) | Freemium (étudiant/starter) |
| `AGENTS.md` | Hermes Agent, Claude Code, tout agent compatible | 100% gratuit 🎉 |

Ça me permet de passer de Cursor à VS Code à Antigravity **sans perdre mes instructions** — chaque assistant sait comment coder, quelles conventions suivre, et comment me parler.

> 💡 **Astuce** : les règles sont identiques dans les 3 fichiers. Si j'en modifie une, les autres se synchronisent — comme un alias DNS mais pour les assistants IA. 😄

---

## 🧱 Architecture (du simple au technique)

### Version "c'est quoi ce bazar" 🐣

```
Flux RSS du web ──► Serveur Bun ──► OpenRouter (IA gratuite)
                         │
                    Interface React
                    (Vigilant AI)
```

### Version "je code avec toi" 🐥

```
┌──────────────────────────────────────────────────┐
│  Frontend (React 19 + Vite 8 + Tailwind 4)       │
│  → src/pages, components/, hooks/, services/      │
│  → Appels /api/articles et /api/summarize         │
└──────────────────┬───────────────────────────────┘
                   │ HTTP
┌──────────────────▼───────────────────────────────┐
│  Backend (Bun + TypeScript)                       │
│  → server/routes/articles.ts (flux RSS)           │
│  → server/routes/summarize.ts (résumé IA + SSE)  │
│  → server/lib/aiService.ts (OpenRouter, fallback)│
│  → server/lib/rss.ts (parseur RSS, images)       │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│  Services externes                                │
│  → OpenRouter (modèles IA gratuits)               │
│  → Flux RSS (OpenAI, Le Monde, Frandroid...)     │
└──────────────────────────────────────────────────┘
```

### Version "pull request prête" 🦉

| Fichier | Rôle |
|---------|------|
| `server/index.ts` | Point d'entrée unique : sert le frontend **et** l'API |
| `server/lib/aiService.ts` | 300 lignes de résilience : timeout 30s, fallback automatique sur tous les modèles, mode stream (SSE) et non-stream, mock intégré |
| `server/lib/rss.ts` | Parseur RSS avec extraction d'images (enclosure, media:content, regex HTML) |
| `server/routes/summarize.ts` | 240 lignes : validation des payloads, rate limiting (12 req/5min), cache LRU (100 entrées), streaming SSE avec long-polling |
| `server/config/models.ts` | Chargement dynamique des modèles gratuits depuis l'API OpenRouter |
| `src/pages/ArticlesPage.tsx` | 250 lignes : pagination (5/page), sélection par clic, modale de résumé, état de chargement, état vide, erreurs |
| `src/components/SummaryModal.tsx` | 185 lignes : rendu Markdown custom, animation d'apparition de l'avis IA (1.5s), gestion Échap, overlay flouté |
| `src/hooks/useArticleSummary.ts` | Hook de résumé avec streaming + fallback automatique non-stream |

---

## 📦 Stack technique

| Catégorie | Techno | Pourquoi |
|-----------|--------|----------|
| **Runtime** | Bun | Plus rapide que Node, lit les .ts natifs, install en millisecondes |
| **Frontend** | React 19 + TypeScript 6 | Composants réactifs, typage strict |
| **Build** | Vite 8 | Démarrage instantané, HMR natif |
| **Style** | Tailwind CSS 4 | Utilitaire, responsive, thème sombre |
| **Lint** | ESLint 10 | `no-explicit-any`, `no-unused-vars`, règles strictes |
| **CI/CD** | GitHub Actions + Vercel | Lint + build auto à chaque push, déploiement continu |
| **IA** | OpenRouter (modèles gratuits) | Zéro coût, fallback automatique |
| **Déploiement** | VPS Hostinger (Docker) | Contrôle total, pas de limite |

---

## 🚀 Déploiement & CI/CD

- **Frontend** : [vigilant-ai-ebon.vercel.app](https://vigilant-ai-ebon.vercel.app)
- **API** : VPS Hostinger (port 8788 exposé via socat)
- **CI** : GitHub Actions vérifie le lint + build à chaque push/PR

```yaml
# .github/workflows/ci.yml
lint → ESLint
build → tsc + vite build
```

---

## 🏁 Quick Start

```bash
# 1. Cloner
git clone https://github.com/ElAkab/vigilant_ai.git
cd vigilant_ai

# 2. Installer Bun (si pas déjà fait)
curl -fsSL https://bun.sh/install | bash

# 3. Installer les dépendances
bun install

# 4. Configurer l'environnement
cp .env.example .env
# Éditer .env → ajouter OPENROUTER_API_KEY (ou laisser MOCK_AI=true)

# 5. Lancer le backend (sert frontend + API)
cd /workspace/vigilant_ai && PORT=8787 bun run server/index.ts

# 6. Ouvrir http://localhost:8787
```

---

## 🤝 Contribuer

Le projet utilise **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `ci:`, `docs:`).

Avant chaque PR :
- `.env` ne contient pas de secret ✅
- `OPENROUTER_API_KEY` utilisé côté serveur uniquement ✅
- `bun run lint` passe ✅
- `bun run build` passe ✅

---

*Fait avec ☕, des modèles IA gratuits, et beaucoup d'humilité — par un dev en apprentissage qui voulait juste lire moins d'articles.*
