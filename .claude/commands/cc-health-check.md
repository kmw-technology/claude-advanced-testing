# Projekt Health-Check

Führe einen umfassenden Gesundheitscheck des Projekts durch.

## Anweisungen

1. **Lies zuerst diese Dateien:**
   - MEMORY.md (Projekt-Status, offene Fragen)
   - CLAUDE.md (aktuelle Aufgaben)

2. **Prüfe diese Bereiche und erstelle einen Report:**

### Code-Qualität
- [ ] Gibt es Dateien > 500 Zeilen? (Refactoring-Kandidaten)
- [ ] Gibt es offensichtlichen Duplicate Code?
- [ ] Sind alle public Methoden dokumentiert?
- [ ] Folgt der Code den `.claude/markdown/CODE-QUALITY.md` Standards?

### Test-Abdeckung
- [ ] Sind alle Tests grün?
- [ ] Wie ist die Coverage? (Ziel: >70%)
- [ ] Gibt es Services ohne Tests?
- [ ] Gibt es kritische Pfade ohne Tests?

### Dependencies
- [ ] Gibt es veraltete Pakete?
- [ ] Gibt es bekannte Sicherheitslücken?
- [ ] Gibt es deprecated Pakete?

### Architektur
- [ ] Werden Architektur-Regeln eingehalten?
- [ ] Gibt es unerlaubte Dependencies?
- [ ] Ist die Ordnerstruktur sauber?

### Dokumentation
- [ ] Ist MEMORY.md aktuell?
- [ ] Sind alle ADRs noch gültig?
- [ ] Gibt es undokumentierte Entscheidungen?

### Offene Punkte
- [ ] Gibt es TODOs im Code?
- [ ] Gibt es FIXME/HACK Kommentare?
- [ ] Gibt es offene Issues?

3. **Erstelle einen Report im Format:**

```
## Health-Check Report

**Datum:** [Datum]
**Gesamtstatus:** 🟢 Gesund / 🟡 Achtung / 🔴 Kritisch

### Zusammenfassung
[Kurze Zusammenfassung]

### Kritische Probleme (sofort beheben)
- [Problem 1]
- [Problem 2]

### Warnungen (bald beheben)
- [Warnung 1]

### Empfehlungen (nice-to-have)
- [Empfehlung 1]

### Metriken
| Metrik | Wert | Ziel | Status |
|--------|------|------|--------|
| Test Coverage | X% | >70% | 🟢/🟡/🔴 |
| Outdated Packages | X | 0 | 🟢/🟡/🔴 |
| TODOs im Code | X | <10 | 🟢/🟡/🔴 |
```

4. **Frage den User:** Sollen kritische Probleme sofort behoben werden?
