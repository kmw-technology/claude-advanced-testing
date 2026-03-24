import { Page } from "playwright";
import type { SpaSettlementResult, WaitStrategyConfig } from "../models/types.js";

export type ActionType = "search" | "submit" | "navigation" | "generic";

/**
 * Determines the type of action based on context clues.
 * Used to choose an appropriate wait strategy after the action.
 */
export function detectActionType(
  action: string,
  value?: string,
  targetText?: string
): ActionType {
  // Navigation actions
  if (["navigate", "go_back", "go_forward"].includes(action)) {
    return "navigation";
  }

  // Submit actions
  if (action === "submit") {
    return "submit";
  }

  // Click on a submit button
  if (action === "click" && targetText) {
    const submitPattern =
      /\b(submit|send|absenden|senden|bestätigen|einreichen|anmelden|login|sign\s*in|register|registrieren)\b/i;
    if (submitPattern.test(targetText)) {
      return "submit";
    }
  }

  // Press Enter — likely a form submission or search
  if (action === "press_key" && value?.toLowerCase() === "enter") {
    return "submit";
  }

  // Search-related actions
  if (action === "click" && targetText) {
    const searchPattern = /\b(search|suche|suchen|find|finden|go|los)\b/i;
    if (searchPattern.test(targetText)) {
      return "search";
    }
  }

  return "generic";
}

/**
 * Returns timing configuration for the given action type.
 */
export function getWaitStrategy(actionType: ActionType): WaitStrategyConfig {
  switch (actionType) {
    case "search":
      return { minWait: 800, maxWait: 3000, networkQuiet: true, quietPeriod: 500 };
    case "submit":
      return { minWait: 500, maxWait: 5000, networkQuiet: true, quietPeriod: 500 };
    case "navigation":
      return { minWait: 300, maxWait: 5000, networkQuiet: true, quietPeriod: 400 };
    case "generic":
      return { minWait: 100, maxWait: 2000, networkQuiet: false, quietPeriod: 300 };
  }
}

/**
 * Waits for a SPA page to settle after an action by observing DOM mutations
 * and URL changes. Returns diagnostic info about what happened.
 */
export async function waitForSpaSettlement(
  page: Page,
  options?: Partial<WaitStrategyConfig> & { previousUrl?: string }
): Promise<SpaSettlementResult> {
  const config: WaitStrategyConfig = {
    minWait: options?.minWait ?? 200,
    maxWait: options?.maxWait ?? 3000,
    networkQuiet: options?.networkQuiet ?? false,
    quietPeriod: options?.quietPeriod ?? 300,
  };

  const previousUrl = options?.previousUrl ?? page.url();
  const startTime = Date.now();

  // Set up MutationObserver to count DOM changes
  const mutationHandle = await page.evaluateHandle((quietPeriodMs: number) => {
    return new Promise<{ mutationCount: number }>((resolve) => {
      let mutationCount = 0;
      let quietTimer: ReturnType<typeof setTimeout> | null = null;

      const observer = new MutationObserver((mutations) => {
        mutationCount += mutations.length;

        // Reset the quiet timer on each mutation
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(() => {
          observer.disconnect();
          resolve({ mutationCount });
        }, quietPeriodMs);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      // Start the initial quiet timer (in case no mutations happen)
      quietTimer = setTimeout(() => {
        observer.disconnect();
        resolve({ mutationCount });
      }, quietPeriodMs);
    });
  }, config.quietPeriod);

  // Wait for the observer promise with a max timeout
  const remainingTime = Math.max(config.maxWait - (Date.now() - startTime), 0);

  let domMutationCount = 0;
  try {
    const result = await Promise.race([
      mutationHandle.jsonValue() as Promise<{ mutationCount: number }>,
      page.waitForTimeout(remainingTime).then(() => ({ mutationCount: -1 })),
    ]);
    domMutationCount = result.mutationCount === -1 ? 0 : result.mutationCount;
  } catch {
    // Observer failed (e.g., page navigated away) — that's fine
  }

  // Ensure minimum wait time
  const elapsed = Date.now() - startTime;
  if (elapsed < config.minWait) {
    await page.waitForTimeout(config.minWait - elapsed);
  }

  // Optionally wait for network to quiet down
  if (config.networkQuiet) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 2000 });
    } catch {
      // Network didn't settle — acceptable
    }
  }

  const currentUrl = page.url();
  const settledAfterMs = Date.now() - startTime;

  return {
    urlChanged: currentUrl !== previousUrl,
    previousUrl,
    currentUrl,
    domMutationCount,
    settledAfterMs,
  };
}
