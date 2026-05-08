---
name: anthropic-skills-cli-bun
description: Installs or updates Anthropic's frontend-design (and related) Cursor skills via the universal skills CLI using Bun (`bunx`). Use when the user asks for bun skills add, anthropics/skills, syncing frontend-design, or reinstalling Agent Skills from GitHub Anthropic avec Bun.
disable-model-invocation: true
---

# CLI « skills » avec Bun pour anthropics/skills

## Point important sur Bun

Bun **ne fournit pas** la sous-commande `skills`. Le package NPM `skills` s’invoque avec **`bunx skills`** (équivalent de `npx skills`).

Référence textuelle demandée :

```
bun skills add https://github.com/anthropics/skills --skill frontend-design
```

Forme fonctionnelle à exécuter depuis la racine du dépôt :

```
bunx skills add https://github.com/anthropics/skills --skill frontend-design -y --agent cursor
```

- **`--agent cursor`** : cible Cursor explicitement si besoin (le CLI peut auto-détecter).
- **`-y`** : pas de prompts (adapté CI ou scripts).

Installation **globale** (tous les projets utilisateur Cursor) : ajouter `-g`.

Lister les skills disponibles dans ce dépôt sans installer :

```
bunx skills add https://github.com/anthropics/skills -l
```

## Contexte du skill `frontend-design`

Une fois installé, la skill **`frontend-design`** oriente vers des interfaces web abouties et visuellement marquées (typographie, couleurs, mouvement, composition), avec consigne explicite d’éviter les esthétiques génériques type « slop » IA. Le source canonique vit sous `skills/frontend-design/` dans [`anthropics/skills`](https://github.com/anthropics/skills).

## Où sont les fichiers

Après ajout projet, les fichiers peuvent résider sous **`.agents/skills/<nom-de-la-skill>/`** (ex. pour `frontend-design` : `SKILL.md`, etc.). Un **`skills-lock.json`** à la racine permet de retrouver ou synchroniser une installation compatible équipe.

Pour d’autres packages skills (ex. Vercel), voir [.cursor/skills/vercel-skills-cli-bun/SKILL.md](../vercel-skills-cli-bun/SKILL.md).
