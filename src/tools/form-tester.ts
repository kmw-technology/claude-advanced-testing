import { z } from "zod";
import { createPage, navigateAndWait } from "../services/browser-manager.js";
import type { FormTestResult, FormField } from "../models/types.js";

export const formTesterSchema = z.object({
  url: z.string().url().describe("The URL containing forms to analyze"),
  waitForSelector: z
    .string()
    .optional()
    .describe("CSS selector to wait for before analysis"),
});

export type FormTesterInput = z.infer<typeof formTesterSchema>;

export async function analyzeForms(
  input: FormTesterInput
): Promise<FormTestResult> {
  const { context, page } = await createPage();

  try {
    await navigateAndWait(page, input.url, {
      waitForSelector: input.waitForSelector,
    });

    const forms = await page.$$eval("form", (formElements) =>
      formElements.map((form) => {
        const fields: FormField[] = [];

        // Collect input fields
        form
          .querySelectorAll(
            "input:not([type=hidden]):not([type=submit]):not([type=button])"
          )
          .forEach((input) => {
            const el = input as HTMLInputElement;
            const id = el.id;
            const label = id
              ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim()
              : el.closest("label")?.textContent?.trim();

            fields.push({
              tag: "input",
              type: el.type || "text",
              name: el.name || undefined,
              id: el.id || undefined,
              placeholder: el.placeholder || undefined,
              required: el.required,
              label: label || undefined,
            });
          });

        // Collect textareas
        form.querySelectorAll("textarea").forEach((textarea) => {
          const el = textarea as HTMLTextAreaElement;
          const id = el.id;
          const label = id
            ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim()
            : el.closest("label")?.textContent?.trim();

          fields.push({
            tag: "textarea",
            name: el.name || undefined,
            id: el.id || undefined,
            placeholder: el.placeholder || undefined,
            required: el.required,
            label: label || undefined,
          });
        });

        // Collect selects
        form.querySelectorAll("select").forEach((select) => {
          const el = select as HTMLSelectElement;
          const id = el.id;
          const label = id
            ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim()
            : el.closest("label")?.textContent?.trim();

          fields.push({
            tag: "select",
            name: el.name || undefined,
            id: el.id || undefined,
            required: el.required,
            label: label || undefined,
          });
        });

        // Find submit button
        const submitBtn =
          form.querySelector('button[type=submit]') ||
          form.querySelector('input[type=submit]') ||
          form.querySelector("button:not([type])");
        const submitText = submitBtn?.textContent?.trim() ||
          (submitBtn as HTMLInputElement)?.value ||
          undefined;

        return {
          action: form.action || "",
          method: (form.method || "GET").toUpperCase(),
          fields,
          submitButton: submitText,
        };
      })
    );

    return {
      url: page.url(),
      forms,
    };
  } finally {
    await context.close();
  }
}
