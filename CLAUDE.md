# claude-advanced-testing - Claude Code Anweisungen

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  AKTUELLER STATUS (Letzte Aktualisierung: 2026-03-24)                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Phase:      Foundation                                                      ║
║  Repository: https://github.com/jonaslfranz/claude-advanced-testing          ║
║  Nächstes:   Tool-Erweiterungen, Tests, npm Publish                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  KRITISCH: Keine Production-Änderungen ohne Backup + Genehmigung!            ║
║  PFLICHT:  Lies MEMORY.md für vollständigen Kontext                          ║
║  DENKEN:   Lies .claude/markdown/CRITICAL-THINKING.md - Risk-Matrix!         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## PROJEKT-ÜBERSICHT

**claude-advanced-testing** ist ein MCP-Server (Model Context Protocol), der Claude mit
fortschrittlichen Web-Testing- und Analyse-Tools ausstattet, angetrieben durch Playwright.

### Tools:
- `screenshot` — Screenshots mit Viewport/Device-Emulation
- `accessibility_audit` — WCAG Accessibility-Checks
- `performance_audit` — Performance-Metriken (Load Time, LCP, Network)
- `check_links` — Broken Links erkennen
- `responsive_test` — Responsive Screenshots (Mobile/Tablet/Desktop/Wide)
- `scrape_page` — Seiteninhalte extrahieren (JS-gerendert)
- `seo_analysis` — SEO-Analyse (Meta, OG, Structured Data)
- `analyze_forms` — Formular-Analyse
- `run_playwright_test` — Playwright Tests ausführen

---

## TECHNOLOGIE

| Komponente | Technologie |
|------------|-------------|
| Runtime | Node.js (ES2022) |
| Sprache | TypeScript (strict) |
| MCP SDK | @modelcontextprotocol/sdk |
| Browser | Playwright (Chromium) |
| Validation | Zod |
| CI/CD | GitHub Actions |

---

## PROJEKT-STRUKTUR

```
claude-advanced-testing/
├── src/
│   ├── tools/           # Tool-Implementierungen
│   ├── services/        # Shared Services (Browser Manager)
│   ├── models/          # TypeScript Types
│   └── index.ts         # MCP Server Entry Point
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

# Server starten
npm start

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
