#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { closeBrowser } from "./services/browser-manager.js";
import { endAllSessions } from "./services/session-manager.js";
import {
  testWebsiteSchema,
  handleTestWebsite,
} from "./tools/test-website.js";
import { sessionSchema, handleSession } from "./tools/session.js";
import {
  interactSchema,
  interact,
  formatInteractResult,
} from "./tools/interact.js";
import {
  readPageSchema,
  readPage,
  formatReadPageResult,
} from "./tools/read-page.js";
import {
  exploreAppSchema,
  exploreApp,
  formatExploreResult,
} from "./tools/explore-app.js";
import {
  runPlaywrightTestSchema,
  runPlaywrightTest,
} from "./tools/run-playwright-test.js";
import {
  personaTestSchema,
  handlePersonaTest,
} from "./tools/persona-test.js";

// --- Screenshot persistence (backend-agnostic) ---
// When SNAPSHOT_SCREENSHOT_DIR is set, save all tool screenshots to disk.
// This works regardless of which agent backend (OpenAI, Claude Code) calls the tools.
const snapshotScreenshotDir = process.env.SNAPSHOT_SCREENSHOT_DIR;
let screenshotCounter = 0;

if (snapshotScreenshotDir) {
  mkdirSync(snapshotScreenshotDir, { recursive: true });
}

type McpContent = Array<
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }
>;

function persistScreenshots(toolName: string, content: McpContent): void {
  if (!snapshotScreenshotDir) return;
  for (const item of content) {
    if (item.type === "image" && "data" in item) {
      screenshotCounter++;
      const filename = `${String(screenshotCounter).padStart(3, "0")}-${toolName}.png`;
      const fullPath = join(snapshotScreenshotDir, filename);
      writeFileSync(fullPath, Buffer.from(item.data, "base64"));
    }
  }
}

const server = new McpServer({
  name: "claude-advanced-testing",
  version: "2.0.0",
});

// --- Tool 1: test_website ---
server.tool(
  "test_website",
  `Test a webpage with one or more checks: "screenshot", "accessibility", "performance", "links", "responsive", "seo", "forms". Combine multiple checks in a single call. Set maxPages > 1 for a full site audit that crawls and tests every discovered page.`,
  testWebsiteSchema.shape,
  async (input) => {
    try {
      const result = await handleTestWebsite(input);
      const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; data: string; mimeType: string }
      > = [{ type: "text" as const, text: result.text }];

      for (const img of result.images) {
        content.push({
          type: "image" as const,
          data: img.data,
          mimeType: img.mimeType,
        });
      }

      persistScreenshots("test_website", content);
      return { content };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `test_website failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool 2: session ---
server.tool(
  "session",
  `Manage browser sessions. action="start" opens a persistent browser session for interactive testing (returns sessionId). action="end" closes it. Sessions preserve cookies, auth state, and navigation history across tool calls. Set fakeMedia=true to enable voice/audio testing with fake microphone.`,
  sessionSchema.shape,
  async (input) => {
    try {
      const result = await handleSession(input);

      let text = result.message + "\n";
      if (result.session) {
        text += `Viewport: ${result.session.width}x${result.session.height}`;
        if (result.session.deviceName)
          text += ` (${result.session.deviceName})`;
        text += "\n";
      }
      if (result.pageState) {
        text += `URL: ${result.pageState.url}\n`;
        text += `Title: ${result.pageState.title}\n`;
        text += `Elements: ${result.pageState.interactiveElements.length} | Forms: ${result.pageState.forms.length}\n`;
        if (result.pageState.visibleText) {
          text += `\n${result.pageState.visibleText}\n`;
        }
      }

      if (result.pageState?.screenshot) {
        const content: McpContent = [
          { type: "text" as const, text },
          {
            type: "image" as const,
            data: result.pageState.screenshot,
            mimeType: "image/png",
          },
        ];
        persistScreenshots("session", content);
        return { content };
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `session failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool 3: interact ---
server.tool(
  "interact",
  "Interact with a webpage in an active session: click, fill, select, check, hover, press_key, scroll, navigate, submit, send_audio. Target elements by text, label, placeholder, ARIA role, testId, or CSS selector. Returns page state after the action. send_audio with ttsText generates real speech via Edge TTS (free, no API key), injects it as microphone input, and lets the app transcribe it naturally. Recording duration auto-adapts to speech length.",
  interactSchema.shape,
  async (input) => {
    try {
      const result = await interact(input);
      const text = formatInteractResult(result);

      if (result.pageState.screenshot) {
        const content: McpContent = [
          { type: "text" as const, text },
          {
            type: "image" as const,
            data: result.pageState.screenshot,
            mimeType: "image/png",
          },
        ];
        persistScreenshots("interact", content);
        return { content, isError: !result.success ? true : undefined };
      }

      return {
        content: [{ type: "text" as const, text }],
        isError: !result.success ? true : undefined,
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `interact failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool 4: read_page ---
server.tool(
  "read_page",
  "Read a webpage's content, elements, and forms. Use sessionId for active sessions, or url for one-off reads (opens temp browser). Supports CSS selectors for targeted extraction, link extraction, and custom JavaScript execution.",
  readPageSchema.shape,
  async (input) => {
    try {
      const result = await readPage(input);
      const text = formatReadPageResult(result);

      if (result.pageState.screenshot) {
        const content: McpContent = [
          { type: "text" as const, text },
          {
            type: "image" as const,
            data: result.pageState.screenshot,
            mimeType: "image/png",
          },
        ];
        persistScreenshots("read_page", content);
        return { content };
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `read_page failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool 5: explore_app ---
server.tool(
  "explore_app",
  "Crawl and map a web application. Discovers pages by following links up to configurable depth. Classifies page types, detects consent banners, and optionally captures screenshots with deduplication. Returns a complete sitemap.",
  exploreAppSchema.shape,
  async (input) => {
    try {
      const result = await exploreApp(input);
      return {
        content: [
          { type: "text" as const, text: formatExploreResult(result) },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `explore_app failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool 6: run_test ---
server.tool(
  "run_test",
  "Run Playwright test files. Supports filtering by file, grep pattern, browser project, and headed/headless mode.",
  runPlaywrightTestSchema.shape,
  async (input) => {
    try {
      const result = await runPlaywrightTest(input);
      let text = result.success ? "Tests PASSED\n" : "Tests FAILED\n";
      text += `Exit Code: ${result.exitCode}\n\n`;
      text += `Summary: ${result.summary}\n\n`;
      if (result.stdout) text += `--- stdout ---\n${result.stdout.slice(0, 5000)}\n`;
      if (result.stderr) text += `--- stderr ---\n${result.stderr.slice(0, 2000)}\n`;
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `run_test failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool 7: persona_test ---
server.tool(
  "persona_test",
  `Test a website as a specific user persona. Actions: "start" (define persona + URL, get testing checklist), "feedback" (record a finding with category/severity), "report" (view aggregated feedback), "end" (finalize with full report). Use interact tool between feedback calls to navigate the site.`,
  personaTestSchema.shape,
  async (input) => {
    try {
      const result = await handlePersonaTest(input);

      if (result.screenshot) {
        const content: McpContent = [
          { type: "text" as const, text: result.text },
          {
            type: "image" as const,
            data: result.screenshot,
            mimeType: "image/png",
          },
        ];
        persistScreenshots("persona_test", content);
        return { content };
      }

      return { content: [{ type: "text" as const, text: result.text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `persona_test failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Cleanup on exit ---
process.on("SIGINT", async () => {
  await endAllSessions();
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await endAllSessions();
  await closeBrowser();
  process.exit(0);
});

// --- Start server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("claude-advanced-testing MCP server v2.0 running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
