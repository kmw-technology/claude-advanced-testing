import { EdgeTTS } from "node-edge-tts";
import { readFileSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export interface SpeechResult {
  buffer: Buffer;
  durationMs: number;
  voice: string;
}

// Prefix that Edge TTS renders as ~1s of silence.
// Compensates for MP3 encoder delay that decodeAudioData doesn't skip.
const SILENCE_PREFIX = ". . . ";

/**
 * Estimates MP3 audio duration from file size and bitrate.
 * For Edge TTS with 48kbps mono MP3: duration ≈ fileSize / (48000/8)
 */
function estimateMp3DurationMs(buffer: Buffer, bitrate: number = 48000): number {
  return Math.ceil((buffer.length * 8 * 1000) / bitrate);
}

/**
 * Generates real speech audio from text using Microsoft Edge TTS.
 * Free, no API key required. Supports 400+ voices in 100+ languages.
 *
 * Prepends a short silence prefix to the text so the MP3 encoder delay
 * falls into the silence rather than clipping the speech content.
 *
 * Popular voices:
 *   German:  de-DE-KatjaNeural, de-DE-ConradNeural
 *   English: en-US-AriaNeural, en-US-GuyNeural, en-GB-SoniaNeural
 *   French:  fr-FR-DeniseNeural, fr-FR-HenriNeural
 *   Spanish: es-ES-ElviraNeural, es-ES-AlvaroNeural
 *
 * Returns the audio buffer AND estimated duration for adaptive recording.
 */
export async function generateSpeech(
  text: string,
  voice: string = "en-US-AriaNeural"
): Promise<SpeechResult> {
  const lang = voice.includes("-") ? voice.substring(0, 5) : "en-US";

  const tts = new EdgeTTS({
    voice,
    lang,
    outputFormat: "audio-24khz-48kbitrate-mono-mp3",
  });

  const tempPath = join(
    tmpdir(),
    `edge-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
  );

  try {
    await tts.ttsPromise(SILENCE_PREFIX + text, tempPath);
    const buffer = readFileSync(tempPath);
    const durationMs = estimateMp3DurationMs(buffer);
    return { buffer, durationMs, voice };
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // cleanup is best-effort
    }
  }
}
