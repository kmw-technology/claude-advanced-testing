# claude-advanced-testing - Claude Code Anweisungen

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  AKTUELLER STATUS (Letzte Aktualisierung: 2026-03-24)                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Phase:      v2.0 — Agent System                                             ║
║  Repository: https://github.com/jonaslfranz/claude-advanced-testing          ║
║  Nächstes:   Tests, npm Publish, weitere Backends                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  KRITISCH: Keine Production-Änderungen ohne Backup + Genehmigung!            ║
║  PFLICHT:  Lies MEMORY.md für vollständigen Kontext                          ║
║  DENKEN:   Lies .claude/markdown/CRITICAL-THINKING.md - Risk-Matrix!         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## PROJEKT-ÜBERSICHT

**claude-advanced-testing** ist ein MCP-Server (Model Context Protocol) mit integriertem
Agent-System, der autonomes Web-Testing mit Playwright ermöglicht.

### MCP Tools (7):
- `test_website` — Kombinierter Check: Screenshot, Accessibility, Performance, Links, Responsive, SEO, Forms. Site-Audit via `maxPages > 1`
- `session` — Browser-Sessions starten/beenden (action: start/end)
- `interact` — Klicken, Ausfüllen, Navigieren in einer Session
- `read_page` — Seiteninhalte lesen (Session oder One-Off URL)
- `explore_app` — App crawlen, Sitemap erstellen, Page-Klassifikation
- `run_test` — Playwright Tests ausführen
- `persona_test` — Persona-basiertes Testing mit Feedback-Sammlung

### Agent-System:
Autonomes Testing mit zwei austauschbaren Backends:
- **OpenAI API** — Wir kontrollieren den Agentic Loop (tool_calls → execute → loop)
- **Claude Code CLI** — Selbstlaufende Instanz, verbindet sich via MCP

---

## TECHNOLOGIE

| Komponente | Technologie |
|------------|-------------|
| Runtime | Node.js (ES2022) |
| Sprache | TypeScript (strict) |
| MCP SDK | @modelcontextprotocol/sdk |
| Browser | Playwright (Chromium) |
| Validation | Zod |
| LLM | OpenAI SDK (^6.x) |
| Schema | zod-to-json-schema |
| CI/CD | GitHub Actions |

---

## PROJEKT-STRUKTUR

```
claude-advanced-testing/
├── src/
│   ├── agent/           # Agent-System (OpenAI + Claude Code Backends)
│   ├── tools/           # Tool-Implementierungen (7 MCP Tools)
│   ├── services/        # Shared Services (Browser, Sessions, SPA-Wait, i18n)
│   ├── models/          # TypeScript Types
│   ├── index.ts         # MCP Server Entry Point
│   └── agent-cli.ts     # Agent CLI Entry Point
├── tests/               # Tests
├── deployment/          # Deployment Configs
├── documentation/       # Dokumentation
├── artifacts/           # Build Outputs
├── .claude/
│   ├── commands/        # Custom Commands
│   └── markdown/        # AI-Instruktionen
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

---

## WICHTIGE BEFEHLE

```bash
# Build
npm run build

# Development (watch mode)
npm run dev

# MCP Server starten
npm start

# Agent (autonomes Testing)
npm run agent -- --backend openai --task "Test https://example.com"
npm run agent -- --backend claude-code --task "Full audit of https://example.com"
npm run agent -- --help

# Tests
npm test
```

---

## DIE 10 GEBOTE (TL;DR)

1. VERSTEHEN vor HANDELN
2. EINFACHSTE Lösung
3. KRITISCH sein
4. NACHFRAGEN bei Red Flags
5. KEINE Annahmen
6. AUTO-COMMIT häufig
7. MEMORY.md aktualisieren
8. SCOPE einhalten
9. SICHERHEIT geht vor
10. DOKUMENTIEREN

---

## RISK-MATRIX

| Kategorie | Aktion | Beispiele |
|-----------|--------|-----------|
| **act_now** | Autonom, kein Report | Typos, Imports, Formatierung |
| **act_and_report** | Autonom, kurz erwähnen | Tests, kleine Refactorings (<30 Zeilen), Docs |
| **ask_first** | VOR Ausführung fragen | Neue Features, API-Änderungen, neue Dependencies |
| **forbidden** | Genehmigung + Bestätigung | Production-DB, Deployments, Force-Push, Secrets |
