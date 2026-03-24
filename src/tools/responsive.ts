import { z } from "zod";
import { createPage, navigateAndWait } from "../services/browser-manager.js";
import type { VisualDiffResult } from "../models/types.js";

export const responsiveSchema = z.object({
  url: z.string().url().describe("The URL to test responsive layouts for"),
  viewports: z
    .array(
      z.object({
        name: z.string().describe("Name for this viewport, e.g. 'Mobile'"),
        width: z.number().describe("Viewport width in pixels"),
        height: z.number().describe("Viewport height in pixels"),
      })
    )
    .optional()
    .describe("Custom viewports to test. Defaults to Mobile/Tablet/Desktop."),
  fullPage: z
    .boolean()
    .optional()
    .default(false)
    .describe("Capture full page screenshots"),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before capturing"),
});

export type ResponsiveInput = z.infer<typeof responsiveSchema>;

const DEFAULT_VIEWPORTS = [
  { name: "Mobile (375px)", width: 375, height: 812 },
  { name: "Tablet (768px)", width: 768, height: 1024 },
  { name: "Desktop (1280px)", width: 1280, height: 720 },
  { name: "Wide (1920px)", width: 1920, height: 1080 },
];

export async function testResponsive(
  input: ResponsiveInput
): Promise<VisualDiffResult> {
  const viewports = input.viewports ?? DEFAULT_VIEWPORTS;
  const results: VisualDiffResult["viewports"] = [];

  for (const viewport of viewports) {
    const { context, page } = await createPage({
      width: viewport.width,
      height: viewport.height,
    });

    try {
      await navigateAndWait(page, input.url, {
        waitForSelector: input.waitForSelector,
      });

      const screenshot = await page.screenshot({
        fullPage: input.fullPage,
        type: "png",
      });

      results.push({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        screenshot: screenshot.toString("base64"),
      });
    } finally {
      await context.close();
    }
  }

  return {
    url: input.url,
    viewports: results,
  };
}
