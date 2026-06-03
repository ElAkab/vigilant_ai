# Vigilant AI — Backlog Structuré

**Date :** 2026-06-01  
**Auteur :** ElAkab + Hermes (PM mode)  
**État actuel :** VIG-001 ✅ terminé et déployé (pagination serveur, 1035 articles, pageSize=10)

---

## 📌 Rappel — Dépendances globales

```
VIG-001 ✅
   ↓
VIG-002 ──→ VIG-003 ──→ VIG-004    ← Phase 1 (bloquant MVP)
   ↓
VIG-005 ──→ VIG-006 ──→ VIG-007    ← Phase 2 (UX/Design, parallélisables entre eux)
   ↓                               ← VIG-008 (parallèle aux autres phases)
VIG-009 ──→ VIG-010                 ← Phase 3 (fondations, séquentiel)
                ↓
             VIG-011                 ← Phase 4 (dépend de VIG-010)
```

---

## 🔴 Phase 1 — Bloquant (MVP fiable)

---

### VIG-002 · Fiabilité des résumés IA

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔴 Bloquant |
| **Modèle recommandé** | `claude-sonnet` |

**Objectif :** Garantir un taux de succès >95% sur les résumés IA, contre ~50% actuellement. Éliminer les échecs silencieux, les timeouts non gérés et les AbortController fantômes.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Diagnostic précis :** Avant de coder, on doit instrumenter le chemin complet pour savoir OÙ ça casse. Les suspects actuels :
   - `fetchWithTimeout` dans `aiService.ts:237` — timeout hardcodé à 30s. Les modèles gratuits OpenRouter peuvent dépasser 30s.
   - `generateContentStream` dans `aiService.ts:96` — pas de retry en mode stream, un seul modèle essayé (l.106).
   - `generateContent` dans `aiService.ts:62` — boucle de fallback sur TOUS les modèles gratuits, mais sans distinction entre échecs réseau (retry OK) et échecs de contenu (retry inutile).
   - `callOpenRouterStream` l.136 — le fetch avec timeout 30s est fait UNE fois, pas de retry.

2. **Stratégie de retry :** Le frontend (`useArticleSummary.ts`) a déjà 3 tentatives (MAX_RETRIES=2, donc 3 essais) avec fallback non-stream → stream. Mais si le serveur renvoie une erreur 502 après avoir épuisé ses modèles, le frontend retente 3 fois la même erreur.

3. **Questions à trancher :**
   - Veut-on un retry intelligent côté serveur (réessayer un autre modèle après timeout) ET côté client ? Ou seulement côté serveur ?
   - Faut-il un circuit breaker (après N échecs d'un modèle, le blacklister pendant M minutes) ?
   - Le timeout de 30s est-il suffisant pour les modèles gratuits OpenRouter ? Faut-il le rendre configurable par modèle ?

4. **Points d'investigation :**
   - Loguer chaque étape : `[AI] calling model X`, `[AI] model X OK in Yms`, `[AI] model X FAILED: reason`
   - Vérifier si le `req.signal.aborted` dans `handleSummarizeStream:212` est bien propagé — si le client annule, le serveur continue-t-il à consommer des tokens ?
   - La liste des modèles gratuits (`loadModelConfig`) change chaque jour — un modèle qui marchait hier peut disparaître.

---

### VIG-003 · Fluidité streaming + délai de la note d'insight

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔴 Bloquant |
| **Modèle recommandé** | `claude-sonnet` |

**Objectif :** Supprimer les parasites visuels (loading dots fantômes, clignotement) et le délai artificiel de 600ms sur l'apparition de la « touche InsightStream ».

**Brainstorming / Spécification (à valider ensemble) :**

1. **Code concerné (identifié) :**
   - `SummaryModal.tsx:89-97` — l'insight apparaît avec `setTimeout(600ms)` APRÈS la fin du streaming. Ce délai est purement décoratif et donne une impression de lenteur.
   - `SummaryModal.tsx:75-83` — les loading dots apparaissent après 2s sans contenu. Logique correcte, mais le reset passe par un `setTimeout(0)` (microtask forcée) qui peut causer un flash.
   - `SummaryModal.tsx:56-59` — `showLoadingDots` et `insightVisible` sont deux états distincts, ce qui cause 2 re-renders inutiles.

2. **Ce qu'on veut :**
   - Streaming continu : le curseur clignotant (`isStreaming`) doit être le SEUL indicateur de chargement une fois que le premier chunk arrive.
   - L'insight doit apparaître DÈS la fin du streaming, sans délai artificiel. L'animation CSS (`transition-all duration-700`) suffit à donner une arrivée fluide.
   - Plus aucun flash entre le streaming et l'état final.

3. **Questions à trancher :**
   - Garde-t-on le délai de 2s pour les loading dots (cas où le serveur tarde vraiment) ? → Oui, c'est une bonne UX. Le problème c'est le reset.
   - L'animation CSS de 700ms sur l'insight suffit-elle sans le setTimeout ? → Oui, `translate-y-3 → translate-y-0` avec `opacity 0→1` est déjà fluide.
   - Faut-il merger `SummaryModal` et `SummaryPanel` ? Les deux composants dupliquent `renderMarkdown` et la logique d'affichage.

4. **Points d'investigation :**
   - Le `useArticleSummary` hook (l.63-65) met à jour le state avec `prev.summary ?? '' + delta` à chaque delta. Si le stream va vite, ça peut causer des re-renders en rafale → un `useDeferredValue` ou un debounce léger pourrait lisser l'affichage.

---

### VIG-004 · Cache des résumés : affichage instantané

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔴 Bloquant |
| **Modèle recommandé** | `claude-haiku` |

**Objectif :** Un résumé déjà généré doit s'afficher IMMÉDIATEMENT (sans loader, sans appel réseau) quand l'utilisateur reclique sur le même article.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Deux niveaux de cache existent déjà :**
   - **Serveur :** `summaryCache` (SimpleLRU, 100 entrées) dans `summarize.ts:36` — clé = `article.id:maxLength:urlSource`.
   - **Client :** `sessionStorage` dans `useArticleSummary.ts:21-35` — clé = `article.id`.

2. **Pourquoi le rechargement n'est pas fluide :**
   - Le hook `useArticleSummary` vérifie `getCached()` uniquement dans `generateSummary()` (l.84). Si le cache existe, il fait `setState({ summary: cached, loading: false })` — pas d'appel réseau. ✅
   - **Mais** le composant `SummaryModal` ne connaît pas le cache. Il reçoit `summary`, `isLoading`, `error` comme props. Si le parent appelle `generateSummary()`, le hook met `loading: true` puis immédiatement `loading: false` avec le cache → micro-flash.
   - La fonction `reset()` (l.51-56) efface TOUT y compris le cache visuel. Si l'utilisateur ferme/rouvre la modale, le parent appelle peut-être `reset()` → le cache sessionStorage est toujours là mais le state visuel est vidé.

3. **Questions à trancher :**
   - Veut-on un cache plus persistant que `sessionStorage` (survit au rechargement d'onglet) ? → `localStorage` avec TTL.
   - Faut-il afficher un badge « Résumé en cache » ou « Généré il y a X minutes » ?
   - Le cache serveur LRU de 100 entrées est en mémoire → perdu au redémarrage. Est-ce acceptable pour le MVP ? → Oui.

4. **Solution probable :**
   - Dans `useArticleSummary`, retourner `getCached()` de manière synchrone avant même le premier render (via `useState` initializer).
   - Supprimer le `loading: true` quand le cache hit est détecté (pas de transition d'état → pas de flash).
   - Ajouter un timestamp au cache pour affichage optionnel.

---

## 🟡 Phase 2 — Important (UX/Design)

---

### VIG-005 · Logo mascotte + UI sobre

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 Important |
| **Modèle recommandé** | `claude-sonnet` |

**Objectif :** Intégrer `vigilan-ai.png` comme mascotte/logo de l'app, réduire les éléments visuels superflus pour une interface plus sobre et professionnelle.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Emplacement du logo :** Le fichier est déjà dans `dist/vigilan-ai.png` (donc dans le build Vite). Reste à l'intégrer dans l'UI :
   - Header de l'app ?
   - Favicon (`dist/vigilan-ai.ico` existe déjà) ?
   - Loader personnalisé (remplacer les 3 dots) ?
   - Page d'accueil / état vide ?

2. **Ce qui est superflu aujourd'hui :**
   - Les dégradés complexes sur les cartes (`ArticleCard.tsx:23`) : 3 couches de blur, 2 overlays.
   - Le composant `SummaryPanel` (utilisé en parallèle de `SummaryModal` ?) — à clarifier.
   - Les animations de hover peut-être trop chargées.

3. **Questions à trancher :**
   - Le logo doit-il apparaître partout ou seulement sur la landing page ?
   - Veut-on un thème clair/sombre cohérent avec la charte du logo ?
   - « UI sobre » veut-il dire minimaliste (moins d'ombres, moins de dégradés) ou juste mieux organisé ?

4. **Points d'investigation :**
   - `vite.config.ts` — le fichier PNG est-il bien dans `public/` ou seulement dans `dist/` ? Si seulement dans dist, il sera perdu au prochain build.

---

### VIG-006 · Miniatures universelles

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 Important |
| **Modèle recommandé** | `claude-sonnet` |

**Objectif :** Garantir une image pour chaque article, y compris ceux qui n'en fournissent pas (Le Monde, OpenAI, Cloudflare). Solution générique par `og:image`, favicon, ou fallback textuel.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Code actuel (`ArticleCard.tsx:28-43`) :**
   - Si `article.imageUrl` existe → balise `<img>`.
   - Sinon → fallback textuel avec le `sourceLabel` en grand.

2. **Approches possibles :**

   | Option | Principe | Effort | Solidité |
   |--------|----------|--------|----------|
   | A. `og:image` côté serveur | Le serveur fetch la page HTML, parse `<meta property="og:image">`, stocke l'URL | ~2h | ⭐⭐⭐ Fonctionne pour 90% des sites |
   | B. Favicon Google API | `https://www.google.com/s2/favicons?domain=X&sz=128` | ~15min | ⭐⭐ Petite, pixelisée, dépend de Google |
   | C. Capture d'écran headless | Puppeteer/Playwright pour capturer la page | ~4h | ⭐⭐⭐⭐ Lourd, lent, coûteux en ressources |
   | D. Fallback par dégradé de couleur | Générer un dégradé unique basé sur le hash du domaine (style GitHub avatars) | ~30min | ⭐⭐ Esthétique mais pas informatif |

   **Recommandation :** **A (og:image) + B (favicon fallback)** — le serveur tente og:image, si échec → favicon Google, si échec → fallback textuel actuel. Le tout avec un cache TTL de 24h pour ne pas refetch chaque image à chaque requête.

3. **Questions à trancher :**
   - L'extraction `og:image` se fait côté serveur (endpoint `/api/thumbnail?url=...`) ou en cron job ?
   - Faut-il un proxy d'image pour éviter les CORS / hotlinking ?
   - Taille des miniatures uniforme ou respecter le ratio d'origine ?

---

### VIG-007 · Tri par catégories

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 Important |
| **Modèle recommandé** | `claude-sonnet` |

**Objectif :** Ajouter des boutons de filtre (Tech, Géopolitique, Jeux vidéo, Général) pour permettre à l'utilisateur de trier les articles par domaine.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Où classer ? Deux approches :**

   | Option | Principe | Effort | Solidité |
   |--------|----------|--------|----------|
   | A. Classification par source | Chaque source RSS a une catégorie fixe : Le Monde → Géopolitique, Frandroid → Tech, etc. | ~1h | ⭐⭐ Rigide, un flux peut couvrir plusieurs sujets |
   | B. Classification par LLM | Un modèle léger (Haiku) classe chaque article par catégorie au moment du fetch RSS | ~3h | ⭐⭐⭐⭐ Flexible, coût tokens modéré |
   | C. Classification hybride | Source donne une catégorie par défaut, LLM peut la surcharger si le titre/résumé correspondent à une autre | ~2h | ⭐⭐⭐ Bon compromis |

   **Recommandation :** **A pour le MVP** (ajouter un champ `category` à `RssSource`), puis **migrer vers C** plus tard. C'est simple, immédiat, et couvre déjà les 4 sources.

2. **Catégories proposées pour les sources actuelles :**
   - `openai-blog` → Tech
   - `cloudflare-blog` → Tech
   - `le-monde` → Géopolitique
   - `frandroid` → Tech

   → Il manque « Jeux vidéo » et « Général ». Faut-il ajouter des sources (Kotaku, etc.) ou accepter que certaines catégories soient vides ?

3. **Questions à trancher :**
   - Les catégories sont-elles fixes ou veut-on que l'utilisateur puisse en créer ?
   - Filtrage côté client (reçu tous les articles, filtre local) ou côté serveur (`?category=tech`) ?
   - L'UI : boutons horizontaux type « chips » en haut de la liste d'articles ?

---

### VIG-008 · Internationalisation (i18n)

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟡 Important |
| **Modèle recommandé** | `claude-sonnet` |

**Objectif :** Adapter l'interface utilisateur ET les prompts LLM à la langue de l'utilisateur (FR par défaut, EN, ES dans un second temps).

**Brainstorming / Spécification (à valider ensemble) :**

1. **Périmètre concerné :**
   - **UI :** Tous les textes statiques dans les composants React (boutons, labels, messages d'erreur).
   - **Prompts LLM :** `makePrompt()` dans `summarize.ts:44` — actuellement tout en français hardcodé.

2. **Approches :**

   | Option | Principe | Effort | Solidité |
   |--------|----------|--------|----------|
   | A. `react-i18next` | Librairie standard React : JSON par langue, hook `useTranslation()`, détection navigateur | ~4h | ⭐⭐⭐⭐ Standard, mature, lazy-loading |
   | B. `next-intl` / formatjs | Plus lourd, orienté Next.js | ~6h | ⭐⭐⭐ Surdimensionné pour Vite |
   | C. Solution maison légère | Un contexte React + un objet JSON chargé dynamiquement | ~2h | ⭐⭐ Réinvente la roue, maintenance future |

   **Recommandation :** **A (`react-i18next`)** — c'est le standard pour Vite/React, bien documenté, et permet le lazy-loading des traductions par langue.

3. **Prompts LLM :**
   - Ajouter une variable `lang` dans le prompt : `Tu es un assistant de veille... Résume en {lang}...`
   - La détection de langue côté serveur : en-tête `Accept-Language` ou paramètre explicite.

4. **Questions à trancher :**
   - Langues cibles exactes ? FR (défaut), EN, ES ? Ou aussi DE, ZH ?
   - Les articles restent dans leur langue d'origine — seul le résumé et l'UI sont traduits.
   - Qui gère la trad ? Fichiers JSON manuels ou service externe ?

---

## 🟢 Phase 3 — Fondations (Sécurité & Architecture)

---

### VIG-009 · Audit de sécurité

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟢 Important (fondation) |
| **Modèle recommandé** | `claude-opus` |

**Objectif :** Audit complet de sécurité avant toute exposition multi-utilisateurs ou production publique. Injection, CORS, rate limiting, secrets, CSP, dépendances.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Périmètre d'audit (checklist) :**

   | Domaine | Statut actuel | Risque |
   |---------|---------------|--------|
   | **Injection** | `clip()` tronque les prompts, pas d'échappement HTML côté serveur | 🟡 Moyen — les résumés LLM passent par `dangerouslySetInnerHTML` |
   | **CORS** | Pas de headers CORS explicites — le backend et le frontend sont sur la même origine (VPS) | 🟢 OK pour le MVP mono-origine |
   | **Rate limiting** | `checkRateLimit()` existe dans `rateLimit.ts` — 60 req/min pour articles, 12/5min pour summarize | 🟡 OK basique, pas de blocage par IP persistante |
   | **Secrets** | `.env` dans `.gitignore` ✅, `OPENROUTER_API_KEY` utilisé côté serveur ✅ | 🟢 OK |
   | **CSP** | Pas de Content-Security-Policy | 🔴 Manquant — XSS possible si un résumé LLM contient du JS |
   | **Dépendances** | `bun.lock` présent, pas d'audit automatique (`bun audit` n'existe pas encore) | 🟡 À vérifier manuellement |
   | **Path traversal** | `serveStatic()` vérifie `..` ✅ | 🟢 OK |
   | **Payload size** | `content-length > 40000` rejeté ✅ | 🟢 OK |
   | **Sanitization HTML** | `renderMarkdown()` dans `SummaryModal.tsx` convertit `**bold**` en `<strong>` — pas de sanitizer | 🔴 Risque XSS si le LLM répond avec du HTML/JS |

2. **Points critiques identifiés :**
   - **XSS via résumé LLM :** Un LLM peut théoriquement générer `<script>alert(1)</script>` dans un résumé. Actuellement, `renderMarkdown` ne strip PAS les balises HTML inconnues. Besoin de DOMPurify ou `sanitize-html`.
   - **CSP headers :** Ajouter `Content-Security-Policy` dans les réponses HTTP.
   - **Rate limiting :** La Map `buckets` dans `rateLimit.ts` n'est jamais nettoyée → fuite mémoire sur des mois d'uptime.

3. **Questions à trancher :**
   - Niveau de sécurité cible : « suffisant pour un SaaS B2C » ou « MVP, on corrige le critique seulement » ?
   - Audit manuel ou outil automatisé (Snyk, Socket.dev, npm audit via bun) ?
   - Faut-il un WAF devant le VPS (Cloudflare gratuit) ?

---

### VIG-010 · Support multi-utilisateurs

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🟢 Important (fondation) |
| **Modèle recommandé** | `claude-opus` |

**Objectif :** Permettre à plusieurs utilisateurs de se connecter avec leurs propres préférences, historique de résumés, et quotas. Pose les fondations de la base de données et de l'authentification.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Architecture actuelle (single-user) :**
   - Pas de base de données — tout est en mémoire (cache LRU, rate limit Map).
   - Pas d'authentification — une seule `OPENROUTER_API_KEY` pour tous.
   - `sessionStorage` côté client — les résumés sont liés au navigateur, pas à l'utilisateur.

2. **Décisions architecturales à trancher :**

   | Question | Options |
   |----------|---------|
   | **Base de données** | SQLite (turso/libsql) → simple, gratuit, edge-ready. Ou PostgreSQL → plus classique. |
   | **Authentification** | OAuth Google/GitHub → pas de gestion de mots de passe. Ou magic link email → plus simple. |
   | **API Key par utilisateur** | Chaque user a sa propre `OPENROUTER_API_KEY` ? Ou une clé shared + tracking par user ? |
   | **Cache par userId** | `summaryCache` doit devenir `Map<userId, LRU>` ou aller en DB. |
   | **Migrations** | Drizzle ORM ou Kysely pour les migrations TypeScript-safe ? |

3. **Schéma DB probable :**
   ```sql
   users (id, email, name, avatar_url, created_at)
   user_preferences (user_id, lang, theme, categories)
   summaries (id, user_id, article_id, content, created_at)
   api_usage (user_id, date, tokens_used, model)
   ```

4. **Impact sur le code existant :**
   - Tous les endpoints doivent identifier l'utilisateur (middleware `req.userId`).
   - Le rate limiting passe de `IP` à `userId`.
   - Le cache passe de global à scopé par `userId`.

5. **Questions à trancher :**
   - Combien d'utilisateurs prévus ? <100 = SQLite suffit, >1000 = PostgreSQL.
   - Gratuit ou freemium ? La réponse détermine si on tracke l'usage API par utilisateur.
   - Hébergement DB : sur le VPS (simple) ou service externe (Turso, Neon, Supabase) ?

---

## 🔵 Phase 4 — Évolution future

---

### VIG-011 · Synthèses quotidiennes par email

| Champ | Valeur |
|-------|--------|
| **Priorité** | 🔵 Évolution future |
| **Modèle recommandé** | `claude-sonnet` |

**Objectif :** Envoyer chaque jour un email contenant un résumé des articles importants de la veille, personnalisé selon les catégories préférées de l'utilisateur.

**Brainstorming / Spécification (à valider ensemble) :**

1. **Dépendance dure :** VIG-010 (multi-utilisateurs) car l'email est personnel.

2. **Architecture probable :**
   - Cron job côté serveur (Bun `setInterval` ou cron système).
   - Service d'email : Resend (gratuit 100 emails/jour) ou SendGrid (100/jour gratuit aussi).
   - Template HTML pour l'email avec les 3-5 articles les plus pertinents.

3. **Questions à trancher :**
   - Fréquence : une fois par jour à quelle heure ? Configurable par utilisateur ?
   - Contenu : résumé LLM de TOUS les articles du jour ou sélection des plus importants ?
   - Désabonnement : lien en bas de l'email obligatoire (légal).

---

## 📊 Synthèse et roadmap

| Phase | Tickets | Charge estimée | Dépend de |
|-------|---------|---------------|-----------|
| 🔴 Phase 1 | VIG-002, VIG-003, VIG-004 | 6-10h | VIG-001 ✅ |
| 🟡 Phase 2 | VIG-005, VIG-006, VIG-007, VIG-008 | 10-16h | Rien (parallélisable) |
| 🟢 Phase 3 | VIG-009, VIG-010 | 10-20h | Phase 1 terminée |
| 🔵 Phase 4 | VIG-011 | 4-6h | VIG-010 |
| **Total** | **11 tickets** | **30-52h** | |

### Ordre de bataille recommandé

```
SEMAINE 1 : VIG-002 → VIG-003 → VIG-004  (MVP fiable, tu peux demo)
SEMAINE 2 : VIG-005 + VIG-006 (UI propre) + VIG-008 (i18n) en //
SEMAINE 3 : VIG-007 (catégories) + VIG-009 (sécu) en //
SEMAINE 4 : VIG-010 (multi-user) — le plus gros morceau
SEMAINE 5 : VIG-011 (emails)
```

---

> **Next step :** Attends le feu vert pour lancer la spec détaillée de VIG-002.
