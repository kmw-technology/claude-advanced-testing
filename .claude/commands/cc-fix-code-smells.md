# Code Smells finden und fixen

Analysiere Code auf typische Code Smells und behebe sie.

## Verwendung
```
/project:cc-fix-code-smells [Datei oder Ordner]
```

## Anweisungen

1. **Lies die Dateien und suche nach diesen Code Smells:**

### Bloaters (zu groß)
| Smell | Erkennung | Fix |
|-------|-----------|-----|
| Long Method | >30 Zeilen | Extract Method |
| Large Class | >300 Zeilen | Extract Class |
| Long Parameter List | >4 Parameter | Parameter Object |
| Data Clumps | Gleiche Params wiederholt | Value Object |

### Object-Orientation Abusers
| Smell | Erkennung | Fix |
|-------|-----------|-----|
| Switch Statements | switch/case auf Typen | Polymorphismus |
| Temporary Field | Feld nur manchmal genutzt | Extract Class |
| Refused Bequest | Subclass nutzt Parent nicht | Replace Inheritance |
| Alternative Classes | Ähnliche Klassen | Merge/Extract Interface |

### Change Preventers
| Smell | Erkennung | Fix |
|-------|-----------|-----|
| Divergent Change | Klasse ändert sich aus vielen Gründen | Split Class |
| Shotgun Surgery | Eine Änderung = viele Dateien | Move Method |
| Parallel Inheritance | Neue Subclass = neue Subclass woanders | Merge Hierarchies |

### Dispensables (überflüssig)
| Smell | Erkennung | Fix |
|-------|-----------|-----|
| Dead Code | Ungenutzer Code | Delete |
| Speculative Generality | "Vielleicht brauchen wir..." | Delete (YAGNI) |
| Comments | Erklären schlechten Code | Refactor statt Comment |
| Duplicate Code | Kopierter Code | Extract Method/Class |

### Couplers (zu viel Kopplung)
| Smell | Erkennung | Fix |
|-------|-----------|-----|
| Feature Envy | Methode nutzt andere Klasse mehr | Move Method |
| Inappropriate Intimacy | Klassen kennen zu viele Details | Hide Delegate |
| Message Chains | a.getB().getC().getD() | Hide Delegate |
| Middle Man | Klasse delegiert nur | Remove Middle Man |

2. **Für jeden gefundenen Smell:**
   - Zeige den Code
   - Erkläre das Problem
   - Zeige den refactored Code
   - Frage ob anwenden

3. **Report Format:**

```
## Code Smell Report: [Datei]

### Gefundene Smells: X

#### Smell 1: Long Method
**Datei:** Service.cs:45
**Schwere:** 🔴 Hoch

**Problem:**
Die Methode `ProcessItem` hat 85 Zeilen.

**Vorher:**
```
public void ProcessItem(Item item) {
    // 85 Zeilen Code...
}
```

**Nachher:**
```
public void ProcessItem(Item item) {
    ValidateItem(item);
    SaveToDatabase(item);
    NotifySubscribers(item);
}

private void ValidateItem(Item item) { ... }
private void SaveToDatabase(Item item) { ... }
private void NotifySubscribers(Item item) { ... }
```

**Änderung anwenden?** [Ja/Nein]
```

4. **Nach Abschluss:** Tests ausführen um sicherzustellen dass nichts kaputt ist.
