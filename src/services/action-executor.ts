import { Page } from "playwright";
import { resolveLocator } from "./element-locator.js";
import type { LocatorStrategy } from "./element-locator.js";
import type { InteractionAction, SpaSettlementResult } from "../models/types.js";
import {
  waitForSpaSettlement,
  detectActionType,
  getWaitStrategy,
} from "./spa-wait.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface ActionResult {
  success: boolean;
  error?: string;
  dialogMessage?: string;
  settlement?: SpaSettlementResult;
  audioCachePath?: string;
}

export async function executeAction(
  page: Page,
  action: InteractionAction,
  target: LocatorStrategy | undefined,
  value: string | undefined,
  timeout: number
): Promise<ActionResult> {
  try {
    // Determine target text for action type detection
    let targetText: string | undefined;
    if (target) {
      if ("text" in target) targetText = target.text;
      else if ("label" in target) targetText = target.label;
      else if ("role" in target && "name" in target) targetText = target.name;
    }

    const actionType = detectActionType(action, value, targetText);
    const strategy = getWaitStrategy(actionType);

    // Capture URL before action for change detection
    const previousUrl = page.url();

    switch (action) {
      case "click": {
        if (!target) throw new Error("click requires a target element");
        const locator = resolveLocator(page, target);
        await locator.click({ timeout });
        const settlement = await waitForSpaSettlement(page, {
          ...strategy,
          previousUrl,
        });
        return { success: true, settlement };
      }

      case "fill": {
        if (!target) throw new Error("fill requires a target element");
        if (value === undefined) throw new Error("fill requires a value");
        const locator = resolveLocator(page, target);
        await locator.fill(value, { timeout });
        break;
      }

      case "select": {
        if (!target) throw new Error("select requires a target element");
        if (value === undefined) throw new Error("select requires a value");
        const locator = resolveLocator(page, target);
        await locator.selectOption(value, { timeout });
        break;
      }

      case "check": {
        if (!target) throw new Error("check requires a target element");
        const locator = resolveLocator(page, target);
        await locator.check({ timeout });
        break;
      }

      case "uncheck": {
        if (!target) throw new Error("uncheck requires a target element");
        const locator = resolveLocator(page, target);
        await locator.uncheck({ timeout });
        break;
      }

      case "hover": {
        if (!target) throw new Error("hover requires a target element");
        const locator = resolveLocator(page, target);
        await locator.hover({ timeout });
        break;
      }

      case "press_key": {
        if (value === undefined)
          throw new Error("press_key requires a value (key name)");
        if (target) {
          const locator = resolveLocator(page, target);
          await locator.press(value, { timeout });
        } else {
          await page.keyboard.press(value);
        }
        const settlement = await waitForSpaSettlement(page, {
          ...strategy,
          previousUrl,
        });
        return { success: true, settlement };
      }

      case "scroll": {
        const direction = value ?? "down";
        if (target) {
          const locator = resolveLocator(page, target);
          await locator.scrollIntoViewIfNeeded({ timeout });
        } else {
          const scrollMap: Record<string, [number, number]> = {
            down: [0, 500],
            up: [0, -500],
            left: [-500, 0],
            right: [500, 0],
          };
          const [x, y] = scrollMap[direction] ?? [0, 500];
          await page.evaluate(([sx, sy]) => window.scrollBy(sx, sy), [x, y]);
        }
        break;
      }

      case "navigate": {
        if (value === undefined)
          throw new Error("navigate requires a value (URL)");
        await page.goto(value, { waitUntil: "networkidle", timeout: 30000 });
        return {
          success: true,
          settlement: {
            urlChanged: page.url() !== previousUrl,
            previousUrl,
            currentUrl: page.url(),
            domMutationCount: 0,
            settledAfterMs: 0,
          },
        };
      }

      case "go_back": {
        await page.goBack({ waitUntil: "networkidle", timeout: 30000 });
        return {
          success: true,
          settlement: {
            urlChanged: page.url() !== previousUrl,
            previousUrl,
            currentUrl: page.url(),
            domMutationCount: 0,
            settledAfterMs: 0,
          },
        };
      }

      case "go_forward": {
        await page.goForward({ waitUntil: "networkidle", timeout: 30000 });
        return {
          success: true,
          settlement: {
            urlChanged: page.url() !== previousUrl,
            previousUrl,
            currentUrl: page.url(),
            domMutationCount: 0,
            settledAfterMs: 0,
          },
        };
      }

      case "wait": {
        if (value) {
          const ms = parseInt(value, 10);
          if (!isNaN(ms)) {
            await page.waitForTimeout(ms);
          } else {
            // Treat as CSS selector to wait for
            await page.waitForSelector(value, { timeout });
          }
        } else {
          await page.waitForLoadState("networkidle", { timeout });
        }
        break;
      }

      case "submit": {
        if (target) {
          const locator = resolveLocator(page, target);
          await locator.click({ timeout });
        } else {
          await page.keyboard.press("Enter");
        }
        const settlement = await waitForSpaSettlement(page, {
          ...strategy,
          previousUrl,
        });
        return { success: true, settlement };
      }

      case "send_audio": {
        if (!target)
          throw new Error(
            "send_audio requires a target (mic/record start button)"
          );

        // Parse optional config from value
        const config = value ? JSON.parse(value) : {};
        const recordDuration = config.recordDurationMs ?? 3000;
        let audioCachePath: string | undefined;

        // If ttsText is provided, generate real speech via Edge TTS
        // and inject it as the fake microphone source
        let adaptiveDuration = config.recordDurationMs ?? 3000;
        if (config.ttsText) {
          const { generateSpeech } = await import("./tts-service.js");
          const { ensureFakeAudioOverride } = await import("./fake-media.js");

          const speech = await generateSpeech(config.ttsText, config.ttsVoice);

          // Adapt recording duration: 1.5s playback delay + speech length + 1s buffer
          adaptiveDuration = Math.max(
            config.recordDurationMs ?? 0,
            speech.durationMs + 2500
          );

          // Cache the TTS audio for traceability
          try {
            const cacheDir = join(process.cwd(), "artifacts", "audio-cache");
            mkdirSync(cacheDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `tts-${timestamp}.mp3`;
            audioCachePath = join(cacheDir, filename);
            writeFileSync(audioCachePath, speech.buffer);
            writeFileSync(
              join(cacheDir, `tts-${timestamp}.meta.json`),
              JSON.stringify({
                timestamp: new Date().toISOString(),
                ttsText: config.ttsText,
                ttsVoice: speech.voice,
                audioDurationMs: speech.durationMs,
                audioSizeBytes: speech.buffer.length,
                recordDurationMs: adaptiveDuration,
                audioFile: filename,
              }, null, 2)
            );
          } catch {
            // Caching is best-effort
          }

          // Install override (if needed) and set the TTS audio as mic source
          await ensureFakeAudioOverride(page, speech.buffer.toString("base64"));
        }

        // 1. Click the mic/record button to start recording
        const startLocator = resolveLocator(page, target);
        await startLocator.click({ timeout });

        // 2. Wait for the recording duration (adaptive if TTS was used)
        await page.waitForTimeout(adaptiveDuration);

        // 3. Click stop button or toggle the same button
        if (config.stopTarget) {
          const stopLocator = resolveLocator(page, config.stopTarget);
          await stopLocator.click({ timeout });
        } else {
          await startLocator.click({ timeout });
        }

        // 4. Wait for transcription/result if selector provided
        if (config.waitForSelector) {
          await page.waitForSelector(config.waitForSelector, {
            timeout: config.waitTimeout ?? 15000,
          });
        }

        // 5. Wait for SPA settlement after the full flow
        const audioSettlement = await waitForSpaSettlement(page, {
          ...getWaitStrategy("submit"),
          previousUrl,
        });
        return {
          success: true,
          settlement: audioSettlement,
          ...(audioCachePath && { audioCachePath }),
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
