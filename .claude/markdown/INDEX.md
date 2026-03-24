# Dokumentations-Index

> Welches Dokument bei welcher Aufgabe?
> Nicht alles lesen — nur was für die aktuelle Aufgabe relevant ist.

---

## Immer bei Session-Start

| Dokument | Inhalt |
|----------|--------|
| **CLAUDE.md** (Root) | Kernregeln, Architektur-Kurzfassung, Tech-Stack |
| **MEMORY.md** (Root) | Projekt-Status, Entscheidungen, Warnungen |
| **CRITICAL-THINKING.md** | Risk-Matrix, Proaktivität vs. Scope, Red Flags |

---

## AI-Instruktionen (in `.claude/markdown/`)

| Aufgabe | Lies |
|---------|------|
| Autonomie/Entscheidung | [CRITICAL-THINKING.md](CRITICAL-THINKING.md) |
| Code schreiben/ändern | [CODE-QUALITY.md](CODE-QUALITY.md) |
| Tests schreiben | [TESTING-STRATEGY.md](TESTING-STRATEGY.md) |
| UI/Frontend ändern | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) |
| Ordner/Datei erstellen | [FOLDER-STRUCTURE.md](FOLDER-STRUCTURE.md) |
| Deployment | [DEPLOYMENT-RUNBOOK.md](DEPLOYMENT-RUNBOOK.md) |
| Security/Production | [OPERATIONS-SECURITY.md](OPERATIONS-SECURITY.md) |
| Docker/Container | [DOCKER-WORKFLOW.md](DOCKER-WORKFLOW.md) |
| Bekannte Fehler/Patterns | [LESSONS-LEARNED.md](../../LESSONS-LEARNED.md) |

---

## Referenz-Dokumentation (in `documentation/`)

Bei Bedarf on-demand lesen — technische Referenz, keine AI-Instruktionen.

| Aufgabe | Lies |
|---------|------|
| Architektur-Entscheidungen | `.claude/markdown/adr/ADR-00XX-*.md` |

---

## Custom Commands (Wann welchen Command nutzen?)

**Prefix:** Alle Commands starten mit `cc-` (custom command)

### Qualität & Review

| Command | Wann nutzen? |
|---------|--------------|
| `/project:cc-code-review` | Code auf Best Practices prüfen |
| `/project:cc-find-duplicates` | Duplicate Code finden |
| `/project:cc-fix-code-smells` | Code Smells identifizieren und beheben |
| `/project:cc-check-architecture` | Architektur-Regeln prüfen |
| `/project:cc-tech-debt` | Technical Debt analysieren |

### Build & Testing

| Command | Wann nutzen? |
|---------|--------------|
| `/project:cc-build-check` | Build + Format + Tests prüfen |
| `/project:cc-run-tests` | Tests ausführen (Unit/Integration/Coverage) |
| `/project:cc-write-tests` | Tests für Datei/Feature schreiben |
| `/project:cc-security-check` | Sicherheitsanalyse durchführen |
| `/project:cc-pre-commit` | VOR jedem Commit ausführen |

### Projekt & Wartung

| Command | Wann nutzen? |
|---------|--------------|
| `/project:cc-init` | Session starten / Context laden |
| `/project:cc-health-check` | Gesamtüberblick über Projekt-Gesundheit |
| `/project:cc-maintenance` | Systematische Code-Wartung (Audit/Fix) |

### Docker (wenn Docker genutzt wird)

| Command | Wann nutzen? |
|---------|--------------|
| `/project:cc-docker-up` | Docker-Services starten |
| `/project:cc-docker-logs` | Docker-Logs analysieren |
| `/project:cc-docker-stop` | Docker-Services stoppen |

---

## Empfohlene Routine

1. **Session-Start:** `/project:cc-init` (Context laden)
2. **Vor dem Coden:** `/project:cc-health-check` (wöchentlich)
3. **Nach dem Coden:** `/project:cc-code-review [datei]`
4. **Vor dem Commit:** `/project:cc-pre-commit`
5. **Mitten in Session:** `/project:cc-init --refresh` (bei Context-Drift)
6. **Bei Problemen:** `/project:cc-tech-debt` oder `/project:cc-find-duplicates`
