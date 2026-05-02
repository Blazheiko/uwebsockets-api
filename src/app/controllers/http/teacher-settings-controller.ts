import type { HttpContext } from "#vendor/types/types.js";
import { getTypedPayload } from "#vendor/utils/validation/get-typed-payload.js";
import { teacherSettingsRepository } from "#app/repositories/teacher-settings-repository.js";
import type { TeacherSaveSettingsInput } from "shared/schemas";
import { getGrokVoices, getDefaultGrokVoice } from "#app/services/ai/grok-voices-service.js";
import { ttsAdapter } from "#app/services/ai/ai-provider.js";
import aiConfig from "#config/ai.js";
import type {
  TeacherGetSettingsResponse,
  TeacherSaveSettingsResponse,
  TeacherGetVoicesResponse,
  TeacherVoicePreviewResponse,
} from "shared";
import { resolveBrowserLanguageFromContext } from "#app/services/shared/browser-language.js";
import {
  DEFAULT_LEARNING_LANGUAGE,
  normalizeLearningLanguage,
  normalizeNativeLanguage,
  validateAndNormalizeLearningLanguage,
  validateAndNormalizeNativeLanguage,
} from "#app/services/shared/teacher-settings-language.js";

const PREVIEW_TEXT_BY_LANG: Record<string, string> = {
  en: "Hello! I'm here to help you practice your language skills.",
  ru: "Привет! Я здесь, чтобы помочь тебе практиковать языковые навыки.",
  uk: "Привіт! Я тут, щоб допомогти тобі практикувати мовні навички.",
  pl: "Cześć! Jestem tu, aby pomóc ci ćwiczyć umiejętności językowe.",
  de: "Hallo! Ich bin hier, um dir beim Üben deiner Sprachkenntnisse zu helfen.",
  fr: "Bonjour! Je suis ici pour t'aider à pratiquer tes compétences linguistiques.",
  es: "¡Hola! Estoy aquí para ayudarte a practicar tus habilidades lingüísticas.",
  it: "Ciao! Sono qui per aiutarti a praticare le tue abilità linguistiche.",
  pt: "Olá! Estou aqui para te ajudar a praticar suas habilidades linguísticas.",
  zh: "你好！我在这里帮助你练习语言技能。",
  ja: "こんにちは！言語スキルの練習をお手伝いします。",
  ko: "안녕하세요! 언어 능력을 연습하는 데 도움을 드리겠습니다.",
  ar: "مرحباً! أنا هنا لمساعدتك على ممارسة مهاراتك اللغوية.",
  tr: "Merhaba! Dil becerilerini geliştirmene yardımcı olmak için buradayım.",
  nl: "Hallo! Ik ben hier om je te helpen je taalvaardigheden te oefenen.",
  sv: "Hej! Jag är här för att hjälpa dig att öva dina språkkunskaper.",
  cs: "Ahoj! Jsem tu, abych ti pomohl procvičovat jazykové dovednosti.",
  hi: "नमस्ते! मैं यहाँ आपकी भाषा कौशल का अभ्यास करने में मदद करने के लिए हूँ।",
  ga: "Dia duit! Táim anseo chun cabhrú leat do scileanna teanga a chleachtadh.",
};

function getPreviewText(lang: string): string {
  return PREVIEW_TEXT_BY_LANG[lang] ?? PREVIEW_TEXT_BY_LANG["en"] ?? "Hello!";
}

function writeUint32LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
  buf[offset + 3] = (value >> 24) & 0xff;
}

function writeUint16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function buildWav(pcmData: Uint8Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const wav = new Uint8Array(44 + dataSize);
  wav[0] = 0x52; wav[1] = 0x49; wav[2] = 0x46; wav[3] = 0x46; // "RIFF"
  writeUint32LE(wav, 4, 36 + dataSize);
  wav[8] = 0x57; wav[9] = 0x41; wav[10] = 0x56; wav[11] = 0x45; // "WAVE"
  wav[12] = 0x66; wav[13] = 0x6d; wav[14] = 0x74; wav[15] = 0x20; // "fmt "
  writeUint32LE(wav, 16, 16);
  writeUint16LE(wav, 20, 1); // PCM
  writeUint16LE(wav, 22, numChannels);
  writeUint32LE(wav, 24, sampleRate);
  writeUint32LE(wav, 28, byteRate);
  writeUint16LE(wav, 32, blockAlign);
  writeUint16LE(wav, 34, bitsPerSample);
  wav[36] = 0x64; wav[37] = 0x61; wav[38] = 0x74; wav[39] = 0x61; // "data"
  writeUint32LE(wav, 40, dataSize);
  wav.set(pcmData, 44);
  return wav;
}

function unwrapPcm(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 44) return bytes;
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return bytes;
  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[pos] ?? 0, bytes[pos + 1] ?? 0, bytes[pos + 2] ?? 0, bytes[pos + 3] ?? 0);
    const size = (
      ((bytes[pos + 4] ?? 0)) |
      ((bytes[pos + 5] ?? 0) << 8) |
      ((bytes[pos + 6] ?? 0) << 16) |
      ((bytes[pos + 7] ?? 0) << 24)
    ) >>> 0;
    if (id === "data") return bytes.subarray(pos + 8, pos + 8 + size);
    pos += 8 + size + (size % 2);
  }
  return bytes;
}

async function collectPreviewAudio(voiceId: string, lang: string): Promise<string | null> {
  const chunks: Uint8Array[] = [];
  try {
    for await (const b64 of ttsAdapter.synthesizeStream({ text: getPreviewText(lang), voice: voiceId, language: lang })) {
      const raw = Buffer.from(b64, "base64");
      const pcm = unwrapPcm(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
      if (pcm.length > 0) chunks.push(pcm);
    }
  } catch {
    return null;
  }
  if (chunks.length === 0) return null;
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const combined = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { combined.set(c, off); off += c.length; }
  const wav = buildWav(combined, aiConfig.grokTts.sampleRate);
  return Buffer.from(wav).toString("base64");
}

function resolveUserId(context: HttpContext): bigint | null {
  if (!context.auth.check()) {
    context.responseData.status = 401;
    return null;
  }
  const userId = context.auth.getUserId();
  if (userId === null) {
    context.responseData.status = 401;
    return null;
  }
  return BigInt(userId);
}

export default {
  async getSettings(context: HttpContext): Promise<TeacherGetSettingsResponse> {
    context.logger.info("teacher getSettings handler");
    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }
    const settings = await teacherSettingsRepository.findByUserId(userId);
    const browserNativeLanguage = resolveBrowserLanguageFromContext(context);
    const data =
      settings !== undefined
        ? {
            langNative: normalizeNativeLanguage(
              settings.langNative,
              browserNativeLanguage,
            ),
            langLearning: normalizeLearningLanguage(settings.langLearning),
            topic: settings.topic,
            teacherVoice: settings.teacherVoice,
            teacherVoiceGender: settings.teacherVoiceGender,
            teacherName: settings.teacherName,
            ownVoice: settings.ownVoice,
            ownVoiceGender: settings.ownVoiceGender,
            proficiencyLevel: settings.proficiencyLevel,
            learningGoal: settings.learningGoal,
          }
        : {
            langNative: browserNativeLanguage,
            langLearning: DEFAULT_LEARNING_LANGUAGE,
            topic: "everyday",
            teacherVoice: aiConfig.grokTts.defaultVoice,
            teacherVoiceGender: "unknown",
            teacherName: "",
            ownVoice: aiConfig.grokTts.defaultVoice,
            ownVoiceGender: "unknown",
            proficiencyLevel: "beginner",
            learningGoal: "",
          };
    return { status: "success", data };
  },

  async saveSettings(
    context: HttpContext<TeacherSaveSettingsInput>,
  ): Promise<TeacherSaveSettingsResponse> {
    context.logger.info("teacher saveSettings handler");
    const userId = resolveUserId(context);
    if (userId === null) {
      return { status: "error", message: "Unauthorized" };
    }
    const payload = getTypedPayload(context);
    const browserNativeLanguage = resolveBrowserLanguageFromContext(context);
    const langLearningResult = validateAndNormalizeLearningLanguage(
      payload.langLearning,
    );
    if (!langLearningResult.ok) {
      context.responseData.status = 400;
      return {
        status: "error",
        message: "Invalid learning language",
      };
    }

    const langNativeResult = validateAndNormalizeNativeLanguage(
      payload.langNative,
      browserNativeLanguage,
    );
    if (!langNativeResult.ok) {
      context.responseData.status = 400;
      return {
        status: "error",
        message: "Invalid native language",
      };
    }

    const langNative = langNativeResult.value;
    const langLearning = langLearningResult.value;
    if (langLearning === langNative) {
      context.responseData.status = 400;
      return {
        status: "error",
        message: "Learning language and native language must be different",
      };
    }
    const topic = payload.topic ?? "everyday";
    const hasExplicitTeacherVoice =
      payload.teacherVoice !== undefined && payload.teacherVoice !== "";
    const hasExplicitOwnVoice =
      payload.ownVoice !== undefined && payload.ownVoice !== "";

    let teacherVoice: string;
    let teacherVoiceGender: string;
    let teacherName: string;
    let ownVoice: string;
    let ownVoiceGender: string;

    if (hasExplicitTeacherVoice) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- narrowed by hasExplicitTeacherVoice
      teacherVoice = payload.teacherVoice!;
      teacherVoiceGender = payload.teacherVoiceGender ?? "unknown";
      teacherName = payload.teacherName ?? "";
    } else {
      const defaultVoice = getDefaultGrokVoice();
      teacherVoice = defaultVoice.voiceId;
      teacherVoiceGender = defaultVoice.gender;
      teacherName = defaultVoice.displayName;
    }

    if (hasExplicitOwnVoice) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- narrowed by hasExplicitOwnVoice
      ownVoice = payload.ownVoice!;
      ownVoiceGender = payload.ownVoiceGender ?? "unknown";
    } else {
      const defaultOwnVoice = getDefaultGrokVoice();
      ownVoice = defaultOwnVoice.voiceId;
      ownVoiceGender = defaultOwnVoice.gender;
    }
    const proficiencyLevel = payload.proficiencyLevel ?? "beginner";
    const learningGoal = payload.learningGoal ?? "";

    const settings = await teacherSettingsRepository.upsert(userId, {
      langNative,
      langLearning,
      topic,
      teacherVoice,
      teacherVoiceGender,
      teacherName,
      ownVoice,
      ownVoiceGender,
      proficiencyLevel,
      learningGoal,
    });

    return {
      status: "success",
      data: {
        langNative: settings.langNative,
        langLearning: settings.langLearning,
        topic: settings.topic,
        teacherVoice: settings.teacherVoice,
        teacherVoiceGender: settings.teacherVoiceGender,
        teacherName: settings.teacherName,
        ownVoice: settings.ownVoice,
        ownVoiceGender: settings.ownVoiceGender,
        proficiencyLevel: settings.proficiencyLevel,
        learningGoal: settings.learningGoal,
      },
    };
  },

  async getVoices(context: HttpContext): Promise<TeacherGetVoicesResponse> {
    context.logger.info("teacher getVoices handler");
    const voices = getGrokVoices();
    return { status: "success", data: voices };
  },

  async previewVoice(context: HttpContext): Promise<TeacherVoicePreviewResponse> {
    context.logger.info("teacher previewVoice handler");
    if (!context.auth.check()) {
      context.responseData.status = 401;
      return { status: "error", message: "Unauthorized" };
    }
    const voiceId = context.httpData.query.get("voiceId") ?? "";
    if (voiceId === "") {
      context.responseData.status = 400;
      return { status: "error", message: "voiceId is required" };
    }
    const lang = context.httpData.query.get("lang") ?? "en";
    const audioBase64 = await collectPreviewAudio(voiceId, lang);
    if (audioBase64 === null) {
      context.responseData.status = 500;
      return { status: "error", message: "Failed to generate preview" };
    }
    return { status: "success", audioBase64 };
  },
};
