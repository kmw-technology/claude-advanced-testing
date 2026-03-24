# claude-advanced-testing

An MCP (Model Context Protocol) server that provides Claude with advanced web testing and analysis tools powered by Playwright.

## Tools

| Tool | Description |
|------|-------------|
| `screenshot` | Take screenshots with custom viewports, device emulation, full-page capture |
| `accessibility_audit` | WCAG accessibility checks: alt text, form labels, ARIA, headings, lang attr |
| `performance_audit` | Page load metrics, network analysis, console errors, LCP, FP timing |
| `check_links` | Find broken links, redirects, and errors across internal/external links |
| `responsive_test` | Capture screenshots at Mobile/Tablet/Desktop/Wide viewports |
| `scrape_page` | Extract page content via browser (handles JS-rendered pages), run custom JS |
| `seo_analysis` | Title, meta, OG tags, structured data, image alts, canonical URLs |
| `analyze_forms` | Discover forms, fields, labels, required attributes, submit buttons |
| `run_playwright_test` | Execute Playwright test suites from any project directory |

## Setup

```bash
npm install
npm run build
```

## Usage with Claude Code

Add to your Claude Code MCP settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "advanced-testing": {
      "command": "node",
      "args": ["C:/Users/jonas/Desktop/projects/claude-advanced-testing/dist/index.js"]
    }
  }
}
```

## Development

```bash
npm run dev     # Watch mode (TypeScript compiler)
npm run build   # Build once
npm start       # Run the server
```

## Project Structure

```
/src
  /tools        - Individual tool implementations
  /services     - Shared services (browser manager)
  /models       - TypeScript types and interfaces
  index.ts      - MCP server entry point
/tests          - Tests for the MCP server
/deployment     - Deployment configs
/documentation  - Documentation
/artifacts      - Build outputs, temp files
```
