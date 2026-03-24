import { z } from "zod";
import { createPage, navigateAndWait } from "../services/browser-manager.js";
import type { SeoData } from "../models/types.js";

export const seoSchema = z.object({
  url: z.string().url().describe("The URL to analyze for SEO"),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before analysis"),
});

export type SeoInput = z.infer<typeof seoSchema>;

export async function analyzeSeo(input: SeoInput): Promise<SeoData> {
  const { context, page } = await createPage();

  try {
    await navigateAndWait(page, input.url, {
      waitForSelector: input.waitForSelector,
    });

    const seoData = await page.evaluate(() => {
      const getMeta = (name: string): string => {
        const el =
          document.querySelector(`meta[name="${name}"]`) ||
          document.querySelector(`meta[property="${name}"]`);
        return el?.getAttribute("content") || "";
      };

      const getMetasByPrefix = (prefix: string): Record<string, string> => {
        const result: Record<string, string> = {};
        document
          .querySelectorAll(`meta[property^="${prefix}"]`)
          .forEach((el) => {
            const prop = el.getAttribute("property");
            const content = el.getAttribute("content");
            if (prop && content) result[prop] = content;
          });
        return result;
      };

      const images = Array.from(document.querySelectorAll("img")).map(
        (img) => ({
          src: img.src,
          alt: img.alt,
          hasAlt: img.hasAttribute("alt") && img.alt.trim() !== "",
        })
      );

      const links = Array.from(document.querySelectorAll("a[href]"));
      const currentHost = window.location.hostname;

      const canonicalEl = document.querySelector('link[rel="canonical"]');
      const robotsMeta = document.querySelector('meta[name="robots"]');

      // Structured data (JSON-LD)
      const structuredData: unknown[] = [];
      document
        .querySelectorAll('script[type="application/ld+json"]')
        .forEach((script) => {
          try {
            structuredData.push(JSON.parse(script.textContent || ""));
          } catch {
            // skip malformed
          }
        });

      return {
        title: document.title,
        metaDescription: getMeta("description"),
        h1Tags: Array.from(document.querySelectorAll("h1")).map(
          (h) => h.textContent?.trim() || ""
        ),
        h2Tags: Array.from(document.querySelectorAll("h2")).map(
          (h) => h.textContent?.trim() || ""
        ),
        canonicalUrl: canonicalEl?.getAttribute("href") || undefined,
        ogTags: getMetasByPrefix("og:"),
        twitterTags: getMetasByPrefix("twitter:"),
        hasRobotsMeta: !!robotsMeta,
        robotsContent: robotsMeta?.getAttribute("content") || undefined,
        structuredData,
        images,
        imagesWithoutAlt: images.filter((img) => !img.hasAlt).length,
        totalImages: images.length,
        internalLinks: links.filter((a) => {
          try {
            return new URL(a.getAttribute("href")!, window.location.origin)
              .hostname === currentHost;
          } catch {
            return true;
          }
        }).length,
        externalLinks: links.filter((a) => {
          try {
            return new URL(a.getAttribute("href")!, window.location.origin)
              .hostname !== currentHost;
          } catch {
            return false;
          }
        }).length,
      };
    });

    return {
      url: page.url(),
      ...seoData,
    };
  } finally {
    await context.close();
  }
}
