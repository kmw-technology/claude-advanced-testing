# Code Maintenance & Housekeeping

Systematische Code-Wartung: Audit, Plan, Fix, Verify.

## Verwendung

**Argument:** $ARGUMENTS

**Modi:**
- `audit` — Nur analysieren, nichts ändern (Standard)
- `fix` — Gefundene Probleme beheben
- `dry-run` — Zeigen was gefixt würde, ohne zu ändern
- `--scope <pfad>` — Nur bestimmten Bereich prüfen

---

## Ablauf

### Phase 1: AUDIT

Prüfe systematisch:

#### Code-Qualität
- [ ] Build-Errors oder Warnings?
- [ ] Tests rot?
- [ ] Security-Vulnerabilities in Dependencies?
- [ ] Code Smells (Dateien >500 Zeilen, Methoden >50 Zeilen)?
- [ ] Duplicate Code?
- [ ] Dead Code (ungenutzte Klassen, Methoden, Imports)?
- [ ] TODO/FIXME/HACK Kommentare?

#### Async/Threading
- [ ] Alle I/O-Operationen async?
- [ ] CancellationToken durchgereicht?
- [ ] Keine sync-over-async Patterns?

#### Test-Qualität
- [ ] Tests ohne Assertions?
- [ ] Flaky Tests (Timing, shared state)?
- [ ] Fehlende Tests für neue Features?
- [ ] Coverage unter Schwellenwert?

#### Dokumentation
- [ ] MEMORY.md aktuell?
- [ ] Neue Entscheidungen ohne ADR?
- [ ] LESSONS-LEARNED.md gepflegt?

### Phase 2: PLAN

Kategorisiere Findings:

| Priorität | Beschreibung | Auto-Fix? |
|-----------|--------------|-----------|
| 🔴 Kritisch | Security, Bugs, Build-Fehler | Manuell |
| 🟠 Hoch | Performance, Code Smells | Teilweise |
| 🟡 Mittel | Duplikate, Dead Code | Ja |
| 🟢 Niedrig | Formatting, Naming | Ja |

### Phase 3: SNAPSHOT

```bash
git stash -m "Pre-maintenance snapshot"
```

### Phase 4: FIX (nur im fix-Modus)

Fixes in Prioritätsreihenfolge:
1. 🔴 Kritisch zuerst
2. 🟠 Hoch
3. 🟡 Mittel (Auto-Fix)
4. 🟢 Niedrig (Auto-Fix)

**Für jeden Fix:**
- Problem beschreiben
- Fix anwenden
- Verifizieren (Build + Tests)
- Bei Fehler: sofort revert

### Phase 5: VERIFY

```bash
# Build prüfen
{{BUILD_COMMAND}}

# Tests ausführen
{{TEST_COMMAND}}
```

Alle Tests müssen grün sein. Bei Rot: Letzten Fix reverten.

### Phase 6: QUALITY GATE

Drei-Stufen-Prüfung:

1. **Technisch:** Build grün? Tests grün? Keine neuen Warnings?
2. **Konsistenz:** Naming einheitlich? Patterns konsistent?
3. **Big Picture:** Architektur-Regeln eingehalten? Keine ungewollten Dependencies?

### Phase 7: REPORT

```markdown
## Maintenance Report

**Datum:** [Date]
**Scope:** [Was wurde geprüft]
**Modus:** audit | fix | dry-run

### Zusammenfassung
- Gefunden: X Issues
- Behoben: Y Issues
- Offen: Z Issues

### Kritische Issues
| Issue | Status | Details |
|-------|--------|---------|

### Auto-Fixes angewendet
| Fix | Dateien | Beschreibung |
|-----|---------|--------------|

### Empfehlungen
- [Was als nächstes zu tun ist]
```

### Phase 8: COMMIT (nur im fix-Modus)

Commit pro Kategorie:
```bash
git add -A && git commit -m "maint: [Kategorie] [Beschreibung]"
```
