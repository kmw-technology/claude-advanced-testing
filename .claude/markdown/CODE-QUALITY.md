# {{PROJECT_NAME}} - Code Quality Strategie

## Prinzipien (NICHT VERHANDELBAR!)

### YAGNI - You Aren't Gonna Need It

**Regel:** Implementiere keine FEATURES/ABSTRAKTIONEN, die nicht JETZT gebraucht werden.

**WICHTIG: YAGNI bedeutet NICHT:**
- Keine Tests schreiben
- Keine Dokumentation schreiben
- Keine saubere Architektur
- Nicht langfristig denken
- Keine Infrastruktur aufbauen

**YAGNI bedeutet:**
- Keine Features "auf Vorrat" bauen
- Keine Abstraktion ohne konkreten Anwendungsfall
- Keine Flexibilität "für später"
- Keine generischen Lösungen für spezifische Probleme

**Symptome von YAGNI-Verletzungen:**
- "Das könnte später nützlich sein" (für Features)
- "Falls jemand das mal braucht" (für APIs)
- "Zur Sicherheit füge ich das schon mal hinzu" (für Methoden)
- Methoden/Klassen ohne Aufrufer

**NICHT YAGNI-Verletzung:**
- Tests schreiben (PFLICHT)
- Logging einbauen (PFLICHT)
- Error-Handling (PFLICHT)
- Dokumentation (PFLICHT)
- Clean Architecture (PFLICHT für Wartbarkeit)

### KISS - Keep It Simple, Stupid

**Regel:** Die einfachste Lösung, die funktioniert, ist die beste.

**Symptome von KISS-Verletzungen:**
- Mehr als 3 Abstraktionsebenen
- Factory-Factory-Pattern
- Generics mit mehr als 2 Type-Parametern
- "Ich verstehe meinen eigenen Code nicht mehr"

### DRY - Don't Repeat Yourself (ABER VORSICHT!)

**Regel:** Duplikation entfernen - ABER NUR wenn es echte Duplikation ist.

**Regel für DRY:** Erst bei der DRITTEN Duplikation abstrahieren!

---

## Code Smells - Erkennung und Behebung

### Die häufigsten Code Smells

| Smell | Erkennung | Lösung |
|-------|-----------|--------|
| **Long Method** | > 50 Zeilen | In kleinere Methoden aufteilen |
| **Large Class** | > 500 Zeilen | Single Responsibility beachten |
| **Long Parameter List** | > 4 Parameter | Parameter-Objekt erstellen |
| **Feature Envy** | Klasse nutzt hauptsächlich andere Klassen | Methode verschieben |
| **Data Clumps** | Gleiche Parameter immer zusammen | Klasse extrahieren |
| **Primitive Obsession** | Überall strings/ints statt Types | Value Objects nutzen |
| **Shotgun Surgery** | Eine Änderung = viele Dateien | Zusammenhängendes zusammenführen |
| **Dead Code** | Ungenutzer Code | LÖSCHEN |
| **Duplicate Code** | Kopierter Code | Extract Method/Class |

---

## Metriken und Thresholds

### Code-Metriken Grenzwerte

| Metrik | Gut | Warnung | Fehler |
|--------|-----|---------|--------|
| Cyclomatic Complexity (Method) | ≤ 10 | 11-15 | > 15 |
| Lines per Method | ≤ 30 | 31-50 | > 50 |
| Lines per Class | ≤ 300 | 301-500 | > 500 |
| Parameters per Method | ≤ 4 | 5-6 | > 6 |
| Dependencies per Class | ≤ 5 | 6-8 | > 8 |
| Depth of Inheritance | ≤ 3 | 4-5 | > 5 |

---

## CI/CD Quality Gates (PFLICHT!)

### Build MUSS scheitern bei:

| Prüfung | Schwelle |
|---------|----------|
| Test Coverage | < 70% |
| Cyclomatic Complexity | > 15 per method |
| Dead Code | Any |
| Duplicate Code | > 50 lines |
| Build Warnings | Any |
| Security Vulnerabilities | Any High/Critical |

---

## Regelmäßige Quality Reviews

### Wöchentlich (Automatisch)

- [ ] CI/CD Quality Gates bestanden
- [ ] Keine neuen Security Vulnerabilities
- [ ] Test Coverage stabil oder steigend

### Monatlich (Manuell)

- [ ] Tech Debt Review: `/project:cc-tech-debt`
- [ ] Duplicate Code Review: `/project:cc-find-duplicates`
- [ ] Architecture Check: `/project:cc-check-architecture`
- [ ] Dead Code entfernen

### Vor jedem Release

- [ ] Full Security Audit
- [ ] Performance Baseline Check
- [ ] Code Coverage > 70%
- [ ] Keine kritischen Code Smells

---

## Claude Code Integration

### Commands für Code Quality

| Command | Prüft | Wann nutzen |
|---------|-------|-------------|
| `/project:cc-code-review` | Generelle Best Practices | Nach Änderungen |
| `/project:cc-find-duplicates` | Duplicate Code | Monatlich |
| `/project:cc-fix-code-smells` | Code Smells | Bei Refactoring |
| `/project:cc-tech-debt` | Technical Debt | Vor Sprint-Planning |
| `/project:cc-check-architecture` | Architektur-Regeln | Nach neuen Klassen |

### Claude MUSS bei Code-Änderungen prüfen:

1. **YAGNI:** Brauchen wir das JETZT?
2. **KISS:** Ist das die einfachste Lösung?
3. **DRY:** Ist das echte Duplikation?
4. **Testbar:** Kann ich das testen?
5. **Wartbar:** Verstehe ich das in 6 Monaten noch?
