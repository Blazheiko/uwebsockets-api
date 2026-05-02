import aiConfig from "#config/ai.js";
import { xaiTextAdapter } from "#app/services/ai/adapters/xai-text-adapter.js";
import { xaiImageAdapter } from "#app/services/ai/adapters/xai-image-adapter.js";
import { mistralaiTextAdapter } from "#app/services/ai/adapters/mistralai-text-adapter.js";
import { mistralaiAudioAdapter } from "#app/services/ai/adapters/mistralai-audio-adapter.js";
import { grokTtsAdapter } from "#app/services/ai/adapters/grok-tts-adapter.js";
import type {
  ITextAdapter,
  IImageAdapter,
  IAudioAdapter,
  ITTSAdapter,
} from "#app/services/ai/types.js";

function createTextAdapter(): ITextAdapter {
  if (aiConfig.drivers.text === "xai") {
    return xaiTextAdapter;
  }
  return mistralaiTextAdapter;
}

function createImageAdapter(): IImageAdapter {
  return xaiImageAdapter;
}

function createAudioAdapter(): IAudioAdapter {
  return mistralaiAudioAdapter;
}

function createTtsAdapter(): ITTSAdapter {
  return grokTtsAdapter;
}

export const textAdapter: ITextAdapter = createTextAdapter();
export const imageAdapter: IImageAdapter = createImageAdapter();
export const audioAdapter: IAudioAdapter = createAudioAdapter();
export const ttsAdapter: ITTSAdapter = createTtsAdapter();

/**
 * Returns the appropriate text adapter based on model name from llm_system_prompts.
 * If model is null/undefined/empty — returns the default adapter.
 * If model contains "grok" — returns xai adapter.
 * If model contains "mistral" — returns mistral adapter.
 * Otherwise — returns the default adapter.
 */
export function getTextAdapterForModel(model: string | null | undefined): ITextAdapter {
  if (model === null || model === undefined || model.trim() === "") {
    return textAdapter;
  }
  const lower = model.toLowerCase();
  if (lower.includes("grok")) {
    return xaiTextAdapter;
  }
  if (lower.includes("mistral")) {
    return mistralaiTextAdapter;
  }
  return textAdapter;
}
