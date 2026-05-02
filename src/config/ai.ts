import { env } from "node:process";

const aiConfig = Object.freeze({
  drivers: {
    text: env["AI_TEXT_DRIVER"] ?? "mistralai",
    image: env["AI_IMAGE_DRIVER"] ?? "xai",
    audio: env["AI_AUDIO_DRIVER"] ?? "mistralai",
  },
  providers: {
    xai: {
      apiKey: env["XAI_API_KEY"] ?? "",
      chatModel: env["XAI_CHAT_MODEL"] ?? "grok-4-1-fast-non-reasoning",
      imageModel: env["XAI_IMAGE_MODEL"] ?? "grok-imagine-image",
      imageApiUrl:
        env["XAI_IMAGE_API_URL"] ?? "https://api.x.ai/v1/images/generations",
      imageEditApiUrl:
        env["XAI_IMAGE_EDIT_API_URL"] ?? "https://api.x.ai/v1/images/edits",
      imageFormat: env["XAI_IMAGE_FORMAT"] ?? "base64",
    },
    mistralai: {
      apiKey: env["MISTRAL_API_KEY"] ?? "",
      textModel: env["MISTRAL_TEXT_MODEL"] ?? "mistral-medium-latest", //"mistral-small-latest",
      audioModel: env["MISTRAL_AUDIO_MODEL"] ?? "voxtral-mini-latest",
    },
  },
  inworld: {
    apiKey: env["INWORLD_API_KEY"] ?? "",
    ttsModel: env["INWORLD_TTS_MODEL"] ?? "inworld-tts-1.5-max",
    ttsVoice: env["INWORLD_TTS_VOICE"] ?? "Ashley",
    ttsSampleRate: Number(env["INWORLD_TTS_SAMPLE_RATE"] ?? 24000),
  },
  grokTts: {
    apiKey: env["GROK_TTS_API_KEY"] ?? env["XAI_API_KEY"] ?? "",
    defaultVoice: env["GROK_TTS_VOICE"] ?? "eve",
    studyVoice: env["GROK_STUDY_VOICE"] ?? env["GROK_TTS_VOICE"] ?? "eve",
    sampleRate: Number(env["GROK_TTS_SAMPLE_RATE"] ?? 24000),
    defaultLanguage: env["GROK_TTS_LANGUAGE"] ?? "auto",
  },
  openaiEmbedding: {
      apiKey: env['OPENAI_API_KEY'] ?? '',
      model: env['OPENAI_EMBEDDING_MODEL'] ?? 'text-embedding-3-small',
      dimensions: Number(env['OPENAI_EMBEDDING_DIMENSIONS'] ?? 1536),
  },
  pronunciation: {
    passThreshold: Number(env["PRONUNCIATION_PASS_THRESHOLD"] ?? 0.8),
    skipAfterAttempts: Number(env["PRONUNCIATION_SKIP_AFTER_ATTEMPTS"] ?? 3),
    localWindowMs: Number(env["PRONUNCIATION_RATE_LIMIT_WINDOW_MS"] ?? 2000),
    globalWindowMs: Number(env["PRONUNCIATION_GLOBAL_RATE_LIMIT_WINDOW_MS"] ?? 60000),
    globalMaxRequests: Number(env["PRONUNCIATION_GLOBAL_RATE_LIMIT_MAX_REQUESTS"] ?? 30),
  },
  maxPromptLength: Number(env["AI_AVATAR_PROMPT_MAX_LENGTH"] ?? 500),
  avatarStylePrompt:
    env["AI_AVATAR_STYLE_PROMPT"] ??
    "Style requirements: centered profile avatar, clean background, high contrast, no text, no watermark, square framing.",
  chatImageEditStylePrompt:
    env["AI_CHAT_IMAGE_EDIT_STYLE_PROMPT"] ??
    "Edit only what the user asked. Keep subject identity and original composition, no text or watermark.",
});

export default aiConfig;
