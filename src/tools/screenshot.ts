import { z } from "zod";
import { createPage, navigateAndWait } from "../services/browser-manager.js";
import type { ScreenshotResult } from "../models/types.js";

export const screenshotSchema = z.object({
  url: z.string().url().describe("The URL to screenshot"),
  fullPage: z
    .boolean()
    .optional()
    .default(false)
    .describe("Capture full scrollable page instead of just viewport"),
  width: z.number().optional().default(1280).describe("Viewport width in pixels"),
  height: z.number().optional().default(720).describe("Viewport height in pixels"),
  deviceName: z
    .string()
    .optional()
    .describe(
      'Emulate a device, e.g. "iPhone 14", "iPad Pro 11", "Pixel 7". Overrides width/height.'
    ),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before taking screenshot"),
  waitForTimeout: z
    .number()
    .optional()
    .describe("Additional milliseconds to wait before screenshot"),
});

export type ScreenshotInput = z.infer<typeof screenshotSchema>;

export async function takeScreenshot(input: ScreenshotInput): Promise<ScreenshotResult> {
  const { context, page } = await createPage({
    width: input.width,
    height: input.height,
    deviceName: input.deviceName,
  });

  try {
    await navigateAndWait(page, input.url, {
      waitForSelector: input.waitForSelector,
      waitForTimeout: input.waitForTimeout,
    });

    const screenshot = await page.screenshot({
      fullPage: input.fullPage,
      type: "png",
    });

    const viewport = page.viewportSize()!;
    const title = await page.title();

    return {
      base64: screenshot.toString("base64"),
      mimeType: "image/png",
      width: viewport.width,
      height: viewport.height,
      url: page.url(),
      title,
    };
  } finally {
    await context.close();
  }
}
