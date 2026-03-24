# {{PROJECT_NAME}} - Ordnerstruktur

## Root-Struktur

```
{{PROJECT_NAME}}/
├── .claude/                        # Claude Code Konfiguration
│   ├── commands/                   # Custom Claude Commands (cc-*)
│   └── markdown/                   # AI-Instruktionen & Dokumentation
│       └── adr/                    # Architecture Decision Records
├── .github/                        # GitHub Actions CI/CD
│   └── workflows/
├── .githooks/                      # Git Security Hooks
│
├── projects/                       # Source Code aller Projekte/Module
│   ├── {{MODULE_1}}/               # Projekt/Modul 1
│   ├── {{MODULE_2}}/               # Projekt/Modul 2
│   └── shared/                     # Gemeinsamer Code
│
├── tests/                          # Cross-Projekt Tests (E2E, Performance)
├── deployment/                     # Deployment-Konfiguration (Docker, K8s, Terraform, Scripts)
├── documentation/                  # Referenz-Dokumentation (Architektur-Diagramme, API-Specs)
├── tools/                          # Hilfs-Tools, Generatoren, Utilities
├── scripts/                        # Build-Scripts, Migrations, Automatisierung
├── resources/                      # Statische Ressourcen (Seed-Daten, Templates, Referenz-Dateien)
│
├── artifacts/                      # Build-Outputs, Reports, generierte Dateien
├── temporary/                      # Scratch-Dateien, Debug-Dumps (GITIGNORED)
├── secrets/                        # Lokale Secrets, Zertifikate (GITIGNORED)
│
├── CLAUDE.md                       # Claude Code Anweisungen
├── MEMORY.md                       # Langzeit-Gedächtnis
└── LESSONS-LEARNED.md              # Persistentes Error-Learning
```

---

## Ordner-Beschreibungen

### Source & Projekte

| Ordner | Zweck | Beispiel-Inhalte |
|--------|-------|------------------|
| **`projects/`** | Aller Source Code, nach Modulen/Projekten organisiert | Module, Services, Libraries |
| **`tests/`** | Cross-Projekt Tests die nicht zu einem einzelnen Modul gehören | E2E-Tests, Performance-Tests, Smoke-Tests |
| **`tools/`** | Eigenständige Hilfs-Tools und Utilities | Daten-Importer, Code-Generatoren, Browser-Automation |
| **`scripts/`** | Automatisierungs-Scripts für Build, Deploy, Migration | deploy.sh, seed-data.sh, backup.sh |

### Konfiguration & Dokumentation

| Ordner | Zweck | Beispiel-Inhalte |
|--------|-------|------------------|
| **`.claude/commands/`** | Ausführbare Workflows per `/project:cc-*` | cc-init.md, cc-health-check.md, cc-pre-commit.md |
| **`.claude/markdown/`** | AI-Instruktionen die Claude liest und befolgt | CRITICAL-THINKING.md, CODE-QUALITY.md, DESIGN-SYSTEM.md |
| **`.claude/markdown/adr/`** | Architecture Decision Records | ADR-0001-technologie-wahl.md |
| **`documentation/`** | Referenz-Dokumentation (nicht AI-Instruktionen) | Architektur-Diagramme, API-Specs, Onboarding-Guide |
| **`deployment/`** | Deployment-Konfiguration | Dockerfiles, docker-compose.yml, Kubernetes-Manifeste, Terraform |
| **`.github/workflows/`** | CI/CD Pipelines | ci.yml, cd-staging.yml, cd-production.yml |
| **`.githooks/`** | Git Security Hooks | pre-commit (blockiert Secrets, gefährliche SQL) |

### Ressourcen

| Ordner | Zweck | Beispiel-Inhalte |
|--------|-------|------------------|
| **`resources/`** | Statische Ressourcen die vom Projekt genutzt werden | Seed-Daten, CSV-Templates, Referenz-Dateien, Fonts |

### Outputs & Temporär

| Ordner | Zweck | Gitignored? | Beispiel-Inhalte |
|--------|-------|-------------|------------------|
| **`artifacts/`** | Build-Outputs, Reports, generierte Dateien | Nein | Scripts, Ressourcen, Reports, generierte Configs |
| **`temporary/`** | Scratch-Dateien, Debug-Dumps, lokale Experimente | **Ja** | Debug-Logs, SQL-Dumps, Testdaten |
| **`secrets/`** | Lokale Secrets die NIE committed werden | **Ja** | API-Keys, Zertifikate, Passwort-Dateien |

---

## 6-Ordner-Struktur für Projekt-Module (PFLICHT!)

**JEDER** Projekt-Ordner unter `/projects/` hat die **gleiche 6-Ordner-Struktur**.
Das gilt für alle Sprachen und Frameworks — keine Ausnahmen!

```
/projects/{gruppe}/{projekt}/
├── src/                        # Source Code (Produktionscode)
├── tests/                      # Tests
├── documentation/              # Projekt-spezifische Docs
├── artifacts/                  # Build-Outputs, generierte Dateien
├── temporary/                  # Temporäre Dateien, Scratch
└── deployment/                 # Projekt-spezifische Deploy-Configs
```

| Ordner | Zweck |
|--------|-------|
| `src/` | Produktionscode |
| `tests/` | Unit- und Integration-Tests |
| `documentation/` | Modul-interne Docs (README, API-Docs) |
| `artifacts/` | Build-Outputs |
| `temporary/` | Debug-Dumps, lokale Tests |
| `deployment/` | Modul-spezifische Dockerfiles, Configs |

### Leere Ordner: `.gitkeep`

Leere Ordner werden mit einer `.gitkeep`-Datei im Git gehalten.
Sobald echte Dateien im Ordner landen, kann `.gitkeep` entfernt werden.

---

## Dokumenten-Trennung (WICHTIG!)

| Ort | Was gehört rein | Wer liest es |
|-----|----------------|--------------|
| **`.claude/markdown/`** | AI-Instruktionen: Regeln, Strategien, Checklisten | Claude (bei jeder Session) |
| **`.claude/commands/`** | Ausführbare Workflows | Claude (per `/project:cc-*`) |
| **`documentation/`** | Referenz-Dokumentation: Diagramme, Specs, Guides | Mensch + Claude (bei Bedarf) |
| **`.claude/markdown/adr/`** | Architektur-Entscheidungen | Claude + Mensch (bei Architektur-Fragen) |

---

## Wo lege ich neue Dateien ab?

| Dateityp | Ablageort |
|----------|-----------|
| Neue Source-Datei | `projects/{modul}/src/` |
| Neuer Test | `projects/{modul}/tests/` |
| AI-Instruktion | `.claude/markdown/` |
| Custom Command | `.claude/commands/` |
| ADR | `.claude/markdown/adr/` |
| Referenz-Dokumentation | `documentation/` |
| Deployment-Config | `deployment/` oder `projects/{modul}/deployment/` |
| Build-Script | `scripts/` |
| Hilfs-Tool | `tools/` |
| Statische Ressource | `resources/` |
| Temporäre Debug-Datei | `temporary/` (gitignored) |
| Cross-Projekt E2E-Test | `tests/` |
| Build-Output | `artifacts/` (gitignored) |
| Lokales Secret | `secrets/` (gitignored) |

---

## Regeln für Claude

### PFLICHT bei neuen Projekt-Modulen:
Bei JEDEM neuen Ordner unter `/projects/` müssen ALLE 6 Ordner angelegt werden.
Leere Ordner bekommen `.gitkeep`. Keine Ausnahmen!

### NIEMALS:
- Code direkt in `/projects/` ablegen (immer in Unterordner)
- Tests außerhalb von `tests/` Ordnern
- Temporäre Dateien in `/src/`
- Produktionscode in `/temporary/`
- Secrets in `/resources/` oder `/documentation/`
- Einen der 6 Ordner weglassen bei neuen Projekten

### IMMER:
- Jeden neuen Code in den richtigen Ordner
- Tests parallel zum Source Code anlegen
- Bei neuem Projekt-Ordner: ALLE 6 Ordner anlegen
- Diese Datei aktualisieren wenn sich die Struktur ändert
