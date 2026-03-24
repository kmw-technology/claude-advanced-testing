import { z } from "zod";
import { createPage, navigateAndWait } from "../services/browser-manager.js";
import type { LinkCheckResult, LinkCheckReport } from "../models/types.js";

export const linkCheckerSchema = z.object({
  url: z.string().url().describe("The URL to check links on"),
  checkExternal: z
    .boolean()
    .optional()
    .default(false)
    .describe("Also check external links (slower)"),
  maxLinks: z
    .number()
    .optional()
    .default(50)
    .describe("Maximum number of links to check"),
});

export type LinkCheckerInput = z.infer<typeof linkCheckerSchema>;

export async function checkLinks(
  input: LinkCheckerInput
): Promise<LinkCheckReport> {
  const { context, page } = await createPage();

  try {
    await navigateAndWait(page, input.url);

    const baseUrl = new URL(input.url);

    // Extract all links from the page
    const links = await page.$$eval("a[href]", (anchors) =>
      anchors
        .map((a) => a.getAttribute("href"))
        .filter((href): href is string => !!href)
    );

    // Resolve relative URLs and deduplicate
    const uniqueUrls = new Set<string>();
    for (const href of links) {
      try {
        const resolved = new URL(href, input.url).toString();
        uniqueUrls.add(resolved);
      } catch {
        // Skip malformed URLs
      }
    }

    // Filter based on scope
    let urlsToCheck = [...uniqueUrls];
    if (!input.checkExternal) {
      urlsToCheck = urlsToCheck.filter((url) => {
        try {
          return new URL(url).hostname === baseUrl.hostname;
        } catch {
          return false;
        }
      });
    }

    // Limit the number of links to check
    urlsToCheck = urlsToCheck.slice(0, input.maxLinks);

    // Check each link
    const results: LinkCheckResult[] = [];
    const checkContext = await context.browser()!.newContext();
    const checkPage = await checkContext.newPage();

    for (const url of urlsToCheck) {
      try {
        const response = await checkPage.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });

        const result: LinkCheckResult = {
          url,
          status: response?.status() ?? null,
          ok: response ? response.status() < 400 : false,
        };

        // Check for redirects
        if (response && checkPage.url() !== url) {
          result.redirectUrl = checkPage.url();
        }

        results.push(result);
      } catch (error) {
        results.push({
          url,
          status: null,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await checkContext.close();

    return {
      baseUrl: input.url,
      totalLinks: results.length,
      brokenLinks: results.filter((r) => !r.ok),
      redirectLinks: results.filter((r) => r.redirectUrl),
      workingLinks: results.filter((r) => r.ok && !r.redirectUrl).length,
    };
  } finally {
    await context.close();
  }
}
