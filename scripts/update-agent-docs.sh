#!/usr/bin/env bash
# Génère automatiquement ARCHITECTURE.md à partir de l'état actuel du projet.
# Usage : bash scripts/update-agent-docs.sh  ou  bun run docs:update
# Déclencheurs : hook post-commit, ou manuellement.
set -euo pipefail

PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$PROJECT/ARCHITECTURE.md"
DATE=$(date -u +"%Y-%m-%d %H:%M UTC")

cat > "$OUTPUT" << EOF
# 🏗️ Architecture — Vigilant AI

> Généré automatiquement le $DATE.
> Régénérer avec : \`bun run docs:update\`

---

## 📂 Arborescence du projet

\`\`\`
EOF

# Arbre manuel (pas de dépendance à tree)
find "$PROJECT" \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/.hermes/*' \
  -not -path '*/.cursor/*' \
  -not -path '*/.agents/*' \
  -not -path '*/dist*' \
  -not -path '*/server/data/*' \
  -not -name '.env*' \
  -not -name '*.db*' \
  -not -name '*.db-wal' \
  -not -name '*.db-shm' \
  -maxdepth 4 \
  -type f \
  | sort \
  | sed "s|$PROJECT/||" \
  | while read -r f; do
  # Indentation basée sur la profondeur
  depth=$(echo "$f" | tr -cd '/' | wc -c)
  indent=$(printf '%*s' $((depth * 2)) '')
  echo "${indent}$(basename "$f")" >> "$OUTPUT"
done

cat >> "$OUTPUT" << 'EOF'
```

---

## 📡 Endpoints API

| Route | Handler |
|---|---|
EOF

# Extrait les routes API
grep -n "pathname === " "$PROJECT/server/index.ts" | while read -r line; do
  route=$(echo "$line" | sed -E 's/.*pathname === "([^"]+)".*/\1/')
  handler=$(echo "$line" | sed -E 's/.*return (handle[A-Za-z0-9_]+)\(.*/\1/')
  echo "| \`$route\` | $handler |" >> "$OUTPUT"
done

cat >> "$OUTPUT" << 'EOF'

---

## 📦 Dépendances

| Package | Version |
|---|---|
EOF

# Extrait les dépendances de production
python3 -c "
import json
with open('$PROJECT/package.json') as f:
    pkg = json.load(f)
deps = pkg.get('dependencies', {})
for name, version in sorted(deps.items()):
    print(f'| {name} | {version} |')
" >> "$OUTPUT"

cat >> "$OUTPUT" << 'EOF'

---

## 🧩 Composants React

| Composant | Description |
|---|---|
EOF

find "$PROJECT/src/components" -name "*.tsx" -maxdepth 1 2>/dev/null | sort | while read -r f; do
  name=$(basename "$f" .tsx)
  echo "| $name | \`src/components/$(basename "$f")\` |" >> "$OUTPUT"
done

cat >> "$OUTPUT" << 'EOF'

---

## 🪝 Hooks React

| Hook | Description |
|---|---|
EOF

find "$PROJECT/src/hooks" -name "*.ts" -maxdepth 1 2>/dev/null | sort | while read -r f; do
  name=$(basename "$f" .ts)
  echo "| $name | \`src/hooks/$(basename "$f")\` |" >> "$OUTPUT"
done

cat >> "$OUTPUT" << 'EOF'

---

## 🌍 Variables d'environnement

| Variable | Description |
|---|---|
EOF

grep -E '^[A-Z_]' "$PROJECT/.env.example" 2>/dev/null | while read -r line; do
  var=$(echo "$line" | cut -d= -f1)
  desc=$(echo "$line" | cut -d'#' -f2- | sed 's/^ *//')
  echo "| \`$var\` | $desc |" >> "$OUTPUT"
done

cat >> "$OUTPUT" << 'EOF'

---

## 🔀 Workflow Git

| Branche | Environnement | Sources RSS | DB | Déploiement |
|---|---|---|---|---|
| `dev` | `APP_ENV=development` | 3 sources | `articles_dev.db` | `http://187.77.160.208:8788` |
| `main` | `APP_ENV=production` | 12 sources | `articles.db` | Vercel |

---

*Ce fichier est régénéré automatiquement via `bun run docs:update` ou le hook post-commit.*
*Pour le profil agent et les règles de code, voir `AGENTS.md`.*
EOF

echo "[Docs] ARCHITECTURE.md généré : $(wc -l < "$OUTPUT") lignes"
