# 🦉 Vigilant AI

> *"Too many articles to read every morning? Summarize them in one click."*

I'm a fullstack developer in training, and like many people, I spend my mornings scrolling through dozens of tech articles. Every time, it's the same pattern: open 15 tabs, read 3, save the other 12 for "later" (spoiler: later never comes).

**What if I could synthesize all that in one click?**

That's how **Vigilant AI** was born: a news aggregator that fetches fresh articles from RSS feeds, and — with a single click on "✨ AI Summary" — serves up an intelligent, insightful summary, with a touch of humor (because news is better when it makes you smile).

---

## 🧠 How it works (simple version)

1. 🕸️ Vigilant AI reads RSS feeds (OpenAI, Le Monde, Frandroid, etc.)
2. 📋 It displays the articles in a clean interface, like an editorial dashboard
3. ✨ You click **"AI Summary"** on the article that interests you
4. 🤖 The server calls a free AI model (via OpenRouter) that summarizes the article in English
5. 💡 It even throws in a little personal take with a dash of humor

All without paying a cent for API calls. The secret? Free models on [OpenRouter](https://openrouter.ai/) and an automatic fallback system that switches models if one fails.

*(It's an MVP — the summary is mocked when no API is configured, but 100% functional when it is!)*

---

## 🛠️ My "dev freemium" strategy

Since I'm working without a big budget, I went with **free at every level**. Here's how:

### 👨‍💻 AI agents to assist me (for free)

Rather than choosing ONE AI assistant, I've placed my **agent rules** in several locations so that EVERY assistant can read them:

| File | Used by | Free? |
|------|---------|-------|
| `.cursor/rules` | Cursor IDE (Claude/GPT integrated) | Freemium (200 requests/month) 🦀 |
| `.github/copilot-instructions.md` | GitHub Copilot (VS Code, Antigravity) | Freemium (student/starter) |
| `AGENTS.md` | Hermes Agent, Claude Code, any compatible agent | 100% free 🎉 |

This lets me switch from Cursor to VS Code to Antigravity **without losing my instructions** — every assistant knows how to code, what conventions to follow, and how to talk to me.

> 💡 **Tip**: the rules are identical across all 3 files. If I modify one, the others stay in sync — like a DNS alias but for AI assistants. 😄

---

## 🧱 Architecture (from simple to technical)

### "What even is this" version 🐣

```
Web RSS Feeds ──► Bun Server ──► OpenRouter (Free AI)
                       │
                  React Interface
                  (Vigilant AI)
```

### "Let's code together" version 🐥

```
┌──────────────────────────────────────────────────┐
│  Frontend (React 19 + Vite 8 + Tailwind 4)       │
│  → src/pages, components/, hooks/, services/      │
│  → /api/articles and /api/summarize endpoints     │
└──────────────────┬───────────────────────────────┘
                   │ HTTP
┌──────────────────▼───────────────────────────────┐
│  Backend (Bun + TypeScript)                       │
│  → server/routes/articles.ts (RSS feed fetching)  │
│  → server/routes/summarize.ts (AI summary + SSE) │
│  → server/lib/aiService.ts (OpenRouter, fallback)│
│  → server/lib/rss.ts (RSS parser, images)        │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│  External Services                                │
│  → OpenRouter (free AI models)                    │
│  → RSS Feeds (OpenAI, Le Monde, Frandroid...)    │
└──────────────────────────────────────────────────┘
```

### "PR-ready" version 🦉

| File | Role |
|------|------|
| `server/index.ts` | Single entry point: serves the frontend **and** the API |
| `server/lib/aiService.ts` | 300 lines of resilience: 30s timeout, automatic model fallback, stream (SSE) and non-stream modes, built-in mock |
| `server/lib/rss.ts` | RSS parser with image extraction (enclosure, media:content, HTML regex) |
| `server/routes/summarize.ts` | 240 lines: payload validation, rate limiting (12 req/5min), LRU cache (100 entries), SSE streaming with long-polling |
| `server/config/models.ts` | Dynamic loading of free models from the OpenRouter API |
| `src/pages/ArticlesPage.tsx` | 250 lines: pagination (5/page), click selection, summary modal, loading state, empty state, error handling |
| `src/components/SummaryModal.tsx` | 185 lines: custom Markdown rendering, AI opinion fade-in animation (1.5s), Escape key handling, blurred overlay |
| `src/hooks/useArticleSummary.ts` | Summary hook with streaming + automatic non-stream fallback |

---

## 📦 Tech Stack

| Category | Technology | Why |
|----------|-----------|-----|
| **Runtime** | Bun | Faster than Node, reads native .ts, installs in milliseconds |
| **Frontend** | React 19 + TypeScript 6 | Reactive components, strict typing |
| **Build** | Vite 8 | Instant startup, native HMR |
| **Style** | Tailwind CSS 4 | Utility-first, responsive, dark theme |
| **Lint** | ESLint 10 | `no-explicit-any`, `no-unused-vars`, strict rules |
| **CI/CD** | GitHub Actions + Vercel | Lint + build on every push, continuous deployment |
| **AI** | OpenRouter (free models) | Zero cost, automatic fallback |
| **Deployment** | Hostinger VPS (Docker) | Full control, no limits |

---

## 🚀 Deployment & CI/CD

- **Frontend**: [vigilant-ai-ebon.vercel.app](https://vigilant-ai-ebon.vercel.app)
- **API**: Hostinger VPS (port 8788 exposed via socat)
- **CI**: GitHub Actions runs lint + build on every push/PR

```yaml
# .github/workflows/ci.yml
lint → ESLint
build → tsc + vite build
```

---

## 🏁 Quick Start

```bash
# 1. Clone
git clone https://github.com/ElAkab/vigilant_ai.git
cd vigilant_ai

# 2. Install Bun (if not already)
curl -fsSL https://bun.sh/install | bash

# 3. Install dependencies
bun install

# 4. Configure environment
cp .env.example .env
# Edit .env → add OPENROUTER_API_KEY (or leave MOCK_AI=true)

# 5. Start the backend (serves frontend + API)
cd /workspace/vigilant_ai && PORT=8787 bun run server/index.ts

# 6. Open http://localhost:8787
```

---

## 🤝 Contributing

The project uses **Conventional Commits** (`feat:`, `fix:`, `refactor:`, `ci:`, `docs:`).

Before every PR:
- `.env` contains no secrets ✅
- `OPENROUTER_API_KEY` is server-side only ✅
- `bun run lint` passes ✅
- `bun run build` passes ✅

---

*Made with ☕, free AI models, and a whole lot of humility — by a dev in training who just wanted to read fewer articles.*
