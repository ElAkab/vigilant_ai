---
name: vercel-skills-cli-bun
description: Installs or updates Vercel's vercel-react-best-practices Cursor skill using the universal skills CLI via Bun (`bunx`). Use when the user asks for bun skills add, vercel-labs/agent-skills, syncing React performance skills, or reinstalling project agent skills from the lockfile.
disable-model-invocation: true
---

# CLI « skills » avec Bun pour vercel-labs/agent-skills

## Point important sur Bun

Bun **ne fournit pas** la sous-commande `skills`. Le package NPM `skills` s’invoque avec **`bunx skills`** (équivalent de `npx skills`).

Référence textuelle demandée :

```
bun skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
```

Forme fonctionnelle à exécuter depuis la racine du dépôt :

```
bunx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices -y --agent cursor
```

- **`--agent cursor`** : cible Cursor explicitement si besoin (le CLI peut auto-détecter).
- **`-y`** : pas de prompts (adapté CI ou scripts).

Installation **globale** (tous les projets utilisateur Cursor) : ajouter `-g`.

Lister les skills disponibles sans installer :

```
bunx skills add https://github.com/vercel-labs/agent-skills -l
```

## Où sont les fichiers

Après ajout projet, les fichiers peuvent résider sous **`.agents/skills/<nom-de-la-skill>/`** (notamment pour `vercel-react-best-practices` : `SKILL.md`, dossier `rules/`, etc.). Un **`skills-lock.json`** à la racine permet de retrouver ou synchroniser une installation compatibles équipe.
