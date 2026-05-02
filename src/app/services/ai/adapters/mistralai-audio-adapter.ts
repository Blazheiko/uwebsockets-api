import { Mistral } from "@mistralai/mistralai";
import aiConfig from "#config/ai.js";
import type {
  IAudioAdapter,
  AudioTranscribeOptions,
} from "#app/services/ai/types.js";

const cfg = aiConfig.providers.mistralai;
const client = cfg.apiKey !== "" ? new Mistral({ apiKey: cfg.apiKey }) : null;

export const mistralaiAudioAdapter: IAudioAdapter = {
  isConfigured(): boolean {
    return cfg.apiKey !== "";
  },

  get model(): string {
    return cfg.audioModel;
  },

  async transcribe(opts: AudioTranscribeOptions): Promise<string> {
    if (client === null) {
      throw new Error("MistralAI is not configured");
    }

    const ext = opts.mimeType.split("/")[1] ?? "wav";
    const fileName = `audio.${ext}`;
    // Pass a File object so the SDK uses isBlobLike path and preserves the
    // correct MIME type. The { fileName, content } path derives content-type
    // from the extension via a lookup table that is missing webm/ogg entries.
    const file = new File([new Uint8Array(opts.audioBuffer)], fileName, { type: opts.mimeType });

    const result = await client.audio.transcriptions.complete({
      model: cfg.audioModel,
      file,
      ...(opts.language !== undefined && opts.language.length > 0 ? { language: opts.language } : {}),
    });

    return result.text;
  },
};
