import { z } from "zod";
import { getSession, clearSessionErrors } from "../services/session-manager.js";
import { extractPageState } from "../services/page-state-extractor.js";
import { createPage, navigateAndWait } from "../services/browser-manager.js";
import type { PageState } from "../models/types.js";

export const readPageSchema = z.object({
  sessionId: z
    .string()
    .optional()
    .describe("Active session ID. If set, reads from the session page."),
  url: z
    .string()
    .url()
    .optional()
    .describe(
      "URL to read (opens a temporary browser). Use this for one-off page reads without a session."
    ),
  selector: z
    .string()
    .optional()
    .describe(
      "CSS selector to extract specific content instead of full page"
    ),
  includeScreenshot: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include a screenshot of the current page"),
  includeVisibleText: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include all visible text content"),
  extractLinks: z
    .boolean()
    .optional()
    .default(false)
    .describe("Extract all links from the page (text + href)"),
  javascript: z
    .string()
    .optional()
    .describe("JavaScript code to execute on the page and return results"),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before reading (for url mode)"),
});

export type ReadPageInput = z.infer<typeof readPageSchema>;

export interface ReadPageResult {
  pageState: PageState;
  links?: Array<{ text: string; href: string }>;
  jsResult?: unknown;
}

export async function readPage(input: ReadPageInput): Promise<ReadPageResult> {
  if (!input.sessionId && !input.url) {
    throw new Error(
      "Either sessionId or url is required."
    );
  }

  // Session mode
  if (input.sessionId) {
    const session = getSession(input.sessionId);
    const errors = clearSessionErrors(session);

    const pageState = await extractPageState(session.page, {
      consoleErrors: errors,
      includeScreenshot: input.includeScreenshot,
      includeVisibleText: input.includeVisibleText,
    });

    if (input.selector) {
      try {
        const texts = await session.page.$$eval(input.selector, (els) =>
          els.map((el) => (el as HTMLElement).innerText?.trim() ?? "")
        );
        pageState.visibleText = texts.join("\n\n");
      } catch {
        // Selector failed — keep full text
      }
    }

    let links: Array<{ text: string; href: string }> | undefined;
    if (input.extractLinks) {
      links = await session.page.$$eval("a[href]", (anchors) =>
        anchors.map((a) => ({
          text: (a.textContent || "").trim(),
          href: a.getAttribute("href") || "",
        }))
      );
    }

    let jsResult: unknown;
    if (input.javascript) {
      jsResult = await session.page.evaluate(input.javascript);
    }

    return { pageState, links, jsResult };
  }

  // URL mode (temp browser)
  const { context, page } = await createPage();
  try {
    await navigateAndWait(page, input.url!, {
      waitForSelector: input.waitForSelector,
    });

    const pageState = await extractPageState(page, {
      consoleErrors: [],
      includeScreenshot: input.includeScreenshot,
      includeVisibleText: input.includeVisibleText,
    });

    if (input.selector) {
      try {
        const texts = await page.$$eval(input.selector, (els) =>
          els.map((el) => (el as HTMLElement).innerText?.trim() ?? "")
        );
        pageState.visibleText = texts.join("\n\n");
      } catch {
        // fallback
      }
    }

    let links: Array<{ text: string; href: string }> | undefined;
    if (input.extractLinks) {
      links = await page.$$eval("a[href]", (anchors) =>
        anchors.map((a) => ({
          text: (a.textContent || "").trim(),
          href: a.getAttribute("href") || "",
        }))
      );
    }

    let jsResult: unknown;
    if (input.javascript) {
      jsResult = await page.evaluate(input.javascript);
    }

    return { pageState, links, jsResult };
  } finally {
    await context.close();
  }
}

export function formatReadPageResult(result: ReadPageResult): string {
  const state = result.pageState;
  const lines: string[] = [];

  lines.push(`Page: ${state.title || "(no title)"}`);
  lines.push(`URL: ${state.url}`);

  if (state.notifications.length > 0) {
    lines.push(`\nNotifications:`);
    for (const n of state.notifications) {
      lines.push(`  - ${n}`);
    }
  }

  if (state.consoleErrors.length > 0) {
    lines.push(`\nConsole Errors (${state.consoleErrors.length}):`);
    for (const e of state.consoleErrors.slice(0, 5)) {
      lines.push(`  - ${e.text}`);
    }
  }

  if (state.forms.length > 0) {
    lines.push(`\nForms (${state.forms.length}):`);
    for (const form of state.forms) {
      lines.push(
        `  [${form.method}] ${form.action || "(no action)"} — ${form.fields.length} fields${form.submitButton ? ` — "${form.submitButton}"` : ""}`
      );
      for (const f of form.fields) {
        const parts = [`    <${f.tag}>`];
        if (f.type) parts.push(`type="${f.type}"`);
        if (f.label) parts.push(`label="${f.label}"`);
        if (f.placeholder) parts.push(`placeholder="${f.placeholder}"`);
        if (f.value) parts.push(`value="${f.value}"`);
        if (f.required) parts.push("[REQUIRED]");
        if (f.options) parts.push(`options=[${f.options.join(", ")}]`);
        lines.push(parts.join(" "));
      }
    }
  }

  if (state.interactiveElements.length > 0) {
    lines.push(`\nInteractive Elements (${state.interactiveElements.length}):`);
    for (const el of state.interactiveElements.slice(0, 30)) {
      const parts = [`  [${el.tag}]`];
      if (el.role) parts.push(`role="${el.role}"`);
      if (el.text) parts.push(`"${el.text}"`);
      if (el.href) parts.push(`→ ${el.href.slice(0, 80)}`);
      if (el.type) parts.push(`type="${el.type}"`);
      if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
      if (el.disabled) parts.push("[DISABLED]");
      lines.push(parts.join(" "));
    }
    if (state.interactiveElements.length > 30) {
      lines.push(`  ... and ${state.interactiveElements.length - 30} more`);
    }
  }

  if (state.visibleText) {
    lines.push(`\nVisible Text:\n${state.visibleText}`);
  }

  if (result.links && result.links.length > 0) {
    lines.push(`\nLinks (${result.links.length}):`);
    for (const link of result.links.slice(0, 50)) {
      lines.push(`  [${link.text || "(no text)"}] ${link.href}`);
    }
    if (result.links.length > 50) {
      lines.push(`  ... and ${result.links.length - 50} more`);
    }
  }

  if (result.jsResult !== undefined) {
    lines.push(`\nJavaScript Result:\n${JSON.stringify(result.jsResult, null, 2)}`);
  }

  return lines.join("\n");
}
