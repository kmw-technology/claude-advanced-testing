# claude-advanced-testing - Memory File

## Projekt-Essenz

**Was:** MCP-Server der Claude mit Web-Testing-Tools ausstattet (Playwright-basiert)
**Warum:** Claude soll Webseiten direkt testen, screenshotten, analysieren können
**Stack:** TypeScript, MCP SDK, Playwright, Zod
**Phase:** Foundation (2026-03-24)

## Entscheidungen

| Datum | Entscheidung | Grund |
|-------|-------------|-------|
| 2026-03-24 | MCP over REST API | Direkte Integration in Claude Code |
| 2026-03-24 | Playwright über Puppeteer | Bessere Multi-Browser-Unterstützung, modernere API |
| 2026-03-24 | Shared Browser Instance | Performance: Browser nicht pro Tool-Call starten |

## Module / Tools

- `screenshot` — Viewport/Device Screenshots
- `accessibility_audit` — WCAG Checks
- `performance_audit` — Performance Metriken
- `check_links` — Link Checker
- `responsive_test` — Multi-Viewport Screenshots
- `scrape_page` — Content Extraction
- `seo_analysis` — SEO Analyse
- `analyze_forms` — Formular Discovery
- `run_playwright_test` — Playwright Runner

## User-Präferenzen

(noch keine)

## Aktive Warnungen

(keine)
