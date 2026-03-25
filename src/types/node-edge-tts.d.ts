declare module "node-edge-tts" {
  interface EdgeTTSOptions {
    voice?: string;
    lang?: string;
    outputFormat?: string;
    saveSubtitles?: boolean;
    proxy?: string;
    pitch?: string;
    rate?: string;
    volume?: string;
    timeout?: number;
  }

  export class EdgeTTS {
    constructor(options?: EdgeTTSOptions);
    ttsPromise(text: string, filePath: string): Promise<void>;
  }
}
