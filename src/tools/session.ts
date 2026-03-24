import { z } from "zod";
import {
  createSession,
  endSession,
  getSession,
} from "../services/session-manager.js";
import { extractPageState } from "../services/page-state-extractor.js";
import type { SessionInfo, PageState } from "../models/types.js";

export const sessionSchema = z.object({
  action: z
    .enum(["start", "end"])
    .describe('"start" to open a new browser session, "end" to close one'),
  // For start:
  url: z
    .string()
    .url()
    .optional()
    .describe("Initial URL to navigate to (for start)"),
  width: z
    .number()
    .optional()
    .default(1280)
    .describe("Viewport width in pixels (for start)"),
  height: z
    .number()
    .optional()
    .default(720)
    .describe("Viewport height in pixels (for start)"),
  deviceName: z
    .string()
    .optional()
    .describe(
      'Device to emulate, e.g. "iPhone 14", "iPad Pro 11" (for start)'
    ),
  // For end:
  sessionId: z
    .string()
    .optional()
    .describe("Session ID to close (for end)"),
});

export type SessionInput = z.infer<typeof sessionSchema>;

export interface SessionResult {
  message: string;
  session?: SessionInfo;
  pageState?: PageState;
}

export async function handleSession(
  input: SessionInput
): Promise<SessionResult> {
  if (input.action === "start") {
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
      message: `Session started: ${session.id}`,
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

  // action === "end"
  if (!input.sessionId) {
    throw new Error("sessionId is required to end a session");
  }
  getSession(input.sessionId);
  await endSession(input.sessionId);
  return { message: `Session ${input.sessionId} closed successfully.` };
}
