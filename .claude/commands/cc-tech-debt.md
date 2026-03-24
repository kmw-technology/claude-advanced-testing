# Technical Debt Analyse

Identifiziere und priorisiere Technical Debt im Projekt.

## Verwendung
```
/project:cc-tech-debt [optional: Bereich]
```

## Anweisungen

1. **Durchsuche den Code nach Technical Debt Indikatoren:**

### TODO/FIXME/HACK Kommentare
```
# Suche nach diesen Patterns
TODO:
FIXME:
HACK:
XXX:
TEMP:
WORKAROUND:
```

### Code Metrics
- Dateien > 500 Zeilen
- Methoden > 50 Zeilen
- Zyklomatische Komplexität > 10
- Klassen mit > 10 Dependencies

### Architektur-Schulden
- Zirkuläre Dependencies
- God Classes
- Anemic Domain Models
- Fehlende Abstraktionen

### Test-Schulden
- Code ohne Tests
- Flaky Tests
- Langsame Tests (> 5s)
- Tests mit vielen Mocks (> 5)

### Dependency-Schulden
- Veraltete Packages
- Deprecated APIs
- Nicht mehr gewartete Libraries

### Dokumentations-Schulden
- Fehlende API-Docs
- Veraltete README
- Keine Architektur-Docs

2. **Priorisiere nach:**

| Priorität | Kriterium |
|-----------|-----------|
| 🔴 Kritisch | Sicherheitsrisiko, Bugs, Blocker |
| 🟠 Hoch | Performance, Wartbarkeit stark betroffen |
| 🟡 Mittel | Code-Qualität, zukünftige Probleme |
| 🟢 Niedrig | Nice-to-have, Cleanup |

3. **Schätze Aufwand:**
- XS: < 1 Stunde
- S: 1-4 Stunden
- M: 1-2 Tage
- L: 1 Woche
- XL: > 1 Woche

4. **Erstelle Report:**

```
## Technical Debt Report

**Datum:** [Datum]
**Gesamt-Schulden:** X Items
**Geschätzter Aufwand:** X Tage

### Zusammenfassung nach Kategorie

| Kategorie | Anzahl | Aufwand |
|-----------|--------|---------|
| Code Quality | X | Xh |
| Tests | X | Xh |
| Architecture | X | Xh |
| Dependencies | X | Xh |
| Documentation | X | Xh |

### Kritische Schulden (🔴)

#### TD-001: [Titel]
**Datei:** [Pfad:Zeile]
**Kategorie:** Code Quality
**Aufwand:** M
**Risiko:** Hoch

**Problem:**
[Beschreibung]

**Lösung:**
[Vorgeschlagener Fix]

---

### Hohe Priorität (🟠)
[...]

### Mittlere Priorität (🟡)
[...]

### Niedrige Priorität (🟢)
[...]

### Empfohlener Abbau-Plan

**Sprint 1:**
- TD-001 (kritisch)
- TD-003 (kritisch)

**Sprint 2:**
- TD-005 (hoch)
- TD-007 (hoch)

**Kontinuierlich (20% Zeit):**
- Kleine Improvements
- Test Coverage erhöhen
```

5. **Frage:** Soll ich die kritischen Schulden sofort beheben?
