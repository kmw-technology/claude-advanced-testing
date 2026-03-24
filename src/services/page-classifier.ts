import { Page } from "playwright";

export type PageType =
  | "homepage"
  | "pricing"
  | "about"
  | "features"
  | "blog"
  | "blog_post"
  | "contact"
  | "login"
  | "register"
  | "dashboard"
  | "product"
  | "legal"
  | "faq"
  | "documentation"
  | "unknown";

export interface ConsentBannerInfo {
  found: boolean;
  selector: string;
  acceptButtonSelector?: string;
  text: string;
}

// URL path patterns for page type inference
const PATH_PATTERNS: Array<[RegExp, PageType]> = [
  [/^\/?$/, "homepage"],
  [/\/(pricing|preise|plans|tarife)/i, "pricing"],
  [/\/(about|ueber-uns|about-us|team|company)/i, "about"],
  [/\/(features|funktionen|capabilities)/i, "features"],
  [/\/(blog|news|articles|artikel|beitraege)\/?$/i, "blog"],
  [/\/(blog|news|articles)\/[^/]+/i, "blog_post"],
  [/\/(contact|kontakt|get-in-touch)/i, "contact"],
  [/\/(login|signin|sign-in|anmelden|anmeldung)/i, "login"],
  [/\/(register|signup|sign-up|registrieren|registrierung)/i, "register"],
  [/\/(dashboard|admin|panel|portal)/i, "dashboard"],
  [/\/(product|produkt|shop|store)\/[^/]+/i, "product"],
  [/\/(legal|impressum|imprint|privacy|datenschutz|terms|agb|nutzungsbedingungen)/i, "legal"],
  [/\/(faq|help|hilfe|support|frequently-asked)/i, "faq"],
  [/\/(docs|documentation|dokumentation|wiki|guide|api)/i, "documentation"],
];

/**
 * Infers page type from URL path, title, and content heuristics.
 */
export function classifyPageType(
  url: string,
  title: string,
  _content?: string
): PageType {
  try {
    const pathname = new URL(url).pathname;

    for (const [pattern, pageType] of PATH_PATTERNS) {
      if (pattern.test(pathname)) {
        return pageType;
      }
    }
  } catch {
    // Invalid URL — fall through to title check
  }

  // Fallback: check title keywords
  const lowerTitle = title.toLowerCase();
  if (/\b(pricing|preise|plans|tarife)\b/.test(lowerTitle)) return "pricing";
  if (/\b(about|über uns|team)\b/.test(lowerTitle)) return "about";
  if (/\b(contact|kontakt)\b/.test(lowerTitle)) return "contact";
  if (/\b(login|sign\s*in|anmelden)\b/.test(lowerTitle)) return "login";
  if (/\b(faq|help|hilfe)\b/.test(lowerTitle)) return "faq";
  if (/\b(blog|news)\b/.test(lowerTitle)) return "blog";

  return "unknown";
}

// Selectors for common consent/cookie banners
const BANNER_SELECTORS = [
  '[class*="cookie" i]',
  '[class*="consent" i]',
  '[id*="cookie" i]',
  '[id*="consent" i]',
  '[class*="gdpr" i]',
  '[class*="privacy-banner" i]',
  '[class*="cookie-banner" i]',
  '[aria-label*="cookie" i]',
  '[aria-label*="consent" i]',
];

// Button texts to look for (EN + DE)
const ACCEPT_BUTTON_TEXTS = [
  "accept all",
  "accept",
  "allow all",
  "allow",
  "agree",
  "i agree",
  "ok",
  "got it",
  "alle akzeptieren",
  "akzeptieren",
  "alle zulassen",
  "zustimmen",
  "einverstanden",
  "verstanden",
];

/**
 * Detects common cookie/consent banners on the page.
 */
export async function detectConsentBanner(
  page: Page
): Promise<ConsentBannerInfo | null> {
  try {
    const result = await page.evaluate(
      ({
        bannerSelectors,
        acceptTexts,
      }: {
        bannerSelectors: string[];
        acceptTexts: string[];
      }) => {
        for (const sel of bannerSelectors) {
          const banner = document.querySelector(sel);
          if (!banner) continue;

          // Check visibility
          const rect = banner.getBoundingClientRect();
          const style = getComputedStyle(banner);
          if (
            rect.width === 0 ||
            rect.height === 0 ||
            style.display === "none" ||
            style.visibility === "hidden"
          )
            continue;

          // Look for an accept button inside or near the banner
          const buttons = banner.querySelectorAll(
            'button, [role="button"], a.btn, a.button, input[type="submit"]'
          );
          let acceptSelector: string | undefined;

          for (const btn of buttons) {
            const btnText = (btn.textContent ?? "").trim().toLowerCase();
            if (acceptTexts.some((t) => btnText.includes(t))) {
              // Build a selector for this button
              if (btn.id) {
                acceptSelector = `#${btn.id}`;
              } else {
                acceptSelector = `${sel} button`;
              }
              break;
            }
          }

          return {
            found: true,
            selector: sel,
            acceptButtonSelector: acceptSelector,
            text: (banner.textContent ?? "").trim().substring(0, 200),
          };
        }

        return null;
      },
      { bannerSelectors: BANNER_SELECTORS, acceptTexts: ACCEPT_BUTTON_TEXTS }
    );

    return result;
  } catch {
    return null;
  }
}

/**
 * Attempts to dismiss a consent banner by clicking the accept button.
 */
export async function dismissConsentBanner(
  page: Page,
  banner: ConsentBannerInfo
): Promise<boolean> {
  if (!banner.acceptButtonSelector) {
    // Try clicking any visible button in the banner with accept-like text
    try {
      for (const text of ACCEPT_BUTTON_TEXTS) {
        const btn = page
          .locator(banner.selector)
          .getByRole("button", { name: new RegExp(text, "i") })
          .first();
        if ((await btn.count()) > 0) {
          await btn.click({ timeout: 3000 });
          return true;
        }
      }
    } catch {
      return false;
    }
    return false;
  }

  try {
    await page.click(banner.acceptButtonSelector, { timeout: 3000 });
    // Wait for banner to disappear
    await page.waitForTimeout(500);
    return true;
  } catch {
    return false;
  }
}
