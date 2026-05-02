import aiConfig from "#config/ai.js";
import type { ITTSAdapter, TTSSynthesizeOptions, TTSSynthesizeBufferResult } from "#app/services/ai/types.js";

interface MinimalFetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  body: { getReader(): ReadableStreamDefaultReader<Uint8Array> } | null;
}

const cfg = aiConfig.inworld;

export const inworldTtsAdapter: ITTSAdapter = {
  isConfigured(): boolean {
    return cfg.apiKey !== "";
  },

  get model(): string {
    return cfg.ttsModel;
  },

  async *synthesizeStream(opts: TTSSynthesizeOptions): AsyncGenerator<string, void, undefined> {
    if (cfg.apiKey === "") {
      throw new Error("Inworld TTS is not configured");
    }

    const response = (await fetch("https://api.inworld.ai/tts/v1/voice:stream", {
      method: "POST",
      headers: {
        Authorization: `Basic ${cfg.apiKey}`,
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
      body: JSON.stringify({
        text: opts.text,
        voiceId: opts.voice ?? cfg.ttsVoice,
        modelId: cfg.ttsModel,
        audio_config: {
          audio_encoding: "LINEAR16",
          sample_rate_hertz: cfg.ttsSampleRate,
        },
      }),
    })) as unknown as MinimalFetchResponse;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inworld TTS error ${String(response.status)}: ${errorText.slice(0, 200)}`);
    }

    if (response.body === null) {
      throw new Error("Inworld TTS response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const extractAudioContent = (line: string): string | null => {
      const trimmed = line.trim();
      if (trimmed === "") return null;

      const jsonLine = trimmed.startsWith("data:")
        ? trimmed.slice(5).trim()
        : trimmed;
      if (jsonLine === "" || jsonLine === "[DONE]") return null;

      try {
        const json = JSON.parse(jsonLine) as unknown;
        if (typeof json !== "object" || json === null) return null;
        const result = (json as Record<string, unknown>)["result"];
        if (typeof result !== "object" || result === null) return null;
        const audioContent = (result as Record<string, unknown>)["audioContent"];
        return typeof audioContent === "string" && audioContent.length > 0
          ? audioContent
          : null;
      } catch {
        return null;
      }
    };

    let prevChunk: string | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const audioContent = extractAudioContent(line);
          if (audioContent !== null && audioContent !== prevChunk) {
            prevChunk = audioContent;
            yield audioContent;
          }
        }
      }

      const tail = decoder.decode();
      if (tail.length > 0) buffer += tail;
      const lastAudioContent = extractAudioContent(buffer);
      if (lastAudioContent !== null && lastAudioContent !== prevChunk) {
        yield lastAudioContent;
      }
    } finally {
      reader.releaseLock();
    }
  },

  async synthesizeToBuffer(opts: TTSSynthesizeOptions): Promise<TTSSynthesizeBufferResult> {
    if (cfg.apiKey === "") {
      throw new Error("Inworld TTS is not configured");
    }

    const response = (await fetch("https://api.inworld.ai/tts/v1/voice:stream", {
      method: "POST",
      headers: {
        Authorization: `Basic ${cfg.apiKey}`,
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
      body: JSON.stringify({
        text: opts.text,
        voiceId: opts.voice ?? cfg.ttsVoice,
        modelId: cfg.ttsModel,
        audio_config: {
          audio_encoding: "MP3",
        },
      }),
    })) as unknown as MinimalFetchResponse;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inworld TTS error ${String(response.status)}: ${errorText.slice(0, 200)}`);
    }

    if (response.body === null) {
      throw new Error("Inworld TTS response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const mp3Chunks: Buffer[] = [];

    const extractAudioContent = (line: string): string | null => {
      const trimmed = line.trim();
      if (trimmed === "") return null;
      const jsonLine = trimmed.startsWith("data:")
        ? trimmed.slice(5).trim()
        : trimmed;
      if (jsonLine === "" || jsonLine === "[DONE]") return null;
      try {
        const json = JSON.parse(jsonLine) as unknown;
        if (typeof json !== "object" || json === null) return null;
        const result = (json as Record<string, unknown>)["result"];
        if (typeof result !== "object" || result === null) return null;
        const audioContent = (result as Record<string, unknown>)["audioContent"];
        return typeof audioContent === "string" && audioContent.length > 0
          ? audioContent
          : null;
      } catch {
        return null;
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const audioContent = extractAudioContent(line);
          if (audioContent !== null) {
            mp3Chunks.push(Buffer.from(audioContent, "base64"));
          }
        }
      }
      const tail = decoder.decode();
      if (tail.length > 0) buffer += tail;
      const lastAudioContent = extractAudioContent(buffer);
      if (lastAudioContent !== null) {
        mp3Chunks.push(Buffer.from(lastAudioContent, "base64"));
      }
    } finally {
      reader.releaseLock();
    }

    return {
      buffer: Buffer.concat(mp3Chunks),
      contentType: "audio/mpeg",
    };
  },
};
