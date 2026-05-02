export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type TextUsageCompleteHandler = (
  usage: TokenUsage,
  model: string,
  finalPrompt: string,
) => void;

export interface TextStreamOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  modelOverride?: string | undefined;
  /**
   * Optional tool-calling handler. When provided, the adapter will pass tools
   * to the LLM and invoke onCall() for each tool call made by the model.
   * Adapters that do not support tool calling must silently ignore this field.
   */
  toolCallHandler?: import('#app/services/actions/types.js').ToolCallHandler;
}

export interface ITextAdapter {
  isConfigured(): boolean;
  get model(): string;
  streamText(
    opts: TextStreamOptions,
    onComplete?: TextUsageCompleteHandler,
  ): AsyncGenerator<string, string, undefined>;
}

export function buildFinalTextPrompt(opts: TextStreamOptions): string {
  return [`[system]`, opts.systemPrompt, ``, `[user]`, opts.userPrompt].join("\n");
}

export interface ImageGenerateResult {
  imageBase64: string;
  mimeType: string;
}

export interface IImageAdapter {
  isConfigured(): boolean;
  get model(): string;
  generateImage(prompt: string): Promise<ImageGenerateResult>;
  editImage(prompt: string, imageDataUrl: string): Promise<ImageGenerateResult>;
}

export interface AudioTranscribeOptions {
  audioBuffer: ArrayBuffer;
  mimeType: string;
  language?: string;
}

export interface IAudioAdapter {
  isConfigured(): boolean;
  get model(): string;
  transcribe(opts: AudioTranscribeOptions): Promise<string>;
}

export interface TTSSynthesizeOptions {
  text: string;
  voice?: string;
  language?: string;
}

export interface TTSSynthesizeBufferResult {
  buffer: Buffer;
  contentType: string;
}

export interface ITTSAdapter {
  isConfigured(): boolean;
  get model(): string;
  synthesizeStream(opts: TTSSynthesizeOptions): AsyncGenerator<string, void, undefined>;
  synthesizeToBuffer(opts: TTSSynthesizeOptions): Promise<TTSSynthesizeBufferResult>;
}
