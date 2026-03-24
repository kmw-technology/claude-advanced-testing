#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { screenshotSchema, takeScreenshot } from "./tools/screenshot.js";
import { accessibilitySchema, checkAccessibility } from "./tools/accessibility.js";
import { performanceSchema, measurePerformance } from "./tools/performance.js";
import { linkCheckerSchema, checkLinks } from "./tools/link-checker.js";
import { responsiveSchema, testResponsive } from "./tools/responsive.js";
import { scrapeSchema, scrapePage } from "./tools/scrape.js";
import { seoSchema, analyzeSeo } from "./tools/seo.js";
import { formTesterSchema, analyzeForms } from "./tools/form-tester.js";
import {
  runPlaywrightTestSchema,
  runPlaywrightTest,
} from "./tools/run-playwright-test.js";
import { closeBrowser } from "./services/browser-manager.js";
import {
  startSessionSchema,
  startSessionHandler,
  endSessionSchema,
  endSessionHandler,
} from "./tools/session.js";
import {
  interactSchema,
  interact,
  formatInteractResult,
} from "./tools/interact.js";
import { readPageSchema, readPage, formatReadPageResult } from "./tools/read-page.js";
import {
  exploreAppSchema,
  exploreApp,
  formatExploreResult,
} from "./tools/explore-app.js";
import { endAllSessions } from "./services/session-manager.js";
import {
  collectFeedbackSchema,
  handleCollectFeedback,
  getFeedbackReportSchema,
  handleGetFeedbackReport,
} from "./tools/feedback.js";
import {
  startPersonaTestSchema,
  handleStartPersonaTest,
  endPersonaTestSchema,
  handleEndPersonaTest,
} from "./tools/persona-test.js";
import {
  siteAuditSchema,
  siteAudit,
  formatSiteAuditReport,
} from "./tools/site-audit.js";

const server = new McpServer({
  name: "claude-advanced-testing",
  version: "1.0.0",
});

// --- Tool: Screenshot ---
server.tool(
  "screenshot",
  "Take a screenshot of a webpage. Supports custom viewports, device emulation, and full-page capture.",
  screenshotSchema.shape,
  async (input) => {
    try {
      const result = await takeScreenshot(input);
      return {
        content: [
          {
            type: "image" as const,
            data: result.base64,
            mimeType: result.mimeType,
          },
          {
            type: "text" as const,
            text: `Screenshot of "${result.title}" (${result.url})\nViewport: ${result.width}x${result.height}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Screenshot failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Accessibility Audit ---
server.tool(
  "accessibility_audit",
  "Run an accessibility audit on a webpage. Checks for WCAG violations including missing alt text, form labels, ARIA issues, heading order, and more.",
  accessibilitySchema.shape,
  async (input) => {
    try {
      const result = await checkAccessibility(input);
      let text = `Accessibility Audit: ${result.url}\n`;
      text += `Passes: ${result.passes} | Violations: ${result.violationCount}\n`;
      text += `Critical: ${result.criticalCount} | Serious: ${result.seriousCount}\n\n`;

      if (result.violations.length === 0) {
        text += "No violations found!";
      } else {
        for (const v of result.violations) {
          text += `[${v.impact.toUpperCase()}] ${v.description} (${v.nodes} instance(s))\n`;
          text += `  Rule: ${v.id} | Help: ${v.helpUrl}\n`;
          for (const el of v.elements.slice(0, 3)) {
            text += `  - ${el}\n`;
          }
          if (v.elements.length > 3) {
            text += `  ... and ${v.elements.length - 3} more\n`;
          }
          text += "\n";
        }
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Accessibility audit failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Performance Metrics ---
server.tool(
  "performance_audit",
  "Measure webpage performance: load time, DOM content loaded, first paint, LCP, network requests, console errors/warnings, and transfer sizes.",
  performanceSchema.shape,
  async (input) => {
    try {
      const result = await measurePerformance(input);
      let text = `Performance Audit: ${result.url}\n\n`;
      text += `Load Time: ${result.loadTime}ms\n`;
      text += `DOM Content Loaded: ${result.domContentLoaded}ms\n`;
      if (result.firstPaint) text += `First Paint: ${result.firstPaint}ms\n`;
      if (result.largestContentfulPaint)
        text += `Largest Contentful Paint: ${result.largestContentfulPaint}ms\n`;
      text += `\nNetwork: ${result.totalRequests} requests (${result.failedRequests} failed)\n`;
      text += `Transfer Size: ${(result.totalTransferSize / 1024).toFixed(1)} KB\n`;

      if (result.consoleErrors.length > 0) {
        text += `\nConsole Errors (${result.consoleErrors.length}):\n`;
        for (const e of result.consoleErrors.slice(0, 10)) {
          text += `  - ${e.text}${e.location ? ` (${e.location})` : ""}\n`;
        }
      }

      if (result.consoleWarnings.length > 0) {
        text += `\nConsole Warnings (${result.consoleWarnings.length}):\n`;
        for (const w of result.consoleWarnings.slice(0, 10)) {
          text += `  - ${w.text}\n`;
        }
      }

      // Top slowest requests
      const slowest = [...result.networkRequests]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
      if (slowest.length > 0) {
        text += `\nSlowest Requests:\n`;
        for (const r of slowest) {
          text += `  ${r.duration}ms ${r.method} ${r.url.slice(0, 100)}\n`;
        }
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Performance audit failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Link Checker ---
server.tool(
  "check_links",
  "Check all links on a webpage for broken links, redirects, and errors. Can check internal links only or include external links.",
  linkCheckerSchema.shape,
  async (input) => {
    try {
      const result = await checkLinks(input);
      let text = `Link Check: ${result.baseUrl}\n`;
      text += `Total: ${result.totalLinks} | Working: ${result.workingLinks} | Broken: ${result.brokenLinks.length} | Redirects: ${result.redirectLinks.length}\n\n`;

      if (result.brokenLinks.length > 0) {
        text += `Broken Links:\n`;
        for (const link of result.brokenLinks) {
          text += `  [${link.status ?? "ERR"}] ${link.url}`;
          if (link.error) text += ` - ${link.error}`;
          text += "\n";
        }
        text += "\n";
      }

      if (result.redirectLinks.length > 0) {
        text += `Redirects:\n`;
        for (const link of result.redirectLinks) {
          text += `  [${link.status}] ${link.url}\n    -> ${link.redirectUrl}\n`;
        }
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Link check failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Responsive Test ---
server.tool(
  "responsive_test",
  "Test responsive layouts by capturing screenshots at multiple viewport sizes (Mobile, Tablet, Desktop, Wide). Returns screenshots for visual comparison.",
  responsiveSchema.shape,
  async (input) => {
    try {
      const result = await testResponsive(input);
      const content = [];

      for (const viewport of result.viewports) {
        content.push({
          type: "text" as const,
          text: `--- ${viewport.name} (${viewport.width}x${viewport.height}) ---`,
        });
        content.push({
          type: "image" as const,
          data: viewport.screenshot,
          mimeType: "image/png",
        });
      }

      return { content };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Responsive test failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Scrape Page ---
server.tool(
  "scrape_page",
  "Scrape content from a webpage using a real browser (handles JS-rendered content). Can extract specific elements via CSS selector, extract links, or run custom JavaScript.",
  scrapeSchema.shape,
  async (input) => {
    try {
      const result = await scrapePage(input);
      let text = `Page: ${result.title} (${result.url})\n\n`;
      text += result.content;

      if (result.links && result.links.length > 0) {
        text += `\n\nLinks (${result.links.length}):\n`;
        for (const link of result.links.slice(0, 50)) {
          text += `  - [${link.text || "(no text)"}] ${link.href}\n`;
        }
        if (result.links.length > 50) {
          text += `  ... and ${result.links.length - 50} more\n`;
        }
      }

      if (result.jsResult !== undefined) {
        text += `\n\nJavaScript Result:\n${JSON.stringify(result.jsResult, null, 2)}`;
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Scrape failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: SEO Analysis ---
server.tool(
  "seo_analysis",
  "Analyze a webpage for SEO: title, meta description, headings, Open Graph tags, Twitter cards, structured data (JSON-LD), image alt texts, canonical URL, and link counts.",
  seoSchema.shape,
  async (input) => {
    try {
      const result = await analyzeSeo(input);
      let text = `SEO Analysis: ${result.url}\n\n`;
      text += `Title: ${result.title || "(missing)"}\n`;
      text += `Meta Description: ${result.metaDescription || "(missing)"}\n`;
      text += `Canonical: ${result.canonicalUrl || "(not set)"}\n\n`;

      text += `Headings:\n`;
      text += `  H1 (${result.h1Tags.length}): ${result.h1Tags.join(", ") || "(none)"}\n`;
      text += `  H2 (${result.h2Tags.length}): ${result.h2Tags.join(", ") || "(none)"}\n\n`;

      text += `Images: ${result.totalImages} total, ${result.imagesWithoutAlt} missing alt text\n`;
      text += `Links: ${result.internalLinks} internal, ${result.externalLinks} external\n\n`;

      if (Object.keys(result.ogTags).length > 0) {
        text += `Open Graph Tags:\n`;
        for (const [key, value] of Object.entries(result.ogTags)) {
          text += `  ${key}: ${value}\n`;
        }
        text += "\n";
      } else {
        text += "Open Graph Tags: (none)\n\n";
      }

      if (Object.keys(result.twitterTags).length > 0) {
        text += `Twitter Tags:\n`;
        for (const [key, value] of Object.entries(result.twitterTags)) {
          text += `  ${key}: ${value}\n`;
        }
        text += "\n";
      }

      if (result.hasRobotsMeta) {
        text += `Robots Meta: ${result.robotsContent}\n`;
      }

      if (result.structuredData.length > 0) {
        text += `\nStructured Data (${result.structuredData.length} block(s)):\n`;
        text += JSON.stringify(result.structuredData, null, 2);
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `SEO analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Form Analyzer ---
server.tool(
  "analyze_forms",
  "Analyze all forms on a webpage: fields, types, labels, required attributes, and submit buttons. Useful for understanding form structure before testing.",
  formTesterSchema.shape,
  async (input) => {
    try {
      const result = await analyzeForms(input);
      let text = `Form Analysis: ${result.url}\n`;
      text += `Found ${result.forms.length} form(s)\n\n`;

      for (let i = 0; i < result.forms.length; i++) {
        const form = result.forms[i];
        text += `Form #${i + 1}:\n`;
        text += `  Action: ${form.action || "(none)"}\n`;
        text += `  Method: ${form.method}\n`;
        text += `  Submit: ${form.submitButton || "(no submit button found)"}\n`;
        text += `  Fields (${form.fields.length}):\n`;

        for (const field of form.fields) {
          const parts = [`    - <${field.tag}>`];
          if (field.type) parts.push(`type="${field.type}"`);
          if (field.name) parts.push(`name="${field.name}"`);
          if (field.label) parts.push(`label="${field.label}"`);
          if (field.placeholder) parts.push(`placeholder="${field.placeholder}"`);
          if (field.required) parts.push("[REQUIRED]");
          text += parts.join(" ") + "\n";
        }
        text += "\n";
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Form analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Run Playwright Tests ---
server.tool(
  "run_playwright_test",
  "Run Playwright test files from a specified directory. Supports filtering by file, grep pattern, browser project, and headed/headless mode.",
  runPlaywrightTestSchema.shape,
  async (input) => {
    try {
      const result = await runPlaywrightTest(input);
      let text = result.success
        ? "Tests PASSED\n"
        : "Tests FAILED\n";
      text += `Exit Code: ${result.exitCode}\n\n`;
      text += `Summary: ${result.summary}\n\n`;

      if (result.stdout) {
        text += `--- stdout ---\n${result.stdout.slice(0, 5000)}\n`;
      }
      if (result.stderr) {
        text += `--- stderr ---\n${result.stderr.slice(0, 2000)}\n`;
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Test run failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Start Session ---
server.tool(
  "start_session",
  "Start a persistent browser session for interactive testing. The session stays open across multiple tool calls, preserving cookies, auth state, and navigation history. Returns a sessionId to use with interact, read_page, and explore_app.",
  startSessionSchema.shape,
  async (input) => {
    try {
      const result = await startSessionHandler(input);

      let text = `Session started: ${result.session.id}\n`;
      text += `Viewport: ${result.session.width}x${result.session.height}`;
      if (result.session.deviceName) text += ` (${result.session.deviceName})`;
      text += "\n";

      if (result.pageState) {
        text += `URL: ${result.pageState.url}\n`;
        text += `Title: ${result.pageState.title}\n`;
        text += `Interactive Elements: ${result.pageState.interactiveElements.length}\n`;
        text += `Forms: ${result.pageState.forms.length}\n`;

        if (result.pageState.visibleText) {
          text += `\nVisible Text:\n${result.pageState.visibleText}\n`;
        }
      }

      if (result.pageState?.screenshot) {
        return {
          content: [
            { type: "text" as const, text },
            {
              type: "image" as const,
              data: result.pageState.screenshot,
              mimeType: "image/png",
            },
          ],
        };
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to start session: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: End Session ---
server.tool(
  "end_session",
  "Close a browser session and free its resources. Always call this when done testing.",
  endSessionSchema.shape,
  async (input) => {
    try {
      const message = await endSessionHandler(input);
      return { content: [{ type: "text" as const, text: message }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to end session: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Interact ---
server.tool(
  "interact",
  "Interact with a webpage in an active session: click buttons, fill forms, select options, navigate, press keys, scroll, and more. Uses smart element finding — target elements by their visible text, label, placeholder, ARIA role, test ID, or CSS selector. Returns the page state after the action including all interactive elements, forms, and notifications.",
  interactSchema.shape,
  async (input) => {
    try {
      const result = await interact(input);
      const text = formatInteractResult(result);

      if (result.pageState.screenshot) {
        return {
          content: [
            { type: "text" as const, text },
            {
              type: "image" as const,
              data: result.pageState.screenshot,
              mimeType: "image/png",
            },
          ],
          isError: !result.success ? true : undefined,
        };
      }

      return {
        content: [{ type: "text" as const, text }],
        isError: !result.success ? true : undefined,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Interaction failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Read Page ---
server.tool(
  "read_page",
  "Read the current state of a page in an active session. Returns all interactive elements (buttons, links, inputs), forms with their fields and current values, visible notifications/errors, and optionally a screenshot and visible text content. Use this to understand what's on the page before deciding what to do next.",
  readPageSchema.shape,
  async (input) => {
    try {
      const state = await readPage(input);
      const text = formatReadPageResult(state);

      if (state.screenshot) {
        return {
          content: [
            { type: "text" as const, text },
            {
              type: "image" as const,
              data: state.screenshot,
              mimeType: "image/png",
            },
          ],
        };
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Read page failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Explore App ---
server.tool(
  "explore_app",
  "Automatically discover and map all pages of a web application. Crawls from a start URL, following links up to a configurable depth. For each page, extracts forms, interactive elements, and outgoing links. Supports authenticated crawling via an existing session. Returns a complete sitemap of the application.",
  exploreAppSchema.shape,
  async (input) => {
    try {
      const result = await exploreApp(input);
      return {
        content: [
          {
            type: "text" as const,
            text: formatExploreResult(result),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `App exploration failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Collect Feedback ---
server.tool(
  "collect_feedback",
  "Record a structured finding during a testing session. Categories: bug, ux_issue, confusion, accessibility_issue, performance_issue, missing_feature, positive. Severities: critical, major, minor, positive.",
  collectFeedbackSchema.shape,
  async (input) => {
    try {
      const result = await handleCollectFeedback(input);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Get Feedback Report ---
server.tool(
  "get_feedback_report",
  "Get an aggregated feedback report for a testing session. Optionally filter by category or severity.",
  getFeedbackReportSchema.shape,
  async (input) => {
    try {
      const result = await handleGetFeedbackReport(input);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Site Audit ---
server.tool(
  "site_audit",
  "Comprehensive site audit: crawl a website and run accessibility, performance, and SEO checks on every discovered page. Returns a structured report with findings aggregated by severity and page type.",
  siteAuditSchema.shape,
  async (input) => {
    try {
      const result = await siteAudit(input);
      const text = formatSiteAuditReport(result);

      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
        { type: "text" as const, text },
      ];

      // Include screenshots if captured
      for (const page of result.pages) {
        if (page.stages.capture.screenshotBase64) {
          content.push({
            type: "image" as const,
            data: page.stages.capture.screenshotBase64,
            mimeType: "image/png",
          });
        }
      }

      return { content };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Start Persona Test ---
server.tool(
  "start_persona_test",
  "Start a persona-based testing session. Define a user persona with goals, pain points, and tech savviness, then test a website from their perspective. Use interact and collect_feedback tools during the test, then end_persona_test for a report.",
  startPersonaTestSchema.shape,
  async (input) => {
    try {
      const result = await handleStartPersonaTest(input);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: End Persona Test ---
server.tool(
  "end_persona_test",
  "End a persona-based testing session and get an aggregated report with all collected feedback, completed checklist items, and overall sentiment.",
  endPersonaTestSchema.shape,
  async (input) => {
    try {
      const result = await handleEndPersonaTest(input);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
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
  console.error("claude-advanced-testing MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
