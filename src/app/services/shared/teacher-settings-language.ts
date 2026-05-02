import {
  isTeacherLanguageCode,
  isTeacherNativeLanguageCode,
} from "shared/enums";

export const DEFAULT_LEARNING_LANGUAGE = "en";

interface ValidatedLanguageResult {
  ok: true;
  value: string;
}

interface InvalidLanguageResult {
  ok: false;
  reason: "invalid";
}

type LanguageValidationResult = ValidatedLanguageResult | InvalidLanguageResult;

function normalizeLanguageCode(code: string): string {
  return code.trim().toLowerCase();
}

export function normalizeLearningLanguage(
  langLearning: string | undefined | null,
): string {
  if (langLearning !== undefined && langLearning !== null && isTeacherLanguageCode(langLearning)) {
    return normalizeLanguageCode(langLearning);
  }
  return DEFAULT_LEARNING_LANGUAGE;
}

export function normalizeNativeLanguage(
  langNative: string | undefined | null,
  fallback: string,
): string {
  if (
    langNative !== undefined &&
    langNative !== null &&
    isTeacherNativeLanguageCode(langNative)
  ) {
    return normalizeLanguageCode(langNative);
  }
  return normalizeLanguageCode(fallback);
}

export function validateAndNormalizeLearningLanguage(
  rawLangLearning: unknown,
): LanguageValidationResult {
  // Defense-in-depth: keep this tolerant to non-ArkType callers even though
  // the HTTP controller already uses typed payload validation.
  // Empty string is treated the same as "not provided" and falls back to the
  // default learning language instead of returning a validation error.
  if (rawLangLearning === undefined || rawLangLearning === null || rawLangLearning === "") {
    return {
      ok: true,
      value: DEFAULT_LEARNING_LANGUAGE,
    };
  }

  if (typeof rawLangLearning !== "string" || !isTeacherLanguageCode(rawLangLearning)) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  return {
    ok: true,
    value: normalizeLanguageCode(rawLangLearning),
  };
}

export function validateAndNormalizeNativeLanguage(
  rawLangNative: unknown,
  fallback: string,
): LanguageValidationResult {
  // Defense-in-depth: keep this tolerant to non-ArkType callers even though
  // the HTTP controller already uses typed payload validation.
  if (rawLangNative === undefined || rawLangNative === null || rawLangNative === "") {
    return {
      ok: true,
      value: fallback,
    };
  }

  if (typeof rawLangNative !== "string" || !isTeacherNativeLanguageCode(rawLangNative)) {
    return {
      ok: false,
      reason: "invalid",
    };
  }

  return {
    ok: true,
    value: normalizeLanguageCode(rawLangNative),
  };
}
