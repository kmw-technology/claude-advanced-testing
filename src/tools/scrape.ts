import { z } from "zod";
import { createPage, navigateAndWait } from "../services/browser-manager.js";

export const scrapeSchema = z.object({
  url: z.string().url().describe("The URL to scrape content from"),
  selector: z
    .string()
    .optional()
    .describe("CSS selector to extract specific content. Extracts full page if omitted."),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before scraping"),
  extractLinks: z
    .boolean()
    .optional()
    .default(false)
    .describe("Also extract all links from the page"),
  javascript: z
    .string()
    .optional()
    .describe("JavaScript code to execute on the page and return results from"),
});

export type ScrapeInput = z.infer<typeof scrapeSchema>;

export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  links?: { text: string; href: string }[];
  jsResult?: unknown;
}

export async function scrapePage(input: ScrapeInput): Promise<ScrapeResult> {
  const { context, page } = await createPage();

  try {
    await navigateAndWait(page, input.url, {
      waitForSelector: input.waitForSelector,
    });

    const title = await page.title();

    let content: string;
    if (input.selector) {
      const elements = await page.$$eval(input.selector, (els) =>
        els.map((el) => el.textContent?.trim() ?? "")
      );
      content = elements.join("\n\n");
    } else {
      content = await page.evaluate(() => {
        // Remove script and style elements
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone
          .querySelectorAll("script, style, noscript")
          .forEach((el) => el.remove());
        return clone.innerText.trim();
      });
    }

    let links: { text: string; href: string }[] | undefined;
    if (input.extractLinks) {
      links = await page.$$eval("a[href]", (anchors) =>
        anchors.map((a) => ({
          text: (a.textContent || "").trim(),
          href: a.getAttribute("href") || "",
        }))
      );
    }

    let jsResult: unknown;
    if (input.javascript) {
      jsResult = await page.evaluate(input.javascript);
    }

    return {
      url: page.url(),
      title,
      content,
      links,
      jsResult,
    };
  } finally {
    await context.close();
  }
}
