# Architektur-Check

Prüfe ob die Architektur-Regeln eingehalten werden.

## Verwendung
```
/project:cc-check-architecture [optional: Modul/Bereich]
```

## Anweisungen

1. **Lies zuerst:**
   - CLAUDE.md (Architektur-Prinzipien)
   - `.claude/markdown/FOLDER-STRUCTURE.md` (Architektur-Übersicht)
   - Relevante ADRs in `.claude/markdown/adr/`

2. **Prüfe diese Regeln:**

### Dependency-Regeln
- [ ] Keine zirkulären Dependencies
- [ ] Schichten respektiert (Domain → Application → Infrastructure → API)
- [ ] Keine unerlaubten Cross-Module Dependencies
- [ ] Shared-Module werden korrekt verwendet

### API-First
- [ ] Funktionalität über API erreichbar
- [ ] UI greift nur über API zu (nicht direkt auf Services/DB)
- [ ] API-Dokumentation vorhanden

### Ordnerstruktur
- [ ] Dateien sind in korrekten Ordnern
- [ ] Keine Dateien auf falscher Ebene
- [ ] Naming-Conventions eingehalten

### Separation of Concerns
- [ ] Controller nur für HTTP-Handling
- [ ] Business-Logik in Services
- [ ] Data Access in Repositories
- [ ] DTOs für externe Kommunikation

### Modulare Architektur
- [ ] Module sind eigenständig
- [ ] Kommunikation über definierte Interfaces
- [ ] Keine versteckten Dependencies

3. **Erstelle Report:**

```
## Architektur-Check Report

**Datum:** [Datum]
**Geprüft:** [Scope]
**Status:** 🟢 Konform / 🟡 Warnungen / 🔴 Verletzungen

### Zusammenfassung
[Kurze Zusammenfassung]

### Verletzungen (🔴 MUSS behoben werden)

#### ARCH-001: Unerlaubte Dependency
**Datei:** ModuleA/ServiceX.cs
**Problem:** Referenziert direkt ModuleB.Internal

**Erklärung:**
Module dürfen nur über definierte Interfaces kommunizieren.

**Fix:**
1. Interface in Shared definieren
2. Dependency Injection verwenden

---

### Warnungen (🟡)
[...]

### Best Practices Empfehlungen
[...]

### Dependency-Graph

```
ModuleA → Shared ✅
ModuleB → Shared ✅
ModuleA → ModuleB ❌ (VERBOTEN!)
Host → ModuleA ✅
Host → ModuleB ✅
```

### ADR-Konformität
| ADR | Status | Notizen |
|-----|--------|---------|
| ADR-0001 | 🟢/🔴 | |
| ADR-0002 | 🟢/🔴 | |
```

4. **Bei Verletzungen:** Frage ob sie sofort behoben werden sollen.
