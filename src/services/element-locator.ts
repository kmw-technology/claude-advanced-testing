import { Page, Locator } from "playwright";
import { z } from "zod";
import { getAlternativeLabels } from "./i18n-labels.js";

export const locatorStrategySchema = z
  .union([
    z.object({
      text: z.string().describe("Find element by visible text content"),
      exact: z.boolean().optional().describe("Exact text match (default: false)"),
    }),
    z.object({
      role: z
        .enum([
          "button",
          "link",
          "checkbox",
          "radio",
          "textbox",
          "combobox",
          "heading",
          "tab",
          "menuitem",
          "option",
          "dialog",
          "alert",
          "navigation",
          "listitem",
          "row",
          "cell",
        ])
        .describe("ARIA role of the element"),
      name: z.string().optional().describe("Accessible name of the element"),
    }),
    z.object({
      placeholder: z.string().describe("Find input by placeholder text"),
    }),
    z.object({
      label: z.string().describe("Find form element by its label text"),
    }),
    z.object({
      testId: z.string().describe("Find element by data-testid attribute"),
    }),
    z.object({
      selector: z
        .string()
        .describe("CSS selector (fallback when other strategies don't work)"),
    }),
  ])
  .describe(
    "How to find the target element. Use text, role, placeholder, label, testId, or CSS selector."
  );

export type LocatorStrategy = z.infer<typeof locatorStrategySchema>;

export function resolveLocator(page: Page, strategy: LocatorStrategy): Locator {
  if ("text" in strategy) {
    return page.getByText(strategy.text, { exact: strategy.exact ?? false });
  }
  if ("role" in strategy) {
    return page.getByRole(strategy.role as Parameters<Page["getByRole"]>[0], {
      name: strategy.name,
    });
  }
  if ("placeholder" in strategy) {
    return page.getByPlaceholder(strategy.placeholder);
  }
  if ("label" in strategy) {
    // Build locators for the original label + all i18n alternatives
    const alternatives = getAlternativeLabels(strategy.label);
    let combined: Locator | null = null;

    for (const alt of alternatives) {
      const byLabel = page.getByLabel(alt);
      const escaped = alt.replace(/'/g, "\\'");
      const byProximity = page
        .locator(
          `xpath=//*[normalize-space(text())='${escaped}']/ancestor::*[.//input or .//textarea or .//select][1]`
        )
        .locator("input, textarea, select")
        .first();
      const locator = byLabel.or(byProximity);
      combined = combined ? combined.or(locator) : locator;
    }

    return combined!;
  }
  if ("testId" in strategy) {
    return page.getByTestId(strategy.testId);
  }
  if ("selector" in strategy) {
    return page.locator(strategy.selector);
  }

  throw new Error("Invalid locator strategy: no recognized key found");
}
