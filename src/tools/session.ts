import { z } from "zod";
import {
  createSession,
  endSession,
  getSession,
} from "../services/session-manager.js";
import { extractPageState } from "../services/page-state-extractor.js";
import type { SessionInfo, PageState } from "../models/types.js";

// --- start_session ---

export const startSessionSchema = z.object({
  url: z
    .string()
    .url()
    .optional()
    .describe("Initial URL to navigate to after session creation"),
  width: z
    .number()
    .optional()
    .default(1280)
    .describe("Viewport width in pixels"),
  height: z
    .number()
    .optional()
    .default(720)
    .describe("Viewport height in pixels"),
  deviceName: z
    .string()
    .optional()
    .describe(
      'Device to emulate, e.g. "iPhone 14", "iPad Pro 11". Overrides width/height.'
    ),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;

export interface StartSessionResult {
  session: SessionInfo;
  pageState?: PageState;
}

export async function startSessionHandler(
  input: StartSessionInput
): Promise<StartSessionResult> {
  const session = await createSession({
    url: input.url,
    width: input.width,
    height: input.height,
    deviceName: input.deviceName,
  });

  let pageState: PageState | undefined;
  if (input.url) {
    pageState = await extractPageState(session.page, {
      includeScreenshot: true,
      includeVisibleText: true,
      consoleErrors: session.consoleErrors,
    });
  }

  const title = input.url ? await session.page.title() : "";

  return {
    session: {
      id: session.id,
      url: session.url,
      title,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      deviceName: session.deviceName,
      width: session.width,
      height: session.height,
    },
    pageState,
  };
}

// --- end_session ---

export const endSessionSchema = z.object({
  sessionId: z.string().describe("The session ID to close"),
});

export type EndSessionInput = z.infer<typeof endSessionSchema>;

export async function endSessionHandler(
  input: EndSessionInput
): Promise<string> {
  // Verify session exists before ending
  getSession(input.sessionId);
  await endSession(input.sessionId);
  return `Session ${input.sessionId} closed successfully.`;
}
