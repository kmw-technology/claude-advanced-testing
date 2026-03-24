# Duplicate Code finden

Durchsuche die Codebase nach Duplicate Code und schlage Refactoring vor.

## Verwendung
```
/project:cc-find-duplicates [optional: Ordner]
```

## Anweisungen

1. **Durchsuche den Code nach:**
   - Identische Code-Blöcke (>5 Zeilen)
   - Ähnliche Code-Blöcke (>80% ähnlich)
   - Kopierte Patterns mit minimalen Änderungen
   - Wiederholte Validierungslogik
   - Ähnliche Query-Ausdrücke

2. **Typische Duplicate-Patterns:**
   - Gleiche null-checks
   - Wiederholte try-catch Blöcke
   - Kopierte Mapping-Logik
   - Ähnliche Controller-Actions
   - Wiederholte Validation-Regeln

3. **Für jedes Duplikat analysiere:**
   - Wo kommt es vor? (Dateien + Zeilen)
   - Wie oft wiederholt?
   - Ist es echtes Duplikat oder nur ähnlich?
   - Was ist die beste Refactoring-Strategie?

4. **Refactoring-Strategien:**

| Pattern | Lösung |
|---------|--------|
| Identischer Code in einer Klasse | Extract Method |
| Identischer Code über Klassen | Extract to Shared Service |
| Ähnliche Klassen | Extract Base Class |
| Ähnliche Methoden mit Parameter-Unterschied | Generics oder Strategy Pattern |
| Wiederholte Validierung | Validation Rules extrahieren |
| Wiederholte Queries | Repository Pattern / Extension Methods |

5. **Erstelle Report:**

```
## Duplicate Code Report

**Gescannt:** [Ordner/Projekt]
**Gefunden:** X Duplikate

### Kritische Duplikate (DRY-Verletzung)

#### Duplikat 1: [Beschreibung]
**Vorkommen:**
- `src/Services/ServiceA.cs:45-52`
- `src/Services/ServiceB.cs:78-85`

**Code:**
```
[Der duplizierte Code]
```

**Empfohlenes Refactoring:** [Extract to BaseService]

---

### Ähnlicher Code (Refactoring empfohlen)
[...]
```

6. **Frage:** Soll ich das Refactoring durchführen?
