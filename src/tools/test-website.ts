import { z } from "zod";
import { takeScreenshot } from "./screenshot.js";
import { checkAccessibility } from "./accessibility.js";
import { measurePerformance } from "./performance.js";
import { checkLinks } from "./link-checker.js";
import { testResponsive } from "./responsive.js";
import { analyzeSeo } from "./seo.js";
import { analyzeForms } from "./form-tester.js";
import { siteAudit, formatSiteAuditReport } from "./site-audit.js";

const checkTypes = [
  "screenshot",
  "accessibility",
  "performance",
  "links",
  "responsive",
  "seo",
  "forms",
] as const;

export const testWebsiteSchema = z.object({
  url: z.string().url().describe("URL to test"),
  checks: z
    .array(z.enum(checkTypes))
    .describe(
      'Which checks to run: "screenshot", "accessibility", "performance", "links", "responsive", "seo", "forms". Pass multiple for a combined report.'
    ),
  fullPage: z
    .boolean()
    .optional()
    .default(false)
    .describe("Full-page screenshot (for screenshot check)"),
  width: z.number().optional().default(1280).describe("Viewport width"),
  height: z.number().optional().default(720).describe("Viewport height"),
  deviceName: z
    .string()
    .optional()
    .describe("Device to emulate, e.g. 'iPhone 14', 'iPad Pro 11'"),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before running checks"),
  maxPages: z
    .number()
    .optional()
    .describe(
      "If set > 1, crawls and audits multiple pages (site audit mode)"
    ),
  maxDepth: z
    .number()
    .optional()
    .default(2)
    .describe("Crawl depth for site audit mode"),
});

export type TestWebsiteInput = z.infer<typeof testWebsiteSchema>;

export async function handleTestWebsite(
  input: TestWebsiteInput
): Promise<{
  text: string;
  images: Array<{ data: string; mimeType: string }>;
}> {
  // Site audit mode: crawl multiple pages
  if (input.maxPages && input.maxPages > 1) {
    const result = await siteAudit({
      url: input.url,
      maxPages: input.maxPages,
      maxDepth: input.maxDepth,
      includeAccessibility: input.checks.includes("accessibility"),
      includePerformance: input.checks.includes("performance"),
      includeSeo: input.checks.includes("seo"),
      includeScreenshots: input.checks.includes("screenshot"),
    });

    const images: Array<{ data: string; mimeType: string }> = [];
    for (const page of result.pages) {
      if (page.stages.capture.screenshotBase64) {
        images.push({
          data: page.stages.capture.screenshotBase64,
          mimeType: "image/png",
        });
      }
    }

    return { text: formatSiteAuditReport(result), images };
  }

  // Single-page mode: run selected checks
  const sections: string[] = [];
  const images: Array<{ data: string; mimeType: string }> = [];

  for (const check of input.checks) {
    try {
      switch (check) {
        case "screenshot": {
          const result = await takeScreenshot({
            url: input.url,
            fullPage: input.fullPage,
            width: input.width,
            height: input.height,
            deviceName: input.deviceName,
            waitForSelector: input.waitForSelector,
          });
          sections.push(
            `--- Screenshot ---\n"${result.title}" (${result.width}x${result.height})`
          );
          images.push({ data: result.base64, mimeType: result.mimeType });
          break;
        }

        case "accessibility": {
          const result = await checkAccessibility({
            url: input.url,
            waitForSelector: input.waitForSelector,
          });
          let text = `--- Accessibility ---\nPasses: ${result.passes} | Violations: ${result.violationCount}\nCritical: ${result.criticalCount} | Serious: ${result.seriousCount}\n`;
          if (result.violations.length > 0) {
            for (const v of result.violations) {
              text += `\n[${v.impact.toUpperCase()}] ${v.description} (${v.nodes} instance(s))`;
              text += `\n  Rule: ${v.id}`;
              for (const el of v.elements.slice(0, 3)) {
                text += `\n  - ${el}`;
              }
              if (v.elements.length > 3)
                text += `\n  ... and ${v.elements.length - 3} more`;
            }
          } else {
            text += "No violations found!";
          }
          sections.push(text);
          break;
        }

        case "performance": {
          const result = await measurePerformance({
            url: input.url,
            width: input.width,
            height: input.height,
          });
          let text = `--- Performance ---\nLoad: ${result.loadTime}ms | DCL: ${result.domContentLoaded}ms`;
          if (result.firstPaint) text += ` | FP: ${result.firstPaint}ms`;
          if (result.largestContentfulPaint)
            text += ` | LCP: ${result.largestContentfulPaint}ms`;
          text += `\nRequests: ${result.totalRequests} (${result.failedRequests} failed) | Transfer: ${(result.totalTransferSize / 1024).toFixed(1)} KB`;
          if (result.consoleErrors.length > 0) {
            text += `\nConsole errors: ${result.consoleErrors.length}`;
            for (const e of result.consoleErrors.slice(0, 5)) {
              text += `\n  - ${e.text}`;
            }
          }
          const slowest = [...result.networkRequests]
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 3);
          if (slowest.length > 0) {
            text += "\nSlowest:";
            for (const r of slowest) {
              text += `\n  ${r.duration}ms ${r.method} ${r.url.slice(0, 80)}`;
            }
          }
          sections.push(text);
          break;
        }

        case "links": {
          const result = await checkLinks({ url: input.url, checkExternal: false, maxLinks: 100 });
          let text = `--- Links ---\nTotal: ${result.totalLinks} | Working: ${result.workingLinks} | Broken: ${result.brokenLinks.length} | Redirects: ${result.redirectLinks.length}`;
          if (result.brokenLinks.length > 0) {
            text += "\nBroken:";
            for (const link of result.brokenLinks) {
              text += `\n  [${link.status ?? "ERR"}] ${link.url}${link.error ? ` - ${link.error}` : ""}`;
            }
          }
          sections.push(text);
          break;
        }

        case "responsive": {
          const result = await testResponsive({
            url: input.url,
            fullPage: input.fullPage,
            waitForSelector: input.waitForSelector,
          });
          let text = "--- Responsive ---";
          for (const vp of result.viewports) {
            text += `\n${vp.name} (${vp.width}x${vp.height})`;
            images.push({ data: vp.screenshot, mimeType: "image/png" });
          }
          sections.push(text);
          break;
        }

        case "seo": {
          const result = await analyzeSeo({
            url: input.url,
            waitForSelector: input.waitForSelector,
          });
          let text = `--- SEO ---\nTitle: ${result.title || "(missing)"}\nMeta: ${result.metaDescription || "(missing)"}`;
          text += `\nH1: ${result.h1Tags.length > 0 ? result.h1Tags.join(", ") : "(none)"}`;
          text += `\nImages: ${result.totalImages} (${result.imagesWithoutAlt} without alt)`;
          text += `\nLinks: ${result.internalLinks} internal, ${result.externalLinks} external`;
          if (Object.keys(result.ogTags).length > 0) {
            text += "\nOG tags: " + Object.entries(result.ogTags).map(([k, v]) => `${k}=${v}`).join(", ");
          }
          if (result.structuredData.length > 0) {
            text += `\nStructured data: ${result.structuredData.length} block(s)`;
          }
          sections.push(text);
          break;
        }

        case "forms": {
          const result = await analyzeForms({ url: input.url });
          let text = `--- Forms ---\nFound ${result.forms.length} form(s)`;
          for (let i = 0; i < result.forms.length; i++) {
            const form = result.forms[i];
            text += `\n\nForm #${i + 1}: [${form.method}] ${form.action || "(no action)"} — ${form.fields.length} fields`;
            if (form.submitButton) text += ` — "${form.submitButton}"`;
            for (const field of form.fields) {
              const parts = [`  <${field.tag}>`];
              if (field.type) parts.push(`type="${field.type}"`);
              if (field.name) parts.push(`name="${field.name}"`);
              if (field.label) parts.push(`label="${field.label}"`);
              if (field.required) parts.push("[REQUIRED]");
              text += `\n${parts.join(" ")}`;
            }
          }
          sections.push(text);
          break;
        }
      }
    } catch (err) {
      sections.push(
        `--- ${check} ---\nFailed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { text: sections.join("\n\n"), images };
}
