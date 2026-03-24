import { z } from "zod";
import { createPage } from "../services/browser-manager.js";
import type {
  PerformanceMetrics,
  ConsoleEntry,
  NetworkRequest,
} from "../models/types.js";

export const performanceSchema = z.object({
  url: z.string().url().describe("The URL to measure performance for"),
  width: z.number().optional().default(1280).describe("Viewport width"),
  height: z.number().optional().default(720).describe("Viewport height"),
});

export type PerformanceInput = z.infer<typeof performanceSchema>;

export async function measurePerformance(
  input: PerformanceInput
): Promise<PerformanceMetrics> {
  const { context, page } = await createPage({
    width: input.width,
    height: input.height,
  });

  const consoleEntries: ConsoleEntry[] = [];
  const networkRequests: NetworkRequest[] = [];
  const requestTimings = new Map<string, number>();

  try {
    // Collect console messages
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") {
        consoleEntries.push({
          type,
          text: msg.text(),
          location: msg.location()
            ? `${msg.location().url}:${msg.location().lineNumber}`
            : undefined,
        });
      }
    });

    // Collect network requests
    page.on("request", (request) => {
      requestTimings.set(request.url(), Date.now());
    });

    page.on("response", async (response) => {
      const request = response.request();
      const startTime = requestTimings.get(request.url()) ?? Date.now();
      const duration = Date.now() - startTime;

      let size = 0;
      try {
        const headers = response.headers();
        size = parseInt(headers["content-length"] || "0", 10);
      } catch {
        // ignore
      }

      networkRequests.push({
        url: request.url(),
        method: request.method(),
        status: response.status(),
        duration,
        size,
        resourceType: request.resourceType(),
        failed: false,
      });
    });

    page.on("requestfailed", (request) => {
      const startTime = requestTimings.get(request.url()) ?? Date.now();
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        status: 0,
        duration: Date.now() - startTime,
        size: 0,
        resourceType: request.resourceType(),
        failed: true,
        failureText: request.failure()?.errorText,
      });
    });

    // Navigate and measure
    const startTime = Date.now();
    await page.goto(input.url, { waitUntil: "networkidle", timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Get performance timing from the browser
    const timing = await page.evaluate(() => {
      const perf = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType("paint");
      const firstPaint = paintEntries.find(
        (e) => e.name === "first-paint"
      )?.startTime;

      // LCP via PerformanceObserver is async; try to get it from existing entries
      const lcpEntries = performance.getEntriesByType(
        "largest-contentful-paint"
      );
      const lcp =
        lcpEntries.length > 0
          ? lcpEntries[lcpEntries.length - 1].startTime
          : undefined;

      return {
        domContentLoaded: perf
          ? perf.domContentLoadedEventEnd - perf.startTime
          : 0,
        firstPaint: firstPaint ?? undefined,
        largestContentfulPaint: lcp,
      };
    });

    return {
      url: page.url(),
      loadTime,
      domContentLoaded: Math.round(timing.domContentLoaded),
      firstPaint: timing.firstPaint
        ? Math.round(timing.firstPaint)
        : undefined,
      largestContentfulPaint: timing.largestContentfulPaint
        ? Math.round(timing.largestContentfulPaint)
        : undefined,
      totalRequests: networkRequests.length,
      failedRequests: networkRequests.filter((r) => r.failed).length,
      totalTransferSize: networkRequests.reduce((sum, r) => sum + r.size, 0),
      consoleErrors: consoleEntries.filter((e) => e.type === "error"),
      consoleWarnings: consoleEntries.filter((e) => e.type === "warning"),
      networkRequests,
    };
  } finally {
    await context.close();
  }
}
