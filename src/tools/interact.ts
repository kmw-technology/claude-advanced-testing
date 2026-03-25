import { z } from "zod";
import {
  getSession,
  clearSessionErrors,
  clearSessionDialogs,
} from "../services/session-manager.js";
import { locatorStrategySchema } from "../services/element-locator.js";
import { executeAction } from "../services/action-executor.js";
import { extractPageState } from "../services/page-state-extractor.js";
import type { InteractResult } from "../models/types.js";

export const interactSchema = z.object({
  sessionId: z.string().describe("Active session ID from start_session"),
  action: z
    .enum([
      "click",
      "fill",
      "select",
      "check",
      "uncheck",
      "hover",
      "press_key",
      "scroll",
      "navigate",
      "go_back",
      "go_forward",
      "wait",
      "submit",
      "send_audio",
    ])
    .describe("The interaction action to perform"),
  target: locatorStrategySchema
    .optional()
    .describe(
      "Element to target. Use text, role, placeholder, label, testId, or CSS selector. Required for click, fill, select, check, uncheck, hover."
    ),
  value: z
    .string()
    .optional()
    .describe(
      'Value for the action: text to type (fill), option to select, URL (navigate), key name (press_key), scroll direction (up/down/left/right), ms/selector (wait), or JSON config for send_audio: {"ttsText":"Create a new appointment for Monday","ttsVoice":"en-US-AriaNeural","stopTarget":{"text":"Stop"},"waitForSelector":".result"}. Recording duration auto-adapts to TTS speech length.'
    ),
  screenshot: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include a screenshot after the action"),
  timeout: z
    .number()
    .optional()
    .default(5000)
    .describe("Timeout in ms for the action"),
});

export type InteractInput = z.infer<typeof interactSchema>;

export async function interact(input: InteractInput): Promise<InteractResult> {
  const session = getSession(input.sessionId);
  const page = session.page;

  // Clear previous errors/dialogs for this action
  clearSessionErrors(session);
  clearSessionDialogs(session);

  const startTime = Date.now();

  const actionResult = await executeAction(
    page,
    input.action,
    input.target,
    input.value,
    input.timeout
  );

  // Collect errors and dialogs that occurred during the action
  const consoleErrors = clearSessionErrors(session);
  const dialogMessages = clearSessionDialogs(session);

  const pageState = await extractPageState(page, {
    includeScreenshot: input.screenshot,
    includeVisibleText: true,
    consoleErrors,
  });

  // Add dialog messages to notifications
  for (const msg of dialogMessages) {
    pageState.notifications.unshift(`[Dialog] ${msg}`);
  }

  const duration = Date.now() - startTime;

  return {
    success: actionResult.success,
    action: input.action,
    pageState,
    error: actionResult.error,
    dialogMessage: dialogMessages[0],
    duration,
    ...(actionResult.audioCachePath && { audioCachePath: actionResult.audioCachePath }),
  };
}

export function formatInteractResult(result: InteractResult): string {
  let text = result.success
    ? `Action "${result.action}" succeeded`
    : `Action "${result.action}" FAILED: ${result.error}`;
  text += ` (${result.duration}ms)\n`;
  text += `URL: ${result.pageState.url}\n`;
  text += `Title: ${result.pageState.title}\n`;

  if (result.audioCachePath) {
    text += `\nAudio cached: ${result.audioCachePath}\n`;
  }

  if (result.dialogMessage) {
    text += `\nDialog: ${result.dialogMessage}\n`;
  }

  if (result.pageState.notifications.length > 0) {
    text += `\nNotifications:\n`;
    for (const n of result.pageState.notifications) {
      text += `  - ${n}\n`;
    }
  }

  if (result.pageState.consoleErrors.length > 0) {
    text += `\nConsole Errors:\n`;
    for (const e of result.pageState.consoleErrors.slice(0, 5)) {
      text += `  - ${e.text}\n`;
    }
  }

  if (result.pageState.forms.length > 0) {
    text += `\nForms (${result.pageState.forms.length}):\n`;
    for (const form of result.pageState.forms) {
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
        text += parts.join(" ") + "\n";
      }
    }
  }

  const elements = result.pageState.interactiveElements;
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

  if (result.pageState.visibleText) {
    text += `\nVisible Text:\n${result.pageState.visibleText}\n`;
  }

  return text;
}
