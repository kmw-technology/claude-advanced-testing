import { zodToJsonSchema } from "zod-to-json-schema";
import type { ToolDefinition, ToolOutput } from "./types.js";

// --- Tool Schemas ---
import { testWebsiteSchema, handleTestWebsite } from "../tools/test-website.js";
import { sessionSchema, handleSession } from "../tools/session.js";
import {
  interactSchema,
  interact,
  formatInteractResult,
} from "../tools/interact.js";
import {
  readPageSchema,
  readPage,
  formatReadPageResult,
} from "../tools/read-page.js";
import {
  exploreAppSchema,
  exploreApp,
  formatExploreResult,
} from "../tools/explore-app.js";
import {
  runPlaywrightTestSchema,
  runPlaywrightTest,
} from "../tools/run-playwright-test.js";
import { personaTestSchema, handlePersonaTest } from "../tools/persona-test.js";

// --- Tool Descriptions (matching index.ts MCP registrations) ---

// Descriptions match index.ts MCP registrations exactly (single source of truth)
const TOOL_DESCRIPTIONS: Record<string, string> = {
  test_website:
    'Test a webpage with one or more checks: "screenshot", "accessibility", "performance", "links", "responsive", "seo", "forms". Combine multiple checks in a single call. Set maxPages > 1 for a full site audit that crawls and tests every discovered page.',
  session:
    'Manage browser sessions. action="start" opens a persistent browser session for interactive testing (returns sessionId). action="end" closes it. Sessions preserve cookies, auth state, and navigation history across tool calls. Set fakeMedia=true to enable voice/audio testing with fake microphone.',
  interact:
    "Interact with a webpage in an active session: click, fill, select, check, hover, press_key, scroll, navigate, submit, send_audio. Target elements by text, label, placeholder, ARIA role, testId, or CSS selector. Returns page state after the action. send_audio with ttsText generates real speech via Edge TTS (free, no API key), injects it as microphone input, and lets the app transcribe it naturally. Recording duration auto-adapts to speech length.",
  read_page:
    "Read a webpage's content, elements, and forms. Use sessionId for active sessions, or url for one-off reads (opens temp browser). Supports CSS selectors for targeted extraction, link extraction, and custom JavaScript execution.",
  explore_app:
    "Crawl and map a web application. Discovers pages by following links up to configurable depth. Classifies page types, detects consent banners, and optionally captures screenshots with deduplication. Returns a complete sitemap.",
  run_test:
    "Run Playwright test files. Supports filtering by file, grep pattern, browser project, and headed/headless mode.",
  persona_test:
    'Test a website as a specific user persona. Actions: "start" (define persona + URL, get testing checklist), "feedback" (record a finding with category/severity), "report" (view aggregated feedback), "end" (finalize with full report). Use interact tool between feedback calls to navigate the site.',
};

// --- Build Tool Definitions ---

function buildToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "test_website",
      description: TOOL_DESCRIPTIONS.test_website,
      parameters: zodToJsonSchema(testWebsiteSchema, { target: "openApi3" }),
      handler: async (input) => {
        const result = await handleTestWebsite(input as any);
        return { text: result.text, images: result.images };
      },
    },
    {
      name: "session",
      description: TOOL_DESCRIPTIONS.session,
      parameters: zodToJsonSchema(sessionSchema, { target: "openApi3" }),
      handler: async (input) => {
        const result = await handleSession(input as any);
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
        return { text };
      },
    },
    {
      name: "interact",
      description: TOOL_DESCRIPTIONS.interact,
      parameters: zodToJsonSchema(interactSchema, { target: "openApi3" }),
      handler: async (input) => {
        const result = await interact(input as any);
        return { text: formatInteractResult(result) };
      },
    },
    {
      name: "read_page",
      description: TOOL_DESCRIPTIONS.read_page,
      parameters: zodToJsonSchema(readPageSchema, { target: "openApi3" }),
      handler: async (input) => {
        const result = await readPage(input as any);
        return { text: formatReadPageResult(result) };
      },
    },
    {
      name: "explore_app",
      description: TOOL_DESCRIPTIONS.explore_app,
      parameters: zodToJsonSchema(exploreAppSchema, { target: "openApi3" }),
      handler: async (input) => {
        const result = await exploreApp(input as any);
        return { text: formatExploreResult(result) };
      },
    },
    {
      name: "run_test",
      description: TOOL_DESCRIPTIONS.run_test,
      parameters: zodToJsonSchema(runPlaywrightTestSchema, {
        target: "openApi3",
      }),
      handler: async (input) => {
        const result = await runPlaywrightTest(input as any);
        let text = result.success ? "Tests PASSED\n" : "Tests FAILED\n";
        text += `Exit Code: ${result.exitCode}\n\n`;
        text += `Summary: ${result.summary}\n\n`;
        if (result.stdout)
          text += `\n--- stdout ---\n${result.stdout.slice(0, 5000)}\n`;
        if (result.stderr)
          text += `\n--- stderr ---\n${result.stderr.slice(0, 2000)}\n`;
        return { text };
      },
    },
    {
      name: "persona_test",
      description: TOOL_DESCRIPTIONS.persona_test,
      parameters: zodToJsonSchema(personaTestSchema, { target: "openApi3" }),
      handler: async (input) => {
        const result = await handlePersonaTest(input as any);
        return { text: result.text };
      },
    },
  ];
}

// Cached definitions
let cachedDefinitions: ToolDefinition[] | null = null;

export function getToolDefinitions(
  enabledTools?: string[]
): ToolDefinition[] {
  if (!cachedDefinitions) {
    cachedDefinitions = buildToolDefinitions();
  }

  if (!enabledTools || enabledTools.length === 0) {
    return cachedDefinitions;
  }

  return cachedDefinitions.filter((t) => enabledTools.includes(t.name));
}

// --- Convert to OpenAI format ---

export function toOpenAITools(
  definitions: ToolDefinition[]
): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return definitions.map((def) => ({
    type: "function" as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: def.parameters as Record<string, unknown>,
    },
  }));
}

// --- Execute a tool call by name ---

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<ToolOutput> {
  const definitions = getToolDefinitions();
  const tool = definitions.find((t) => t.name === name);
  if (!tool) {
    return { text: `Unknown tool: ${name}` };
  }

  try {
    return await tool.handler(args);
  } catch (err) {
    return {
      text: `Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
