import { z } from "zod";
import { createContext } from "../services/browser-manager.js";
import {
  getSession,
  clearSessionErrors,
} from "../services/session-manager.js";
import { extractPageState } from "../services/page-state-extractor.js";
import {
  classifyPageType,
  detectConsentBanner,
  dismissConsentBanner,
} from "../services/page-classifier.js";
import { ScreenshotDeduplicator } from "../services/screenshot-dedup.js";
import { waitForSpaSettlement } from "../services/spa-wait.js";
import type {
  ExploreResult,
  DiscoveredPage,
  EnhancedDiscoveredPage,
  EnhancedExploreResult,
} from "../models/types.js";

export const exploreAppSchema = z.object({
  url: z.string().url().describe("Start URL for app discovery"),
  maxDepth: z
    .number()
    .optional()
    .default(3)
    .describe("Maximum link depth to follow from start URL"),
  maxPages: z
    .number()
    .optional()
    .default(20)
    .describe("Maximum number of pages to visit"),
  sameOriginOnly: z
    .boolean()
    .optional()
    .default(true)
    .describe("Only follow same-origin links"),
  sessionId: z
    .string()
    .optional()
    .describe(
      "Use an existing session to preserve auth state (cookies). If omitted, creates a temporary browser context."
    ),
  captureScreenshots: z
    .boolean()
    .optional()
    .default(false)
    .describe("Capture a screenshot at each discovered page"),
  dismissConsentBanners: z
    .boolean()
    .optional()
    .default(true)
    .describe("Auto-detect and dismiss cookie consent banners"),
  classifyPages: z
    .boolean()
    .optional()
    .default(true)
    .describe("Classify each page by type (homepage, pricing, blog, etc.)"),
  pathScope: z
    .string()
    .optional()
    .describe(
      "URL path prefix to restrict crawling, e.g. '/docs'. Only links under this path are followed."
    ),
});

export type ExploreAppInput = z.infer<typeof exploreAppSchema>;

export async function exploreApp(
  input: ExploreAppInput
): Promise<ExploreResult | EnhancedExploreResult> {
  const startOrigin = new URL(input.url).origin;
  const visited = new Set<string>();
  const pages: (DiscoveredPage | EnhancedDiscoveredPage)[] = [];
  const errors: { url: string; error: string }[] = [];
  const queue: { url: string; depth: number }[] = [
    { url: input.url, depth: 0 },
  ];

  const isEnhanced =
    input.captureScreenshots || input.classifyPages || input.pathScope;
  const dedup = new ScreenshotDeduplicator();
  let duplicateScreenshots = 0;
  const startTime = Date.now();
  let consentHandled = false;

  // Get a page to work with
  let page: import("playwright").Page;
  let tempContext: import("playwright").BrowserContext | null = null;

  if (input.sessionId) {
    const session = getSession(input.sessionId);
    page = await session.context.newPage();
  } else {
    tempContext = await createContext();
    page = await tempContext.newPage();
  }

  try {
    while (queue.length > 0 && pages.length < input.maxPages) {
      const item = queue.shift()!;

      const normalizedUrl = normalizeUrl(item.url);
      if (visited.has(normalizedUrl)) continue;
      visited.add(normalizedUrl);

      // Path scope check
      if (input.pathScope) {
        try {
          const linkPath = new URL(item.url).pathname;
          if (!linkPath.startsWith(input.pathScope)) continue;
        } catch {
          continue;
        }
      }

      try {
        const pageLoadStart = Date.now();
        await page.goto(item.url, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        await waitForSpaSettlement(page, {
          minWait: 100,
          maxWait: 1500,
          quietPeriod: 300,
          networkQuiet: false,
        });
        const loadTimeMs = Date.now() - pageLoadStart;

        // Consent banner handling (first page only)
        let consentBannerFound = false;
        let consentBannerDismissed = false;

        if (input.dismissConsentBanners && !consentHandled) {
          const banner = await detectConsentBanner(page);
          if (banner) {
            consentBannerFound = true;
            consentBannerDismissed = await dismissConsentBanner(page, banner);
          }
          consentHandled = true;
        }

        const consoleErrors = input.sessionId
          ? clearSessionErrors(getSession(input.sessionId))
          : [];

        const pageState = await extractPageState(page, {
          consoleErrors,
          maxElements: 30,
        });

        // Extract links
        const links = await page.$$eval("a[href]", (anchors) =>
          anchors
            .map((a) => a.getAttribute("href") || "")
            .filter(
              (href) =>
                href &&
                !href.startsWith("#") &&
                !href.startsWith("javascript:")
            )
        );

        const resolvedLinks: string[] = [];
        for (const href of links) {
          try {
            const resolved = new URL(href, page.url()).href;
            resolvedLinks.push(resolved);
          } catch {
            // Invalid URL, skip
          }
        }

        const uniqueLinks = [...new Set(resolvedLinks)];

        if (isEnhanced) {
          // Page classification
          const pageType = input.classifyPages
            ? classifyPageType(page.url(), pageState.title)
            : "unknown";

          // Screenshot with deduplication
          let screenshotBase64: string | undefined;
          let screenshotHash: string | undefined;
          let isScreenshotDuplicate = false;

          if (input.captureScreenshots) {
            try {
              const buffer = await page.screenshot({ type: "png" });
              const base64 = buffer.toString("base64");
              const trackResult = dedup.track(base64);
              screenshotHash = trackResult.hash;
              isScreenshotDuplicate = trackResult.isDuplicate;

              if (!isScreenshotDuplicate) {
                screenshotBase64 = base64;
              } else {
                duplicateScreenshots++;
              }
            } catch {
              // Screenshot failed
            }
          }

          // Content summary
          const contentSummary = await page.evaluate(() => {
            const text = document.body?.innerText ?? "";
            const images = document.querySelectorAll("img");
            const main =
              document.querySelector("main") ||
              document.querySelector('[role="main"]') ||
              document.querySelector("article");
            return {
              wordCount: text
                .split(/\s+/)
                .filter((w) => w.length > 0).length,
              imageCount: images.length,
              hasMainContent: main !== null,
            };
          });

          const enhancedPage: EnhancedDiscoveredPage = {
            url: page.url(),
            title: pageState.title,
            links: uniqueLinks,
            forms: pageState.forms,
            interactiveElementCount: pageState.interactiveElements.length,
            depth: item.depth,
            pageType,
            screenshotBase64,
            screenshotHash,
            isScreenshotDuplicate,
            consentBannerFound,
            consentBannerDismissed,
            loadTimeMs,
            contentSummary,
          };

          pages.push(enhancedPage);
        } else {
          pages.push({
            url: page.url(),
            title: pageState.title,
            links: uniqueLinks,
            forms: pageState.forms,
            interactiveElementCount: pageState.interactiveElements.length,
            depth: item.depth,
          });
        }

        // Enqueue new links
        if (item.depth < input.maxDepth) {
          for (const link of uniqueLinks) {
            const linkNormalized = normalizeUrl(link);
            if (visited.has(linkNormalized)) continue;

            if (input.sameOriginOnly) {
              try {
                if (new URL(link).origin !== startOrigin) continue;
              } catch {
                continue;
              }
            }

            if (input.pathScope) {
              try {
                if (!new URL(link).pathname.startsWith(input.pathScope))
                  continue;
              } catch {
                continue;
              }
            }

            queue.push({ url: link, depth: item.depth + 1 });
          }
        }
      } catch (err) {
        errors.push({
          url: item.url,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    if (input.sessionId) {
      await page.close().catch(() => {});
    } else if (tempContext) {
      await tempContext.close().catch(() => {});
    }
  }

  if (isEnhanced) {
    // Build page type distribution
    const pageTypeDistribution: Record<string, number> = {};
    for (const p of pages as EnhancedDiscoveredPage[]) {
      const pt = p.pageType ?? "unknown";
      pageTypeDistribution[pt] = (pageTypeDistribution[pt] ?? 0) + 1;
    }

    return {
      startUrl: input.url,
      pagesDiscovered: pages.length,
      pages: pages as EnhancedDiscoveredPage[],
      errors,
      uniqueScreenshots: dedup.uniqueCount,
      duplicateScreenshots,
      pageTypeDistribution,
      totalDurationMs: Date.now() - startTime,
    } satisfies EnhancedExploreResult;
  }

  return {
    startUrl: input.url,
    pagesDiscovered: pages.length,
    pages,
    errors,
  } satisfies ExploreResult;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;
    return parsed.href;
  } catch {
    return url;
  }
}

export function formatExploreResult(
  result: ExploreResult | EnhancedExploreResult
): string {
  const lines: string[] = [];
  lines.push(`App Discovery: ${result.startUrl}`);
  lines.push(`Pages discovered: ${result.pagesDiscovered}`);

  if (result.errors.length > 0) {
    lines.push(`Errors: ${result.errors.length}`);
  }

  // Enhanced info
  if ("totalDurationMs" in result) {
    const enhanced = result as EnhancedExploreResult;
    lines.push(`Duration: ${(enhanced.totalDurationMs / 1000).toFixed(1)}s`);

    if (enhanced.uniqueScreenshots > 0) {
      lines.push(
        `Screenshots: ${enhanced.uniqueScreenshots} unique, ${enhanced.duplicateScreenshots} duplicates`
      );
    }

    const types = Object.entries(enhanced.pageTypeDistribution)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}(${count})`)
      .join(", ");
    if (types) {
      lines.push(`Page types: ${types}`);
    }
  }

  lines.push("", "--- Sitemap ---", "");

  for (const p of result.pages) {
    const indent = "  ".repeat(p.depth);
    const enhanced = p as EnhancedDiscoveredPage;
    const typeTag =
      enhanced.pageType && enhanced.pageType !== "unknown"
        ? ` [${enhanced.pageType}]`
        : "";

    lines.push(`${indent}${p.title || "(no title)"}${typeTag}`);
    lines.push(`${indent}  URL: ${p.url}`);
    lines.push(
      `${indent}  Links: ${p.links.length} | Forms: ${p.forms.length} | Interactive: ${p.interactiveElementCount}`
    );

    if (enhanced.loadTimeMs) {
      lines.push(`${indent}  Load: ${enhanced.loadTimeMs}ms`);
    }

    if (enhanced.contentSummary) {
      lines.push(
        `${indent}  Content: ${enhanced.contentSummary.wordCount} words, ${enhanced.contentSummary.imageCount} images${enhanced.contentSummary.hasMainContent ? ", has <main>" : ""}`
      );
    }

    if (enhanced.consentBannerFound) {
      lines.push(
        `${indent}  Consent banner: ${enhanced.consentBannerDismissed ? "dismissed" : "found but not dismissed"}`
      );
    }

    if (p.forms.length > 0) {
      for (const form of p.forms) {
        lines.push(
          `${indent}  Form [${form.method}] ${form.action || "(no action)"} — ${form.fields.length} fields${form.submitButton ? ` — "${form.submitButton}"` : ""}`
        );
      }
    }
    lines.push("");
  }

  if (result.errors.length > 0) {
    lines.push("--- Errors ---", "");
    for (const err of result.errors) {
      lines.push(`  ${err.url}: ${err.error}`);
    }
  }

  return lines.join("\n");
}
