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
 * Uses window.__fakeAudioBase64 so audio can be updated dynamically.
 */
function buildMediaOverrideScript(audioBase64: string): string {
  return `
    (function() {
      window.__fakeAudioBase64 = "${audioBase64}";
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

      navigator.mediaDevices.getUserMedia = async function(constraints) {
        // Only override audio requests
        if (!constraints || !constraints.audio) {
          return originalGetUserMedia(constraints);
        }

        try {
          const base64 = window.__fakeAudioBase64;
          // Decode base64 to ArrayBuffer
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          // Create AudioContext and decode the audio data (WAV or MP3)
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));

          // Create a MediaStream from the audio buffer
          const destination = audioContext.createMediaStreamDestination();
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = false;
          source.connect(destination);
          source.start();

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
 * The override returns a MediaStream sourced from the provided audio data.
 * Uses addInitScript so it persists across navigations.
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
 * Updates the fake audio source on a page that already has the override injected.
 * Call this before each send_audio to change what the microphone "hears".
 */
export async function updateFakeAudio(
  page: Page,
  audioBase64: string
): Promise<void> {
  await page.evaluate((b64) => {
    (window as any).__fakeAudioBase64 = b64;
  }, audioBase64);
}
