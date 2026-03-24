# Context-Loading / Session-Initialisierung

Lade Projekt-Kontext für eine neue Session.

## Verwendung

```
/project:cc-init [mode]
```

| Mode | Beschreibung | Wann nutzen |
|------|--------------|-------------|
| (leer) | **Vollständig** - Alle Docs, Git, Projekt-Scan | Session-Start |
| `--quick` | **Minimal** - Nur CLAUDE.md + Warnungen + git status | Schnelle Tasks |
| `--refresh` | **Auffrischen** - MEMORY.md + letzte Commits | Mitten in Session |

---

## Mode: Vollständig (Standard)

### Phase 1: Pflicht-Lektüre

```
CLAUDE.md            → Die 10 Gebote, Projekt-Regeln, Doc-Verweise
MEMORY.md            → Status, Entscheidungen, Präferenzen, Warnungen
CRITICAL-THINKING.md → Red Flags, Beispiel-Dialoge, Checklisten
```

**Extrahiere:** Phase, Warnungen, User-Präferenzen, Red-Flag-Wörter

### Phase 2: Git-Context

```bash
git status
git log --oneline -10
git branch -a | head -20
```

**Extrahiere:** Uncommitted Changes, Branch, letzte Arbeiten

### Phase 3: Projekt-Scan

```bash
ls src/ 2>/dev/null | head -20
find . -name "*.csproj" -o -name "package.json" -o -name "Cargo.toml" | head -10
```

**Extrahiere:** Module, Projektgröße, Tech-Stack

### Phase 4: Kondensierte Docs

| Datei | Extrahiere nur |
|-------|----------------|
| `LESSONS-LEARNED.md` | Letzte 3 Learnings |
| `.claude/markdown/CODE-QUALITY.md` | YAGNI/KISS Regeln |
| `.claude/markdown/TESTING-STRATEGY.md` | Coverage-Ziel |

> Falls Datei fehlt → überspringen, notieren.

### Phase 5: Warnungen prüfen

MEMORY.md → "Aktive Warnungen" Sektion → PROMINENT anzeigen!

### Phase 6: Output

```markdown
## Session Context Loaded

**Projekt:** [Name] | **Phase:** [X] | **Branch:** [Y]
**Uncommitted:** [Ja/Nein]

### Warnungen
- [Liste oder "keine"]

### Präferenzen
- [Top 3]

### Letzte Commits
- [3 Commits]

### Quick-Ref
- Tech-Stack: [X] | Coverage-Ziel: [Y]%

---
✅ Context geladen. Bereit!
```

---

## Mode: --quick

**Für schnelle Tasks ohne vollen Context.**

### Nur diese Schritte:

1. **CLAUDE.md** → Status-Block + Die 10 Gebote lesen
2. **MEMORY.md** → Nur "Aktive Warnungen" Sektion
3. **CRITICAL-THINKING.md** → Nur "Red Flag Wörter" Tabelle
4. **git status** → Uncommitted?

### Output:

```markdown
## Quick Context

**Phase:** [X] | **Branch:** [Y] | **Uncommitted:** [Ja/Nein]

### Warnungen
- [Liste oder "keine"]

### Red Flags (Reminder)
Bei "verbessere", "mach mal", "schnell" → NACHFRAGEN!

---
✅ Quick context geladen.
```

---

## Mode: --refresh

**Für Context-Refresh mitten in Session.**

### Nur diese Schritte:

1. **MEMORY.md** → Komplett neu lesen
2. **CRITICAL-THINKING.md** → Red Flags + Pflicht-Pause nochmal verinnerlichen
3. **git log --oneline -5** → Was wurde seit Session-Start gemacht?
4. **Offene Warnungen** → Erneut prüfen

### Output:

```markdown
## Context Refreshed

### Seit Session-Start
- [Commits seit Start]

### Aktuelle Warnungen
- [Liste oder "keine"]

### Reminder: User-Präferenzen
- [Top 3 relevante]

### Reminder: Die 10 Gebote
1. VERSTEHEN vor HANDELN
2. EINFACHSTE Lösung
3. KRITISCH sein
...

---
🔄 Context aufgefrischt.
```

---

## Anti-Patterns

- ❌ Ganze Dateien in Output kopieren
- ❌ Alle ADRs auflisten
- ❌ Jede .md Datei lesen
- ❌ Wiederholen was in CLAUDE.md steht

## Wann tiefer lesen?

| User fragt nach | Dann lies |
|-----------------|-----------|
| Architektur | `.claude/markdown/adr/*.md` |
| Code-Qualität | `.claude/markdown/CODE-QUALITY.md` komplett |
| Tests | `.claude/markdown/TESTING-STRATEGY.md` komplett |
| Deployment | `.claude/markdown/DEPLOYMENT-RUNBOOK.md` |
| Security | `.claude/markdown/OPERATIONS-SECURITY.md` |
| UI/Frontend | `.claude/markdown/DESIGN-SYSTEM.md` |
| Docker | `.claude/markdown/DOCKER-WORKFLOW.md` |
| Ordnerstruktur | `.claude/markdown/FOLDER-STRUCTURE.md` |
