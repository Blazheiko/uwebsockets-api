import { env } from "node:process";

const translatorConfig = Object.freeze({
  openaiApiKey: env["OPENAI_API_KEY"] ?? "",
  openaiApiUrl: "https://api.openai.com/v1/chat/completions",
  openaiModel: env["TRANSLATOR_OPENAI_MODEL"] ?? "gpt-4o-mini",
  realtimeModel: env["TRANSLATOR_REALTIME_MODEL"] ?? "gpt-realtime",
  realtimeVoice: env["TRANSLATOR_REALTIME_VOICE"] ?? "marin",
  realtimeApiUrl: "https://api.openai.com/v1/realtime",
  maxSourceTextLength: 2000,
});

export default translatorConfig;
