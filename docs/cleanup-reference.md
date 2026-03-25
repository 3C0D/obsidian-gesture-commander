# Repo Cleanup Reference

Commandes et tâches VSCode pour nettoyer un repo TypeScript/Obsidian plugin.

---

## Hiérarchie du formatage

Trois couches interviennent, dans cet ordre de priorité :

### 1. EditorConfig (`.editorconfig`) — niveau éditeur

S'applique **en temps réel** dès qu'on ouvre ou sauvegarde un fichier, via l'extension VSCode EditorConfig.  
Gère le comportement brut de l'éditeur, indépendamment du langage.

Configuration actuelle :
```ini
indent_style = tab
indent_size = 4
tab_width = 4
end_of_line = lf
charset = utf-8
insert_final_newline = true
```

### 2. Prettier (`.prettierrc`) — niveau formatage

S'applique à la sauvegarde (si configuré) ou via CLI.  
Si **pas de `.prettierrc`**, Prettier lit `.editorconfig` automatiquement — mais ses propres defaults peuvent prendre le dessus selon la version.  
Le `.prettierrc` a **priorité absolue** sur `.editorconfig` pour les règles communes.

Configuration actuelle (alignée avec `.editorconfig`) :
```json
{
  "useTabs": true,
  "tabWidth": 4,
  "endOfLine": "lf",
  "singleQuote": false,
  "trailingComma": "none",
  "printWidth": 120
}
```

Règles communes aux deux fichiers — `.prettierrc` gagne :
| Règle        | `.editorconfig`      | `.prettierrc`   |
| ------------ | -------------------- | --------------- |
| Indentation  | `indent_style = tab` | `useTabs: true` |
| Taille tab   | `indent_size = 4`    | `tabWidth: 4`   |
| Fin de ligne | `end_of_line = lf`   | `endOfLine: lf` |

### 3. ESLint (`eslint.config.mts`) — niveau qualité du code

N'intervient **pas** sur le formatage visuel (c'est le rôle de Prettier), mais sur la qualité et la cohérence du code.  
Configuration actuelle :
- `semi` → error (point-virgules obligatoires)
- `@typescript-eslint/no-unused-vars` → warning
- `@typescript-eslint/explicit-function-return-type` → warning

> **Règle d'or** : `.editorconfig` et `.prettierrc` doivent toujours être alignés sur les règles communes pour éviter les conflits.

---

## Commandes

### 1. Lint

```bash
# Vérifier
yarn lint

# Corriger automatiquement
yarn lint:fix
```

Configuré avec `@typescript-eslint`. Règles notables :
- `@typescript-eslint/no-unused-vars` → warning (args ignorés)
- `@typescript-eslint/explicit-function-return-type` → warning
- `semi` → error

---

### 2. Prettier

```bash
# Vérifier le formatage
npx prettier --check "src/**/*.ts"

# Corriger le formatage
npx prettier --write "src/**/*.ts"
```

---

### 3. Build

```bash
yarn build

# Équivalent à :
tsc -noEmit -skipLibCheck && tsx scripts/esbuild.config.ts production
```

---

### Ordre recommandé

```bash
yarn lint:fix
npx prettier --write "src/**/*.ts"
yarn build
```

---

## Tâches VSCode (`.vscode/tasks.json`)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Lint",
      "type": "shell",
      "command": "yarn lint",
      "group": "test",
      "presentation": { "reveal": "always", "panel": "shared" },
      "problemMatcher": ["$eslint-stylish"]
    },
    {
      "label": "Lint: Fix",
      "type": "shell",
      "command": "yarn lint:fix",
      "group": "test",
      "presentation": { "reveal": "always", "panel": "shared" },
      "problemMatcher": ["$eslint-stylish"]
    },
    {
      "label": "Prettier: Check",
      "type": "shell",
      "command": "npx prettier --check \"src/**/*.ts\"",
      "group": "test",
      "presentation": { "reveal": "always", "panel": "shared" },
      "problemMatcher": []
    },
    {
      "label": "Prettier: Fix",
      "type": "shell",
      "command": "npx prettier --write \"src/**/*.ts\"",
      "group": "test",
      "presentation": { "reveal": "always", "panel": "shared" },
      "problemMatcher": []
    },
    {
      "label": "Build",
      "type": "shell",
      "command": "yarn build",
      "group": { "kind": "build", "isDefault": true },
      "presentation": { "reveal": "always", "panel": "shared" },
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Cleanup: Lint + Prettier + Build",
      "dependsOrder": "sequence",
      "dependsOn": ["Lint: Fix", "Prettier: Fix", "Build"],
      "group": "build",
      "presentation": { "reveal": "always", "panel": "shared" },
      "problemMatcher": []
    }
  ]
}
```

La tâche `Cleanup: Lint + Prettier + Build` enchaîne les trois étapes dans l'ordre.  
Accessible via `Ctrl+Shift+P` → `Tasks: Run Task`.
