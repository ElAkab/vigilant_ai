# Rapport i18n — Vigilant AI

> Document vivant. Mis à jour à chaque changement touchant l'internationalisation.
> Dernière mise à jour : 2026-06-06

---

## 📋 Vue d'ensemble

| Propriété | Valeur |
|-----------|--------|
| Langues supportées | FR, EN, NL, AR (darija marocain) |
| Dépendance externe | **Aucune** — zéro librairie |
| Clés de traduction | ~32 |
| Fichiers | 4 (frontend) + prompts serveur |
| Détection | localStorage → `navigator.language` → EN (fallback) |
| Persistance | `localStorage` (`vigilant-lang`), synchro multi-onglet |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (React 19 + TypeScript)                       │
│                                                         │
│  src/i18n/                                              │
│  ├── types.ts            ← Lang, LANGS, detection, store│
│  ├── translations.ts     ← Dictionnaire (32 clés × 4)   │
│  └── LanguageContext.tsx  ← Context + Provider + useT()  │
│                                                         │
│  Composants consommateurs :                              │
│  ├── SandboxHeader.tsx    ← subtitle, selecteur langue   │
│  ├── SearchBar.tsx        ← placeholder, sources, tri    │
│  ├── ArticlesPage.tsx     ← empty states, erreurs, reset │
│  ├── ArticleCard.tsx      ← "Publié le", "Synthèse IA"  │
│  └── SummaryModal.tsx     ← titres, loading, cached badge│
│                                                         │
├─────────────────────────────────────────────────────────┤
│  BACKEND (Bun + TypeScript)                             │
│                                                         │
│  server/routes/summarize.ts                             │
│  ├── PROMPT_TEMPLATES     ← 4 prompts localisés         │
│  ├── makePrompt()         ← injecte langue + contraintes│
│  └── cacheKey()           ← inclut lang (pas de cross-hit)│
└─────────────────────────────────────────────────────────┘
```

---

## 🔤 Ajouter une nouvelle clé de traduction

1. **Ajouter la clé** dans `src/i18n/translations.ts` :
   ```ts
   'ma.nouvelle.cle': {
     fr: '…',
     en: '…',
     nl: '…',
     ar: '…',
   },
   ```

2. **Utiliser dans le composant** :
   ```tsx
   const { t } = useT()
   // ...
   {t('ma.nouvelle.cle')}
   ```

> ⚠️ **Piège** : TypeScript force `Record<Lang, string>` — si tu oublies une langue, la compilation casse. C'est une garde-fou, pas un bug.

---

## 🌍 Ajouter une nouvelle langue

1. **Ajouter le code langue** dans `src/i18n/types.ts` :
   ```ts
   export type Lang = 'fr' | 'en' | 'nl' | 'ar' | 'de'  // ← ajouter ici
   export const LANGS: Lang[] = ['fr', 'en', 'nl', 'ar', 'de']
   export const LANG_LABELS: Record<Lang, string> = {
     fr: 'FR', en: 'EN', nl: 'NL', ar: 'AR', de: 'DE',
   }
   ```

2. **Ajouter la détection** dans `detectLang()` :
   ```ts
   if (nav.startsWith('de')) return 'de'
   ```

3. **Ajouter les traductions** pour chaque clé existante dans `translations.ts`.
   TypeScript forcera cette étape (le type `Record<Lang, string>` devient invalide si 'de' manque).

4. **Ajouter un prompt IA** dans `server/routes/summarize.ts` → `PROMPT_TEMPLATES.de`.

5. **Ajouter la langue aux validations** :
   - `server/routes/summarize.ts` ligne 90 : `const validLangs = ["fr", "en", "nl", "ar", "de"]`

---

## 🔄 Flux de détection de langue

```
1. localStorage.getItem('vigilant-lang')  ──► si trouvé → utilisé
                                              │
2. navigator.language                       ──► mapping :
   ├── fr-* → 'fr'
   ├── nl-* → 'nl'
   ├── ar-* → 'ar'
   └── …    → 'en' (fallback)
```

Le fallback est **EN** (pas FR) — décision délibérée de l'utilisateur.

---

## 🤖 Résumés IA multilingues

### Flux de données

```
useT().lang  ──►  generateSummary({ article, lang })
                      │
                      ▼
              POST /api/summarize/stream
              body: { article, maxLength, lang }
                      │
                      ▼
              makePrompt(article, maxLength, lang)
                → PROMPT_TEMPLATES[lang]
                → globalAIService.generateContentStream()
                      │
                      ▼
              SSE stream → client (renderMarkdown)
```

### Templates par langue

| Langue | Hook d'accroche | Conclusion | Section insight |
|--------|----------------|------------|-----------------|
| FR | `**En gros :**` | `Voilà.` | `### 💡 L'avis d'InsightStream` |
| EN | `**TL;DR:**` | `That's it.` | `### 💡 InsightStream's Take` |
| NL | `**Kort gezegd:**` | `Dat was het.` | `### 💡 InsightStream's Mening` |
| AR | `**باختصار:**` | `هادشي هو.` | `### 💡 رأي InsightStream` |

### Cache par langue

```ts
function cacheKey(article: Article, maxLength: number, lang?: string): string {
  return `${article.id}:${maxLength}:${lang ?? 'fr'}:${article.urlSource}`
}
```

Évite qu'un résumé FR soit servi à un utilisateur EN (et inversement).

### Fallback

Si `lang` est absent ou invalide → `'fr'` par défaut.
Validation côté serveur : `['fr', 'en', 'nl', 'ar'].includes(lang)`.

---

## 💻 Composants traduits — état des lieux

| Composant | Clés utilisées | État |
|-----------|---------------|------|
| `SandboxHeader.tsx` | `header.subtitle`, `lang.switcher` | ✅ OK |
| `SearchBar.tsx` | `search.*` (6 clés), `category.*` (3) | ✅ OK |
| `ArticlesPage.tsx` | `articles.*` (10 clés) | ✅ OK |
| `ArticleCard.tsx` | `article.*` (3 clés) | ✅ OK |
| `SummaryModal.tsx` | `summary.*` (4 clés), `loading.*` (7) | ✅ OK |

---

## 🐛 Pièges et points d'attention

### 1. Oubli d'une langue dans `translations.ts`
**Symptôme :** `tsc -b` échoue avec `Property 'nl' is missing…`
**Cause :** `Record<Lang, string>` est strict.
**Solution :** Ajouter la traduction manquante.

### 2. Cache cross-langue
**Symptôme :** Un résumé en français apparaît pour un utilisateur en anglais.
**Cause :** `cacheKey()` n'inclut pas `lang`.
**Solution :** Vérifier que `cacheKey()` inclut bien `lang` (actuellement OK).

### 3. `SummaryPanel.tsx` non traduit
Le composant `SummaryPanel.tsx` existe mais contient du texte en dur (`'Synthèse'`, `'Résumé IA'`, `'Générer un résumé'`). Il n'est pas utilisé dans le flux principal (c'est un mock/vestige), mais si on le réactive, il faudra le traduire.

### 4. Darija ≠ Arabe standard
Les traductions AR sont en **darija marocain** (pas en fos7a). Voir `references/darija-translations.md` pour la table complète et les règles linguistiques.

### 5. Direction RTL pour l'arabe
Actuellement, le `dir="rtl"` n'est **pas** appliqué automatiquement quand la langue passe en AR. Tailwind supporte `rtl:` mais ça nécessite une gestion explicite sur `<html dir="...">`.

---

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| Nombre de langues | 4 |
| Nombre de clés | ~32 |
| Nombre de composants traduits | 5 |
| Lignes dans `translations.ts` | 267 |
| Taille du dictionnaire | 7.7 KB |
| Prompts serveur localisés | 4 |
| Dépendance externe | 0 |

---

## 🔗 Références liées

- `references/darija-translations.md` — Table complète fos7a→darija
- `references/multilingual-summaries.md` — Implémentation des prompts IA multilingues
- `references/base-select-styling.md` — Style des `<select>` avec `appearance: base-select`
- `AGENTS.md` — Règles générales du projet
