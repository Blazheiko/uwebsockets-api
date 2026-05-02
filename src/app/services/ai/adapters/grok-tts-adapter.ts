import WebSocket from 'ws';
import aiConfig from '#config/ai.js';
import { normalizeLanguageForGrok, resolveGrokVoice } from '#app/services/ai/grok-tts-helpers.js';
import type { ITTSAdapter, TTSSynthesizeOptions, TTSSynthesizeBufferResult } from '#app/services/ai/types.js';

const GROK_TTS_WS_URL = 'wss://api.x.ai/v1/tts';
const GROK_TTS_HTTP_URL = 'https://api.x.ai/v1/tts';

interface GrokWsMessage {
  type: string;
  delta?: string;
  trace_id?: string;
  error?: string;
}

interface MinimalFetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export const grokTtsAdapter: ITTSAdapter = {
  isConfigured(): boolean {
    return aiConfig.grokTts.apiKey !== '';
  },

  get model(): string {
    return 'grok-tts';
  },

  async *synthesizeStream(opts: TTSSynthesizeOptions): AsyncGenerator<string, void, undefined> {
    const cfg = aiConfig.grokTts;
    if (cfg.apiKey === '') {
      throw new Error('Grok TTS is not configured');
    }

    const voice = resolveGrokVoice(opts.voice, cfg.defaultVoice);
    const language = normalizeLanguageForGrok(opts.language ?? '');
    const sampleRate = cfg.sampleRate;

    const url = new URL(GROK_TTS_WS_URL);
    url.searchParams.set('voice', voice);
    url.searchParams.set('language', language);
    url.searchParams.set('codec', 'pcm');
    url.searchParams.set('sample_rate', String(sampleRate));

    const ws = new WebSocket(url.toString(), {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });

    const queue: (string | Error | null)[] = [];
    let notify: (() => void) | null = null;

    function enqueue(item: string | Error | null): void {
      queue.push(item);
      notify?.();
      notify = null;
    }

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as GrokWsMessage;
        if (msg.type === 'audio.delta' && typeof msg.delta === 'string' && msg.delta.length > 0) {
          enqueue(msg.delta);
        } else if (msg.type === 'audio.done') {
          enqueue(null);
        } else if (msg.type === 'error') {
          enqueue(new Error(`Grok TTS error: ${msg.error ?? 'unknown'}`));
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('error', (err: Error) => {
      enqueue(err);
    });

    ws.on('close', () => {
      // Ensure stream terminates if audio.done was not received
      if (queue.length === 0 || queue[queue.length - 1] !== null) {
        enqueue(null);
      }
    });

    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    // Send the text
    ws.send(JSON.stringify({ type: 'text.delta', delta: opts.text }));
    ws.send(JSON.stringify({ type: 'text.done' }));

    // Yield chunks
    try {
      while (true) {
        if (queue.length > 0) {
          const item = queue.shift()!;
          if (item === null) break;
          if (item instanceof Error) throw item;
          yield item;
        } else {
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
        }
      }
    } finally {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  },

  async synthesizeToBuffer(opts: TTSSynthesizeOptions): Promise<TTSSynthesizeBufferResult> {
    const cfg = aiConfig.grokTts;
    if (cfg.apiKey === '') {
      throw new Error('Grok TTS is not configured');
    }

    const voice = resolveGrokVoice(opts.voice, cfg.defaultVoice);
    const language = normalizeLanguageForGrok(opts.language ?? '');

    const response = (await fetch(GROK_TTS_HTTP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: opts.text,
        voice_id: voice,
        language,
        output_format: { codec: 'mp3', sample_rate: cfg.sampleRate },
      }),
    })) as unknown as MinimalFetchResponse;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok TTS HTTP error ${String(response.status)}: ${errorText.slice(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: 'audio/mpeg',
    };
  },
};
