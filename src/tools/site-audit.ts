import { z } from "zod";
import { exploreApp } from "./explore-app.js";
import { checkAccessibility } from "./accessibility.js";
import { measurePerformance } from "./performance.js";
import { analyzeSeo } from "./seo.js";
import { classifyPageType } from "../services/page-classifier.js";
import type {
  PageAuditResult,
  SiteAuditReport,
  EnhancedDiscoveredPage,
  EnhancedExploreResult,
} from "../models/types.js";

export const siteAuditSchema = z.object({
  url: z.string().url().describe("Start URL for the site audit"),
  maxPages: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum pages to audit (default 10)"),
  maxDepth: z
    .number()
    .optional()
    .default(2)
    .describe("Maximum crawl depth (default 2)"),
  includeAccessibility: z
    .boolean()
    .optional()
    .default(true)
    .describe("Run accessibility audit on each page"),
  includePerformance: z
    .boolean()
    .optional()
    .default(true)
    .describe("Run performance audit on each page"),
  includeSeo: z
    .boolean()
    .optional()
    .default(true)
    .describe("Run SEO analysis on each page"),
  includeScreenshots: z
    .boolean()
    .optional()
    .default(false)
    .describe("Capture screenshots of each page"),
  sessionId: z
    .string()
    .optional()
    .describe("Use existing session for authenticated auditing"),
});

export type SiteAuditInput = z.infer<typeof siteAuditSchema>;

export async function siteAudit(
  input: SiteAuditInput
): Promise<SiteAuditReport> {
  const startTime = Date.now();

  // Phase 1: Discovery — crawl the site
  const exploreResult = (await exploreApp({
    url: input.url,
    maxDepth: input.maxDepth,
    maxPages: input.maxPages,
    sameOriginOnly: true,
    sessionId: input.sessionId,
    captureScreenshots: input.includeScreenshots,
    classifyPages: true,
    dismissConsentBanners: true,
  })) as EnhancedExploreResult;

  // Phase 2: Per-page audits
  const pageResults: PageAuditResult[] = [];

  for (const discoveredPage of exploreResult.pages) {
    const enhanced = discoveredPage as EnhancedDiscoveredPage;
    const pageUrl = discoveredPage.url;

    const pageResult: PageAuditResult = {
      url: pageUrl,
      title: discoveredPage.title,
      pageType: enhanced.pageType ?? classifyPageType(pageUrl, discoveredPage.title),
      stages: {
        access: {
          success: true,
          loadTimeMs: enhanced.loadTimeMs ?? 0,
        },
        capture: {
          screenshotBase64: enhanced.screenshotBase64,
        },
        extraction: {
          wordCount: enhanced.contentSummary?.wordCount ?? 0,
          imageCount: enhanced.contentSummary?.imageCount ?? 0,
          linkCount: discoveredPage.links.length,
          formCount: discoveredPage.forms.length,
          interactiveElementCount: discoveredPage.interactiveElementCount,
        },
      },
    };

    // Accessibility audit
    if (input.includeAccessibility) {
      try {
        const a11y = await checkAccessibility({ url: pageUrl });
        pageResult.stages.accessibility = a11y;
      } catch (err) {
        pageResult.stages.accessibility = {
          url: pageUrl,
          violations: [],
          passes: 0,
          violationCount: 0,
          criticalCount: 0,
          seriousCount: 0,
        };
      }
    }

    // Performance audit
    if (input.includePerformance) {
      try {
        const perf = await measurePerformance({ url: pageUrl, width: 1280, height: 720 });
        pageResult.stages.performance = perf;
      } catch {
        // Performance audit failed — skip
      }
    }

    // SEO analysis
    if (input.includeSeo) {
      try {
        const seo = await analyzeSeo({ url: pageUrl });
        pageResult.stages.extraction.seo = seo;
      } catch {
        // SEO analysis failed — skip
      }
    }

    pageResults.push(pageResult);
  }

  // Phase 3: Summary aggregation
  const summary = buildSummary(pageResults);

  return {
    targetUrl: input.url,
    pagesAudited: pageResults.length,
    totalDurationMs: Date.now() - startTime,
    pages: pageResults,
    summary,
  };
}

function buildSummary(pages: PageAuditResult[]): SiteAuditReport["summary"] {
  let totalViolations = 0;
  let criticalViolations = 0;
  let totalLoadTime = 0;
  let slowestPage = { url: "", loadTimeMs: 0 };
  const seoIssues: string[] = [];
  const pageTypeDistribution: Record<string, number> = {};

  for (const page of pages) {
    // Accessibility
    if (page.stages.accessibility) {
      totalViolations += page.stages.accessibility.violationCount;
      criticalViolations += page.stages.accessibility.criticalCount;
    }

    // Load time
    totalLoadTime += page.stages.access.loadTimeMs;
    if (page.stages.access.loadTimeMs > slowestPage.loadTimeMs) {
      slowestPage = {
        url: page.url,
        loadTimeMs: page.stages.access.loadTimeMs,
      };
    }

    // SEO issues
    const seo = page.stages.extraction.seo;
    if (seo) {
      if (!seo.title) seoIssues.push(`${page.url}: missing title`);
      if (!seo.metaDescription)
        seoIssues.push(`${page.url}: missing meta description`);
      if (seo.h1Tags.length === 0)
        seoIssues.push(`${page.url}: missing h1`);
      if (seo.h1Tags.length > 1)
        seoIssues.push(`${page.url}: multiple h1 tags (${seo.h1Tags.length})`);
      if (seo.imagesWithoutAlt > 0)
        seoIssues.push(
          `${page.url}: ${seo.imagesWithoutAlt} images without alt text`
        );
    }

    // Page types
    const pt = page.pageType || "unknown";
    pageTypeDistribution[pt] = (pageTypeDistribution[pt] ?? 0) + 1;
  }

  return {
    totalAccessibilityViolations: totalViolations,
    criticalViolations,
    averageLoadTimeMs:
      pages.length > 0 ? Math.round(totalLoadTime / pages.length) : 0,
    slowestPage,
    brokenLinks: 0, // Would need link-checker integration for this
    seoIssues,
    pageTypeDistribution,
  };
}

export function formatSiteAuditReport(report: SiteAuditReport): string {
  const lines: string[] = [];

  lines.push("╔══════════════════════════════════════════╗");
  lines.push(`║  Site Audit Report`);
  lines.push("╚══════════════════════════════════════════╝");
  lines.push("");
  lines.push(`Target: ${report.targetUrl}`);
  lines.push(`Pages audited: ${report.pagesAudited}`);
  lines.push(
    `Duration: ${(report.totalDurationMs / 1000).toFixed(1)}s`
  );
  lines.push("");

  // Executive Summary
  lines.push("--- Executive Summary ---");
  lines.push("");
  lines.push(
    `Accessibility violations: ${report.summary.totalAccessibilityViolations} (${report.summary.criticalViolations} critical)`
  );
  lines.push(
    `Average load time: ${report.summary.averageLoadTimeMs}ms`
  );

  if (report.summary.slowestPage.url) {
    lines.push(
      `Slowest page: ${report.summary.slowestPage.url} (${report.summary.slowestPage.loadTimeMs}ms)`
    );
  }

  if (report.summary.seoIssues.length > 0) {
    lines.push(`SEO issues: ${report.summary.seoIssues.length}`);
  }

  const types = Object.entries(report.summary.pageTypeDistribution)
    .map(([type, count]) => `${type}(${count})`)
    .join(", ");
  if (types) {
    lines.push(`Page types: ${types}`);
  }

  lines.push("");

  // Per-page breakdown
  lines.push("--- Per-Page Results ---");
  lines.push("");

  for (const page of report.pages) {
    const typeTag =
      page.pageType !== "unknown" ? ` [${page.pageType}]` : "";
    lines.push(`${page.title || "(no title)"}${typeTag}`);
    lines.push(`  URL: ${page.url}`);
    lines.push(`  Load: ${page.stages.access.loadTimeMs}ms`);
    lines.push(
      `  Content: ${page.stages.extraction.wordCount} words, ${page.stages.extraction.imageCount} images, ${page.stages.extraction.linkCount} links`
    );

    if (page.stages.accessibility) {
      const a11y = page.stages.accessibility;
      if (a11y.violationCount > 0) {
        lines.push(
          `  Accessibility: ${a11y.violationCount} violations (${a11y.criticalCount} critical, ${a11y.seriousCount} serious)`
        );
      } else {
        lines.push(`  Accessibility: passed`);
      }
    }

    if (page.stages.performance) {
      const perf = page.stages.performance;
      lines.push(
        `  Performance: LCP=${perf.largestContentfulPaint ?? "n/a"}ms, ${perf.totalRequests} requests, ${perf.failedRequests} failed`
      );
    }

    if (page.stages.extraction.seo) {
      const seo = page.stages.extraction.seo;
      const issues: string[] = [];
      if (!seo.title) issues.push("no title");
      if (!seo.metaDescription) issues.push("no meta desc");
      if (seo.h1Tags.length === 0) issues.push("no h1");
      if (seo.imagesWithoutAlt > 0)
        issues.push(`${seo.imagesWithoutAlt} img no alt`);

      lines.push(
        `  SEO: ${issues.length === 0 ? "good" : issues.join(", ")}`
      );
    }

    lines.push("");
  }

  // Top SEO issues
  if (report.summary.seoIssues.length > 0) {
    lines.push("--- SEO Issues ---");
    lines.push("");
    for (const issue of report.summary.seoIssues.slice(0, 20)) {
      lines.push(`  - ${issue}`);
    }
    if (report.summary.seoIssues.length > 20) {
      lines.push(
        `  ... and ${report.summary.seoIssues.length - 20} more`
      );
    }
  }

  return lines.join("\n");
}
