# Tests ausführen

Führt Tests aus und zeigt Ergebnisse an.

## Verwendung

**Argument:** $ARGUMENTS

**Modi:**
- `(leer)` — Alle Tests ausführen
- `--unit` — Nur Unit-Tests
- `--integration` — Nur Integration-Tests
- `--coverage` — Tests mit Coverage-Report
- `--module <name>` — Tests für bestimmtes Modul/Projekt

---

## Ablauf

### 1. Tests ausführen

```bash
# Alle Tests
{{TEST_COMMAND}}

# Mit Coverage
{{TEST_COMMAND_COVERAGE}}
```

### 2. Ergebnis analysieren

- Fehlgeschlagene Tests: Fehlerursache identifizieren
- Flaky Tests: Markieren und dokumentieren
- Coverage: Mit Schwellenwert vergleichen

### 3. Report

```markdown
## Test Report

**Datum:** [Date]
**Scope:** [All / Unit / Integration / Module]

| Metrik | Wert |
|--------|------|
| Total | X Tests |
| Passed | X ✅ |
| Failed | X ❌ |
| Skipped | X ⏭️ |
| Duration | Xs |
| Coverage | XX% |

### Fehlgeschlagene Tests
| Test | Fehler | Vermutete Ursache |
|------|--------|-------------------|
```

### Coverage-Anforderungen

| Bereich | Minimum |
|---------|---------|
| Domain Entities | 90% |
| Application Services | 80% |
| Validators | 100% |
| API Controllers | 70% |
| Infrastructure | 60% |
| **Gesamt** | **70%** |
