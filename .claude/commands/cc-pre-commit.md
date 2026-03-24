# Pre-Commit Check

Führe alle Checks durch bevor Code committed wird.

## Anweisungen

**Führe diese Checks der Reihe nach durch:**

### 1. Build Check
- [ ] Build erfolgreich?
- [ ] Keine Warnings (die als Errors behandelt werden sollten)?

### 2. Test Check
- [ ] Alle Tests grün?
- [ ] Keine skipped Tests?

### 3. Format Check
- [ ] Code korrekt formatiert?

### 4. Security Check
- [ ] Keine hardcoded Secrets? (suche nach `password=`, `apikey=`, `secret=`, etc.)
- [ ] Keine .env Dateien staged?
- [ ] Keine sensitive Daten im Code?

### 5. Architecture Check (schnell)
- [ ] Keine unerlaubten Dependencies?
- [ ] Neue Dateien in korrekter Ordnerstruktur?

### 6. Documentation Check
- [ ] Neue public APIs dokumentiert?
- [ ] MEMORY.md aktuell?
- [ ] Brauchen wir ein neues ADR?

### 7. Coverage Check (optional)
- [ ] Coverage nicht gesunken?

### Report

```
## Pre-Commit Check Report

**Branch:** [current branch]
**Staged Files:** [Anzahl]

### Ergebnis: ✅ COMMIT OK / ❌ PROBLEME GEFUNDEN

| Check | Status | Details |
|-------|--------|---------|
| Build | 🟢/🔴 | |
| Tests | 🟢/🔴 | X passed, Y failed |
| Format | 🟢/🔴 | |
| Security | 🟢/🔴 | |
| Architecture | 🟢/🔴 | |
| Docs | 🟢/🔴 | |

### Probleme (falls vorhanden)
1. [Problem 1]
2. [Problem 2]

### Empfohlene Commit-Message
```
feat(scope): [Kurze Beschreibung]

[Details]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```
```

**Bei Problemen:** Frage ob sie vor dem Commit behoben werden sollen.
