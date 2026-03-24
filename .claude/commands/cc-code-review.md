# Code Review

Führe ein Code Review für die angegebene Datei oder das Feature durch.

## Verwendung
```
/project:cc-code-review [Datei oder Ordner]
```

## Anweisungen

1. **Lies zuerst:**
   - `.claude/markdown/CODE-QUALITY.md` (falls vorhanden)
   - Die zu reviewende Datei(en)

2. **Prüfe auf diese Kriterien:**

### Naming & Lesbarkeit
- [ ] Sind Variablen/Methoden aussagekräftig benannt?
- [ ] Ist der Code selbstdokumentierend?
- [ ] Gibt es Magic Numbers/Strings die Konstanten sein sollten?

### SOLID Prinzipien
- [ ] **S**ingle Responsibility: Macht die Klasse nur EINE Sache?
- [ ] **O**pen/Closed: Ist die Klasse erweiterbar ohne Änderung?
- [ ] **L**iskov Substitution: Können Subklassen die Basis ersetzen?
- [ ] **I**nterface Segregation: Sind Interfaces schlank?
- [ ] **D**ependency Inversion: Werden Abstraktionen verwendet?

### Code Smells
- [ ] Duplicate Code (>3 Zeilen identisch)
- [ ] Lange Methoden (>30 Zeilen)
- [ ] Lange Parameterlisten (>4 Parameter)
- [ ] Feature Envy (Methode nutzt mehr fremde als eigene Daten)
- [ ] Data Clumps (Gleiche Datengruppen wiederholt)
- [ ] Primitive Obsession (Primitive statt Value Objects)
- [ ] Switch Statements (sollten oft Polymorphismus sein)

### Sicherheit
- [ ] SQL/Command Injection möglich?
- [ ] XSS möglich?
- [ ] Werden Secrets hardcoded?
- [ ] Ist Input validiert?
- [ ] Sind Exceptions korrekt behandelt?

### Performance
- [ ] N+1 Query Problem?
- [ ] Unnötige Datenbankabfragen?
- [ ] Große Objekte im Memory?

3. **Erstelle Review im Format:**

```
## Code Review: [Datei/Feature]

**Reviewer:** Claude
**Datum:** [Datum]
**Bewertung:** ⭐⭐⭐⭐⭐ (1-5)

### Positives
- [Was ist gut gemacht]

### Probleme (MUSS gefixt werden)
| Zeile | Problem | Vorschlag |
|-------|---------|-----------|
| 42 | Duplicate Code | Extract Method |

### Verbesserungen (SOLLTE gefixt werden)
| Zeile | Problem | Vorschlag |
|-------|---------|-----------|

### Nitpicks (nice-to-have)
- [Kleinigkeiten]
```

4. **Frage:** Soll ich die Probleme direkt beheben?
