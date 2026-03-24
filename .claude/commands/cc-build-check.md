# Build Check

Prüft ob das Projekt sauber baut und alle Grundvoraussetzungen erfüllt.

## Verwendung

**Argument:** $ARGUMENTS

**Modi:**
- `(leer)` — Standard Build-Check (Build + Format + Unit-Tests)
- `--full` — Inkl. Integration-Tests und Coverage

---

## Ablauf

### 1. Clean Build

```bash
{{BUILD_COMMAND}}
```

**Erfolgskriterium:** Keine Errors, keine Warnings.

### 2. Format-Check (falls vorhanden)

```bash
# .NET
dotnet format --verify-no-changes

# Node.js
npx prettier --check .

# Python
ruff check .
```

### 3. Unit Tests

```bash
{{TEST_COMMAND}}
```

**Erfolgskriterium:** Alle Tests grün, keine Skipped.

### 4. Integration Tests (nur --full)

```bash
{{INTEGRATION_TEST_COMMAND}}
```

### 5. Coverage (nur --full)

Coverage prüfen und mit Schwellenwert vergleichen.

---

## Output

```markdown
## Build Check Report

| Check | Status | Details |
|-------|--------|---------|
| Build | 🟢/🔴 | [Errors/Warnings] |
| Format | 🟢/🔴 | [Verstöße] |
| Unit Tests | 🟢/🔴 | X passed, Y failed |
| Integration Tests | 🟢/🔴/⏭️ | X passed (nur --full) |
| Coverage | 🟢/🔴/⏭️ | XX% (Ziel: 70%) |

**Ergebnis:** ✅ ALLES OK / ❌ PROBLEME GEFUNDEN
```

### Bei Fehlern

1. Build-Error → Fehler zeigen, Fix vorschlagen
2. Test-Failure → Fehlgeschlagene Tests analysieren
3. Coverage zu niedrig → Ungetestete Bereiche identifizieren
