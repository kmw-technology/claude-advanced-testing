# claude-advanced-testing - Lessons Learned (Persistentes Error-Learning)

**WICHTIG FÜR CLAUDE:** Diese Datei enthält Fehler und Learnings aus der Vergangenheit.
**VOR JEDER KRITISCHEN AKTION** diese Datei lesen, um gleiche Fehler zu vermeiden!

---

## Wie dieses System funktioniert

1. **Bei JEDEM Fehler:** Sofort hier dokumentieren
2. **Vor kritischen Aktionen:** Diese Datei lesen
3. **Regelmäßig:** Learnings in Prävention umwandeln (Checks, Commands, etc.)

---

## Fehler-Template

```markdown
### [DATUM] - Kurztitel

**Kategorie:** Deployment | Code | Security | Performance | Configuration

**Was passiert ist:**
[Beschreibung des Problems]

**Root Cause:**
[Warum ist es passiert?]

**Wie es behoben wurde:**
[Schritte zur Behebung]

**Prävention für die Zukunft:**
[Wie vermeiden wir das in Zukunft?]

**Relevante Dateien/Commands:**
[Links zu betroffenen Dateien oder neuen Checks]
```

---

## Deployment-Fehler

_Hier werden Deployment-bezogene Learnings dokumentiert_

### [TEMPLATE]

**Kategorie:** Deployment

**Was passiert ist:**
[...]

---

## Code-Fehler

_Hier werden Code-bezogene Learnings dokumentiert_

### [TEMPLATE]

**Kategorie:** Code

**Was passiert ist:**
[...]

---

## Security-Fehler

_Hier werden Security-bezogene Learnings dokumentiert_

### [TEMPLATE]

**Kategorie:** Security

**Was passiert ist:**
[...]

---

## Performance-Fehler

_Hier werden Performance-bezogene Learnings dokumentiert_

### [TEMPLATE]

**Kategorie:** Performance

**Was passiert ist:**
[...]

---

## Configuration-Fehler

_Hier werden Konfigurations-bezogene Learnings dokumentiert_

### [TEMPLATE]

**Kategorie:** Configuration

**Was passiert ist:**
[...]

---

## Anti-Patterns (NIE WIEDER!)

Diese Dinge haben in der Vergangenheit zu Problemen geführt:

| Anti-Pattern | Warum schlecht | Stattdessen |
|--------------|----------------|-------------|
| Migration ohne Backup | Datenverlust möglich | IMMER Backup zuerst |
| Deployment Freitag Nachmittag | Kein Support am Wochenende | Mo-Do, vor 16:00 |
| Quick-Fix ohne Test | Oft neue Bugs | Immer Tests schreiben |
| Hardcoded Secrets | Security Risk | Umgebungsvariablen |
| Large PR (>500 Zeilen) | Schwer zu reviewen | Kleinere PRs |
| Skip Pre-Commit Hooks | Bugs durchschlüpfen | NIE --no-verify |

---

## Erfolgreiche Patterns (IMMER VERWENDEN!)

Diese Dinge haben gut funktioniert:

| Pattern | Warum gut | Wann verwenden |
|---------|-----------|----------------|
| Backup vor Migration | Rollback möglich | IMMER |
| Feature Flags | Rollback ohne Deployment | Risikoreiche Features |
| Staging zuerst | Bugs früh finden | IMMER |
| Smoke Tests nach Deploy | Schnelle Validierung | IMMER |
| Kleine PRs | Einfacher Review | IMMER |

---

## Checkliste: Bevor Claude etwas Kritisches tut

```markdown
## Pre-Action Check (Bei kritischen Aktionen)

### Habe ich diese Learnings gecheckt?
- [ ] Diese Datei gelesen
- [ ] Relevante Kategorie (Deployment/Code/etc.) durchgesehen
- [ ] Anti-Patterns vermieden

### Ist die Aktion sicher?
- [ ] Backup vorhanden (falls Daten betroffen)
- [ ] Rollback-Plan vorhanden
- [ ] User informiert/Approval erhalten

### Bei Unsicherheit:
→ STOPP! User fragen, nicht raten!
```

---

## Statistiken

| Monat | Fehler | Behoben | Prävention implementiert |
|-------|--------|---------|--------------------------|
| {{MONTH}} | 0 | 0 | Basis-System erstellt |

---

## Claude's Pflichten

### Bei JEDEM Fehler:

1. **SOFORT** hier dokumentieren (nicht vergessen!)
2. Root Cause analysieren
3. Prävention vorschlagen
4. MEMORY.md aktualisieren wenn relevant

### Vor kritischen Aktionen:

1. Diese Datei lesen
2. Relevante Anti-Patterns prüfen
3. Checkliste durchgehen

### Regelmäßig:

1. Neue Learnings in Automation umwandeln
2. Commands/Checks verbessern
3. Dokumentation aktualisieren

---

## Eskalation

Wenn ein Fehler NICHT dokumentiert ist aber auftreten könnte:

1. **STOPP** - Nicht weitermachen
2. User fragen: "Das habe ich noch nicht gemacht. Soll ich...?"
3. Nach Ausführung: Learnings dokumentieren (auch bei Erfolg!)
