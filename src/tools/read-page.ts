import { z } from "zod";
import { getSession, clearSessionErrors } from "../services/session-manager.js";
import { extractPageState } from "../services/page-state-extractor.js";
import type { PageState } from "../models/types.js";

export const readPageSchema = z.object({
  sessionId: z.string().describe("Active session ID from start_session"),
  selector: z
    .string()
    .optional()
    .describe(
      "CSS selector to scope reading to a specific area of the page"
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
    .describe("Include all visible text content (truncated to 2000 chars)"),
});

export type ReadPageInput = z.infer<typeof readPageSchema>;

export async function readPage(input: ReadPageInput): Promise<PageState> {
  const session = getSession(input.sessionId);
  const page = session.page;

  const consoleErrors = clearSessionErrors(session);

  const pageState = await extractPageState(page, {
    includeScreenshot: input.includeScreenshot,
    includeVisibleText: input.includeVisibleText,
    consoleErrors,
  });

  // If a selector is provided, extract scoped text
  if (input.selector) {
    try {
      const scopedText = await page.$$eval(input.selector, (elements) =>
        elements.map((el) => (el.textContent || "").trim()).join("\n\n")
      );
      pageState.visibleText = scopedText.length > 2000
        ? scopedText.slice(0, 2000) + "…"
        : scopedText;
    } catch {
      // Selector might not match — keep full page text
    }
  }

  return pageState;
}

export function formatReadPageResult(state: PageState): string {
  let text = `Page: ${state.title}\n`;
  text += `URL: ${state.url}\n`;

  if (state.notifications.length > 0) {
    text += `\nNotifications:\n`;
    for (const n of state.notifications) {
      text += `  - ${n}\n`;
    }
  }

  if (state.consoleErrors.length > 0) {
    text += `\nConsole Errors:\n`;
    for (const e of state.consoleErrors.slice(0, 5)) {
      text += `  - ${e.text}\n`;
    }
  }

  if (state.forms.length > 0) {
    text += `\nForms (${state.forms.length}):\n`;
    for (const form of state.forms) {
      text += `  [${form.method}] ${form.action || "(no action)"} — ${form.fields.length} fields`;
      if (form.submitButton) text += ` — Submit: "${form.submitButton}"`;
      text += "\n";
      for (const field of form.fields) {
        const parts = [`    <${field.tag}>`];
        if (field.type) parts.push(`type="${field.type}"`);
        if (field.label) parts.push(`label="${field.label}"`);
        if (field.name) parts.push(`name="${field.name}"`);
        if (field.placeholder) parts.push(`placeholder="${field.placeholder}"`);
        if (field.value) parts.push(`value="${field.value}"`);
        if (field.required) parts.push("[REQUIRED]");
        if (field.options) parts.push(`options=[${field.options.join(", ")}]`);
        text += parts.join(" ") + "\n";
      }
    }
  }

  const elements = state.interactiveElements;
  if (elements.length > 0) {
    text += `\nInteractive Elements (${elements.length}):\n`;
    for (const el of elements.slice(0, 30)) {
      const parts = [`  [${el.tag}]`];
      if (el.role) parts.push(`role="${el.role}"`);
      if (el.text) parts.push(`"${el.text}"`);
      if (el.href) parts.push(`→ ${el.href.slice(0, 80)}`);
      if (el.type) parts.push(`type="${el.type}"`);
      if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
      if (el.disabled) parts.push("[DISABLED]");
      text += parts.join(" ") + "\n";
    }
    if (elements.length > 30) {
      text += `  ... and ${elements.length - 30} more\n`;
    }
  }

  if (state.visibleText) {
    text += `\nVisible Text:\n${state.visibleText}\n`;
  }

  return text;
}
