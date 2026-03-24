# Git Hooks

Diese Git Hooks bieten automatische Sicherheitschecks für dein Repository.

## Installation

```bash
chmod +x .githooks/install.sh
./.githooks/install.sh
```

Oder manuell:
```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

## Enthaltene Hooks

### pre-commit

Prüft vor jedem Commit auf:

1. **Gefährliche SQL-Patterns**
   - DELETE FROM
   - DROP TABLE/DATABASE
   - TRUNCATE
   - UPDATE/DELETE mit WHERE 1=1

2. **Hardcoded Secrets**
   - password = "..."
   - api_key = "..."
   - Private Keys

3. **Production-Referenzen**
   - Gefährliche Operationen mit "production" oder "prod"

4. **Große Dateien**
   - Dateien > 5MB

5. **Sensitive Dateien**
   - .env Dateien
   - Credential-Dateien
   - Private Keys

## Bypass (Notfall)

Falls ein legitimer Commit blockiert wird:

```bash
git commit --no-verify -m "Commit message"
```

**⚠️ VORSICHT:** Nur verwenden wenn du sicher bist!

## Anpassungen

Die Patterns können in `.githooks/pre-commit` angepasst werden.
