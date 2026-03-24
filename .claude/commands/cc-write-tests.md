# Tests schreiben

Schreibe Tests für die angegebene Datei oder das Feature.

## Verwendung
```
/project:cc-write-tests [Datei oder Feature]
```

## Anweisungen

1. **Lies zuerst:**
   - `.claude/markdown/TESTING-STRATEGY.md` (falls vorhanden)
   - Die zu testende Datei
   - Existierende Tests als Referenz

2. **Bestimme den Test-Typ:**

| Zu testen | Test-Typ |
|-----------|----------|
| Service/Handler | Unit Test |
| Validator | Unit Test |
| Entity/Value Object | Unit Test |
| API Controller | Integration Test |
| Repository | Integration Test |
| User Flow | E2E Test |

3. **Mindestens diese Szenarien testen:**

### Für jeden Service/Handler:
- [ ] Happy Path (alles funktioniert)
- [ ] Null/Empty Input
- [ ] Ungültige Daten
- [ ] Nicht gefunden (NotFound)
- [ ] Duplikat vorhanden
- [ ] Berechtigung fehlt (falls relevant)

### Für Validatoren:
- [ ] Gültige Daten → kein Fehler
- [ ] Jede Regel einzeln verletzen → spezifischer Fehler
- [ ] Mehrere Regeln verletzen → alle Fehler

### Für API Endpoints:
- [ ] 200/201 - Erfolg
- [ ] 400 - Validation Error
- [ ] 401 - Nicht authentifiziert
- [ ] 403 - Nicht autorisiert
- [ ] 404 - Nicht gefunden
- [ ] 409 - Konflikt (z.B. Duplikat)

4. **Test-Struktur:**

```
// Arrange-Act-Assert Pattern

// Arrange: Test-Daten vorbereiten
var input = ...;
mockDependency.Setup(...);

// Act: Methode aufrufen
var result = await sut.MethodAsync(input);

// Assert: Ergebnis prüfen
result.Should().NotBeNull();
result.Property.Should().Be(expectedValue);
```

5. **Naming Convention:**
```
MethodName_Scenario_ExpectedBehavior

// Beispiele:
GetByIdAsync_ItemExists_ReturnsItem
GetByIdAsync_ItemNotFound_ThrowsNotFoundException
CreateAsync_DuplicateEmail_ThrowsValidationException
```

6. **Nach dem Schreiben:**
   - [ ] Tests ausführen
   - [ ] Coverage prüfen
   - [ ] Keine flaky Tests?

7. **Ausgabe:**
   Zeige die erstellten Test-Dateien und frage ob sie so passen.
