import { BrowserContext, Page } from "playwright";
import { createContext } from "./browser-manager.js";
import type { SessionData, SessionInfo, ConsoleEntry } from "../models/types.js";
import { clearFeedback } from "./feedback-collector.js";
import { clearPersonaTest } from "./persona-manager.js";

const sessions = new Map<string, SessionData>();
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 60 seconds
const MAX_CONSOLE_ERRORS = 100;

function startCleanupTimer(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastAccessedAt > SESSION_TIMEOUT_MS) {
        await endSession(id).catch(() => {});
      }
    }
    if (sessions.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, CLEANUP_INTERVAL_MS);
}

export async function createSession(options?: {
  url?: string;
  width?: number;
  height?: number;
  deviceName?: string;
}): Promise<SessionData> {
  const context = await createContext({
    width: options?.width,
    height: options?.height,
    deviceName: options?.deviceName,
  });

  const page = await context.newPage();

  const id = crypto.randomUUID();
  const now = Date.now();

  const session: SessionData = {
    id,
    context,
    page,
    createdAt: now,
    lastAccessedAt: now,
    url: "",
    consoleErrors: [],
    dialogMessages: [],
    deviceName: options?.deviceName,
    width: options?.width ?? 1280,
    height: options?.height ?? 720,
  };

  // Collect console errors
  page.on("console", (msg) => {
    if (msg.type() === "error" && session.consoleErrors.length < MAX_CONSOLE_ERRORS) {
      session.consoleErrors.push({
        type: "error",
        text: msg.text(),
        location: msg.location()?.url,
      });
    }
  });

  // Auto-dismiss dialogs and record their messages
  page.on("dialog", async (dialog) => {
    session.dialogMessages.push(dialog.message());
    await dialog.accept().catch(() => {});
  });

  // Navigate to initial URL if provided
  if (options?.url) {
    await page.goto(options.url, { waitUntil: "networkidle", timeout: 30000 });
    session.url = page.url();
  }

  sessions.set(id, session);
  startCleanupTimer();

  return session;
}

export function getSession(sessionId: string): SessionData {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}. It may have expired or been closed.`);
  }
  session.lastAccessedAt = Date.now();
  session.url = session.page.url();
  return session;
}

export async function endSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Clean up associated data
  clearFeedback(sessionId);
  clearPersonaTest(sessionId);

  sessions.delete(sessionId);
  await session.context.close().catch(() => {});

  if (sessions.size === 0 && cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export async function endAllSessions(): Promise<void> {
  const ids = [...sessions.keys()];
  for (const id of ids) {
    await endSession(id);
  }
}

export function listSessions(): SessionInfo[] {
  return [...sessions.values()].map((s) => ({
    id: s.id,
    url: s.url,
    title: "",
    createdAt: s.createdAt,
    lastAccessedAt: s.lastAccessedAt,
    deviceName: s.deviceName,
    width: s.width,
    height: s.height,
  }));
}

export function clearSessionErrors(session: SessionData): ConsoleEntry[] {
  const errors = [...session.consoleErrors];
  session.consoleErrors = [];
  return errors;
}

export function clearSessionDialogs(session: SessionData): string[] {
  const messages = [...session.dialogMessages];
  session.dialogMessages = [];
  return messages;
}
