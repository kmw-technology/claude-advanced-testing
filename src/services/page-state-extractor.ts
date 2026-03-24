import { Page } from "playwright";
import type {
  PageState,
  InteractiveElement,
  PageFormInfo,
  PageFormField,
  ConsoleEntry,
} from "../models/types.js";

interface ExtractOptions {
  includeScreenshot?: boolean;
  includeVisibleText?: boolean;
  consoleErrors?: ConsoleEntry[];
  maxElements?: number;
}

interface RawPageData {
  interactiveElements: InteractiveElement[];
  forms: PageFormInfo[];
  notifications: string[];
  visibleText?: string;
}

export async function extractPageState(
  page: Page,
  options?: ExtractOptions
): Promise<PageState> {
  const maxElements = options?.maxElements ?? 50;
  const includeVisibleText = options?.includeVisibleText ?? false;

  const rawData = await page.evaluate(
    ({ maxEl, includeText }) => {
      // --- Helper: check if element is visible ---
      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      // --- Helper: get truncated text ---
      function getText(el: Element, max = 100): string {
        const text = (el.textContent || "").trim().replace(/\s+/g, " ");
        return text.length > max ? text.slice(0, max) + "…" : text;
      }

      // --- 1. Interactive Elements ---
      const interactiveSelectors =
        'a[href], button, input:not([type="hidden"]), select, textarea, ' +
        '[role="button"], [role="link"], [role="checkbox"], [role="radio"], ' +
        '[role="tab"], [role="menuitem"], [role="switch"], [onclick]';
      const rawElements = document.querySelectorAll(interactiveSelectors);
      const interactiveElements: InteractiveElement[] = [];

      for (const el of rawElements) {
        if (interactiveElements.length >= maxEl) break;
        if (!isVisible(el)) continue;

        const htmlEl = el as HTMLElement;
        const inputEl = el as HTMLInputElement;
        const anchorEl = el as HTMLAnchorElement;

        interactiveElements.push({
          tag: el.tagName.toLowerCase(),
          type: inputEl.type || undefined,
          role: el.getAttribute("role") || undefined,
          text: getText(el),
          name: inputEl.name || undefined,
          id: el.id || undefined,
          placeholder: inputEl.placeholder || undefined,
          disabled: (inputEl.disabled ?? false) || el.hasAttribute("disabled"),
          checked:
            inputEl.type === "checkbox" || inputEl.type === "radio"
              ? inputEl.checked
              : undefined,
          value:
            el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT"
              ? inputEl.value || undefined
              : undefined,
          href: anchorEl.href || undefined,
          ariaLabel: el.getAttribute("aria-label") || undefined,
        });
      }

      // --- 2. Forms ---
      const formElements = document.querySelectorAll("form");
      const forms: PageFormInfo[] = [];

      for (const form of formElements) {
        if (!isVisible(form)) continue;

        const fields: PageFormField[] = [];

        // Inputs (excluding hidden and submit)
        form
          .querySelectorAll(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"])'
          )
          .forEach((input) => {
            const inp = input as HTMLInputElement;
            const id = inp.id;
            const labelEl = id
              ? document.querySelector(`label[for="${id}"]`)
              : inp.closest("label");
            fields.push({
              tag: "input",
              type: inp.type || "text",
              name: inp.name || undefined,
              label: labelEl?.textContent?.trim() || undefined,
              placeholder: inp.placeholder || undefined,
              value: inp.value || undefined,
              required: inp.required,
            });
          });

        // Textareas
        form.querySelectorAll("textarea").forEach((textarea) => {
          const ta = textarea as HTMLTextAreaElement;
          const id = ta.id;
          const labelEl = id
            ? document.querySelector(`label[for="${id}"]`)
            : ta.closest("label");
          fields.push({
            tag: "textarea",
            name: ta.name || undefined,
            label: labelEl?.textContent?.trim() || undefined,
            placeholder: ta.placeholder || undefined,
            value: ta.value || undefined,
            required: ta.required,
          });
        });

        // Selects
        form.querySelectorAll("select").forEach((select) => {
          const sel = select as HTMLSelectElement;
          const id = sel.id;
          const labelEl = id
            ? document.querySelector(`label[for="${id}"]`)
            : sel.closest("label");
          const options = [...sel.options].map((o) => o.text.trim());
          fields.push({
            tag: "select",
            name: sel.name || undefined,
            label: labelEl?.textContent?.trim() || undefined,
            value: sel.value || undefined,
            required: sel.required,
            options,
          });
        });

        // Submit button
        const submitBtn =
          form.querySelector('button[type="submit"]') ||
          form.querySelector('input[type="submit"]') ||
          form.querySelector("button:not([type])");
        const submitText =
          submitBtn?.textContent?.trim() ||
          (submitBtn as HTMLInputElement)?.value ||
          undefined;

        forms.push({
          action: form.action || "",
          method: (form.method || "GET").toUpperCase(),
          fields,
          submitButton: submitText,
        });
      }

      // --- 3. Notifications ---
      const notificationSelectors = [
        '[role="alert"]',
        '[role="status"]',
        ".toast",
        ".notification",
        ".alert:not(a)",
        ".error-message",
        ".success-message",
        ".snackbar",
        '[class*="toast"]',
        '[class*="notify"]',
      ];
      const notifications: string[] = [];
      for (const selector of notificationSelectors) {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            if (isVisible(el)) {
              const text = (el.textContent || "").trim().replace(/\s+/g, " ");
              if (text && !notifications.includes(text)) {
                notifications.push(text.slice(0, 200));
              }
            }
          });
        } catch {
          // Invalid selector, skip
        }
      }

      // --- 4. Visible Text (optional) ---
      let visibleText: string | undefined;
      if (includeText) {
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
        const text = clone.innerText.trim();
        visibleText = text.length > 2000 ? text.slice(0, 2000) + "…" : text;
      }

      return { interactiveElements, forms, notifications, visibleText } as RawPageData;
    },
    { maxEl: maxElements, includeText: includeVisibleText }
  );

  // Screenshot (optional)
  let screenshot: string | undefined;
  if (options?.includeScreenshot) {
    const buf = await page.screenshot({ type: "png" });
    screenshot = buf.toString("base64");
  }

  return {
    url: page.url(),
    title: await page.title(),
    interactiveElements: rawData.interactiveElements,
    forms: rawData.forms,
    notifications: rawData.notifications,
    visibleText: rawData.visibleText,
    consoleErrors: options?.consoleErrors ?? [],
    screenshot,
  };
}
