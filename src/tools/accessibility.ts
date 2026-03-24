import { z } from "zod";
import { createPage, navigateAndWait } from "../services/browser-manager.js";
import type { AccessibilityResult, AccessibilityViolation } from "../models/types.js";

export const accessibilitySchema = z.object({
  url: z.string().url().describe("The URL to audit for accessibility"),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before running audit"),
});

export type AccessibilityInput = z.infer<typeof accessibilitySchema>;

// Inline axe-core checks using Playwright's built-in accessibility tree
// plus manual DOM checks for common WCAG violations
export async function checkAccessibility(
  input: AccessibilityInput
): Promise<AccessibilityResult> {
  const { context, page } = await createPage();

  try {
    await navigateAndWait(page, input.url, {
      waitForSelector: input.waitForSelector,
    });

    const violations: AccessibilityViolation[] = [];

    // Check images without alt text
    const imagesWithoutAlt = await page.$$eval("img", (imgs) =>
      imgs
        .filter((img) => !img.getAttribute("alt") && !img.getAttribute("role"))
        .map((img) => img.outerHTML.slice(0, 200))
    );
    if (imagesWithoutAlt.length > 0) {
      violations.push({
        id: "image-alt",
        impact: "critical",
        description: "Images must have alternate text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/image-alt",
        nodes: imagesWithoutAlt.length,
        elements: imagesWithoutAlt,
      });
    }

    // Check for missing form labels
    const unlabeledInputs = await page.$$eval(
      "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset])",
      (inputs) =>
        inputs
          .filter((input) => {
            const id = input.id;
            const ariaLabel = input.getAttribute("aria-label");
            const ariaLabelledBy = input.getAttribute("aria-labelledby");
            const title = input.getAttribute("title");
            const hasLabel = id
              ? !!document.querySelector(`label[for="${id}"]`)
              : !!input.closest("label");
            return !ariaLabel && !ariaLabelledBy && !title && !hasLabel;
          })
          .map((input) => input.outerHTML.slice(0, 200))
    );
    if (unlabeledInputs.length > 0) {
      violations.push({
        id: "label",
        impact: "critical",
        description: "Form elements must have labels",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/label",
        nodes: unlabeledInputs.length,
        elements: unlabeledInputs,
      });
    }

    // Check for empty links
    const emptyLinks = await page.$$eval("a", (links) =>
      links
        .filter((a) => {
          const text = (a.textContent || "").trim();
          const ariaLabel = a.getAttribute("aria-label");
          const img = a.querySelector("img[alt]");
          return !text && !ariaLabel && !img;
        })
        .map((a) => a.outerHTML.slice(0, 200))
    );
    if (emptyLinks.length > 0) {
      violations.push({
        id: "link-name",
        impact: "serious",
        description: "Links must have discernible text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/link-name",
        nodes: emptyLinks.length,
        elements: emptyLinks,
      });
    }

    // Check for empty buttons
    const emptyButtons = await page.$$eval("button", (buttons) =>
      buttons
        .filter((btn) => {
          const text = (btn.textContent || "").trim();
          const ariaLabel = btn.getAttribute("aria-label");
          return !text && !ariaLabel;
        })
        .map((btn) => btn.outerHTML.slice(0, 200))
    );
    if (emptyButtons.length > 0) {
      violations.push({
        id: "button-name",
        impact: "critical",
        description: "Buttons must have discernible text",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/button-name",
        nodes: emptyButtons.length,
        elements: emptyButtons,
      });
    }

    // Check color contrast (basic check for very small text without sufficient size)
    const missingLangAttr = await page.$eval("html", (html) => !html.getAttribute("lang"));
    if (missingLangAttr) {
      violations.push({
        id: "html-has-lang",
        impact: "serious",
        description: "HTML element must have a lang attribute",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/html-has-lang",
        nodes: 1,
        elements: ["<html>"],
      });
    }

    // Check document title
    const title = await page.title();
    if (!title || title.trim() === "") {
      violations.push({
        id: "document-title",
        impact: "serious",
        description: "Documents must have a title element",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/document-title",
        nodes: 1,
        elements: ["<title>"],
      });
    }

    // Check heading order
    const headingOrder = await page.$$eval(
      "h1, h2, h3, h4, h5, h6",
      (headings) => headings.map((h) => parseInt(h.tagName[1]))
    );
    const skippedLevels: string[] = [];
    for (let i = 1; i < headingOrder.length; i++) {
      if (headingOrder[i] > headingOrder[i - 1] + 1) {
        skippedLevels.push(
          `h${headingOrder[i - 1]} -> h${headingOrder[i]} (skipped level)`
        );
      }
    }
    if (skippedLevels.length > 0) {
      violations.push({
        id: "heading-order",
        impact: "moderate",
        description: "Heading levels should increase by one",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/heading-order",
        nodes: skippedLevels.length,
        elements: skippedLevels,
      });
    }

    // Check ARIA attributes
    const invalidAria = await page.$$eval("[role]", (elements) =>
      elements
        .filter((el) => {
          const role = el.getAttribute("role");
          const validRoles = [
            "alert", "alertdialog", "application", "article", "banner",
            "button", "cell", "checkbox", "columnheader", "combobox",
            "complementary", "contentinfo", "definition", "dialog",
            "directory", "document", "feed", "figure", "form", "grid",
            "gridcell", "group", "heading", "img", "link", "list",
            "listbox", "listitem", "log", "main", "marquee", "math",
            "menu", "menubar", "menuitem", "menuitemcheckbox",
            "menuitemradio", "navigation", "none", "note", "option",
            "presentation", "progressbar", "radio", "radiogroup",
            "region", "row", "rowgroup", "rowheader", "scrollbar",
            "search", "searchbox", "separator", "slider", "spinbutton",
            "status", "switch", "tab", "table", "tablist", "tabpanel",
            "term", "textbox", "timer", "toolbar", "tooltip", "tree",
            "treegrid", "treeitem",
          ];
          return role && !validRoles.includes(role);
        })
        .map((el) => el.outerHTML.slice(0, 200))
    );
    if (invalidAria.length > 0) {
      violations.push({
        id: "aria-allowed-role",
        impact: "serious",
        description: "ARIA role must be valid",
        helpUrl: "https://dequeuniversity.com/rules/axe/4.4/aria-allowed-role",
        nodes: invalidAria.length,
        elements: invalidAria,
      });
    }

    // Accessibility tree snapshot for pass count estimation
    const accessibilityTree = await page.accessibility.snapshot();
    const passCount = accessibilityTree ? countNodes(accessibilityTree) : 0;

    return {
      url: page.url(),
      violations,
      passes: passCount,
      violationCount: violations.reduce((sum, v) => sum + v.nodes, 0),
      criticalCount: violations
        .filter((v) => v.impact === "critical")
        .reduce((sum, v) => sum + v.nodes, 0),
      seriousCount: violations
        .filter((v) => v.impact === "serious")
        .reduce((sum, v) => sum + v.nodes, 0),
    };
  } finally {
    await context.close();
  }
}

function countNodes(node: { children?: unknown[] }): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child as { children?: unknown[] });
    }
  }
  return count;
}
