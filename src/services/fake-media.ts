import type { Page } from "playwright";

/**
 * Generates a minimal WAV file buffer with a sine wave tone.
 * Pure TypeScript, no external dependencies.
 */
export function generateToneWav(
  durationMs: number = 3000,
  frequency: number = 440,
  sampleRate: number = 16000
): Buffer {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate sine wave samples
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 16000)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

/**
 * Builds a JavaScript snippet that overrides navigator.mediaDevices.getUserMedia
 * to return a MediaStream sourced from decoded audio data.
 *
 * Idempotent: re-running only updates the audio data, doesn't re-install the override.
 *
 * Key fixes vs. original:
 * - Resumes suspended AudioContext (headless Chrome starts suspended)
 * - Idempotency guard prevents chained overrides
 */
function buildMediaOverrideScript(audioBase64: string): string {
  return `
    (function() {
      window.__fakeAudioBase64 = "${audioBase64}";

      // Idempotent: don't re-install the override, just update the audio data
      if (window.__fakeMediaOverrideInstalled) return;
      window.__fakeMediaOverrideInstalled = true;

      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

      navigator.mediaDevices.getUserMedia = async function(constraints) {
        // Only override audio requests
        if (!constraints || !constraints.audio) {
          return originalGetUserMedia(constraints);
        }

        try {
          const base64 = window.__fakeAudioBase64;
          if (!base64) {
            console.warn('[fake-media] No audio data set, falling back to real getUserMedia');
            return originalGetUserMedia(constraints);
          }

          // Decode base64 to ArrayBuffer
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Create AudioContext and ensure it's running
          const audioContext = new AudioContext();
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }

          const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));

          // Create a MediaStream from the audio buffer
          const destination = audioContext.createMediaStreamDestination();
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = false;
          source.connect(destination);
          source.start();

          console.log('[fake-media] Audio injected (' + audioBuffer.duration.toFixed(1) + 's)');
          return destination.stream;
        } catch (e) {
          console.warn('[fake-media] Override failed, falling back to real getUserMedia:', e);
          return originalGetUserMedia(constraints);
        }
      };
    })();
  `;
}

/**
 * Injects a fake getUserMedia override into a page.
 * Uses addInitScript so it persists across navigations.
 * Call this at session creation time.
 */
export async function injectFakeMediaOverride(
  page: Page,
  audioBase64?: string
): Promise<void> {
  const audio = audioBase64 ?? generateToneWav(3000).toString("base64");
  const script = buildMediaOverrideScript(audio);
  await page.addInitScript({ content: script });
}

/**
 * Ensures the fake media override is installed and the audio data is set.
 * Works whether or not the session was started with fakeMedia: true.
 *
 * - If override already installed (via addInitScript or prior call): just updates audio data
 * - If override not installed: installs it via page.evaluate (one-time, won't survive navigation)
 *
 * Call this in send_audio before clicking the mic button.
 */
export async function ensureFakeAudioOverride(
  page: Page,
  audioBase64: string
): Promise<void> {
  const script = buildMediaOverrideScript(audioBase64);
  await page.evaluate(script);
}
