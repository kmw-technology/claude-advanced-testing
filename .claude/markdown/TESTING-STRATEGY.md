# {{PROJECT_NAME}} - Testing Strategy

## Test-Pyramide

```
                    /\
                   /  \
                  / E2E\           10% - End-to-End Tests
                 /______\          Kritische User-Flows
                /        \
               /Integration\       20% - Integration Tests
              /______________\     API, Datenbank, externe Services
             /                \
            /    Unit Tests    \   70% - Unit Tests
           /____________________\  Business Logic, Services, Validators
```

---

## Test-Typen im Detail

### 1. Unit Tests (70%)

**Ziel:** Testen einzelner Komponenten in Isolation.

**Scope:**
- Domain Entities und Value Objects
- Application Services / Command & Query Handler
- Validators
- Mapper

**Namenskonvention:**
```
MethodName_StateUnderTest_ExpectedBehavior

// Beispiele:
GetByIdAsync_ExistingItem_ReturnsItem
CreateAsync_InvalidEmail_ThrowsValidationException
Calculate_NegativeAmount_ReturnsZero
```

### 2. Integration Tests (20%)

**Ziel:** Testen des Zusammenspiels mehrerer Komponenten.

**Scope:**
- API Endpoints (Controller)
- Repository mit echter Datenbank
- Externe Services

### 3. End-to-End Tests (10%)

**Ziel:** Testen kompletter User-Flows.

**Scope:**
- Kritische Business-Flows
- Cross-Module Szenarien
- UI-Interaktionen (Playwright)

---

## Coverage-Anforderungen

| Bereich | Minimum Coverage |
|---------|------------------|
| Domain Entities | 90% |
| Application Services | 80% |
| Validators | 100% |
| API Controllers | 70% (via Integration Tests) |
| Infrastructure | 60% |

---

## Flaky Tests vermeiden (KRITISCH!)

### Regeln für stabile Tests

| Regel | Warum | Lösung |
|-------|-------|--------|
| **Keine shared state** | Tests beeinflussen sich gegenseitig | Jeder Test erstellt eigene Daten |
| **Keine Sleep/Delays** | Timing-abhängig = flaky | Polling mit Timeout stattdessen |
| **Deterministische Zeit** | `DateTime.Now` ändert sich | ITimeProvider mocken |
| **Keine Random-Werte** | Nicht reproduzierbar | Feste Seeds oder Builder |
| **Isolation** | Parallele Ausführung | Keine statischen Variablen |

### Test-Quarantäne für Flaky Tests

Wenn ein Test flaky ist, NICHT einfach löschen oder ignorieren!

**Prozess:**
1. Markieren mit Quarantine-Trait
2. Issue erstellen mit Details
3. Fixen mit hoher Priorität
4. Quarantäne entfernen nach Fix

---

## Coverage-Gate in CI (PFLICHT!)

### Build MUSS scheitern wenn Coverage < 70%

```yaml
- name: Check Coverage Threshold
  run: |
    # Coverage prüfen
    COVERAGE=$(...)

    echo "Current coverage: $COVERAGE%"

    if (( $(echo "$COVERAGE < 70" | bc -l) )); then
      echo "::error::Coverage $COVERAGE% is below 70% threshold!"
      exit 1
    fi
```

---

## UI-Tests mit Playwright (für Web-Projekte)

### Warum Playwright?

- Cross-Browser (Chrome, Firefox, Safari)
- Auto-wait (keine flaky waits)
- Trace Viewer für Debugging
- Parallel execution

### data-testid Konvention (PFLICHT!)

**Alle interaktiven Elemente MÜSSEN ein `data-testid` haben:**

```html
<!-- GUT - Testbar -->
<input data-testid="search-input" type="text" />
<button data-testid="save-button">Speichern</button>
<tr data-testid="item-row">...</tr>

<!-- SCHLECHT - Nicht robust -->
<input class="search-input" type="text" />
<button class="btn btn-primary">Speichern</button>
```

**Warum?**
- CSS-Klassen ändern sich oft (Design-Updates)
- IDs sind oft generiert
- `data-testid` ist explizit für Tests

### Page Object Model (POM)

Alle UI-Tests sollten Page Objects verwenden:
- Zentrale Locator-Definitionen
- Wiederverwendbare Aktionen
- Einfachere Wartung bei UI-Änderungen

---

## Checkliste vor Merge

- [ ] Alle Unit Tests bestanden?
- [ ] Alle Integration Tests bestanden?
- [ ] Coverage-Schwellen eingehalten?
- [ ] Neue Features haben Tests?
- [ ] Keine ignorierten Tests?
- [ ] Tests sind deterministisch (kein Flakiness)?

---

## Langzeit-Metriken (Monitoring)

### Test-Trends tracken

| Metrik | Warnung | Aktion |
|--------|---------|--------|
| Test-Laufzeit steigt | +20% vs. Baseline | Optimieren oder parallelisieren |
| Flaky-Test-Rate | >2% | Quarantäne + Analyse |
| Coverage sinkt | -5% | PR blockieren |
| Skipped Tests | >0 | Review warum |
