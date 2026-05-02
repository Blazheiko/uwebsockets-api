import { describe, expect, it } from "vitest";

import {
  DEFAULT_LEARNING_LANGUAGE,
  normalizeLearningLanguage,
  normalizeNativeLanguage,
  validateAndNormalizeLearningLanguage,
  validateAndNormalizeNativeLanguage,
} from "./teacher-settings-language.js";

describe("teacher settings language normalization", () => {
  it("normalizes langLearning and falls back to default for invalid values", () => {
    expect(normalizeLearningLanguage("ga")).toBe("ga");
    expect(normalizeLearningLanguage(" EN ")).toBe("en");
    expect(normalizeLearningLanguage(undefined)).toBe(DEFAULT_LEARNING_LANGUAGE);
    expect(normalizeLearningLanguage(null)).toBe(DEFAULT_LEARNING_LANGUAGE);
    expect(normalizeLearningLanguage("xx")).toBe(DEFAULT_LEARNING_LANGUAGE);
  });

  it("normalizes langNative and falls back to browser language for invalid values", () => {
    expect(normalizeNativeLanguage("ru", "uk")).toBe("ru");
    expect(normalizeNativeLanguage(" RU ", "uk")).toBe("ru");
    expect(normalizeNativeLanguage(undefined, "uk")).toBe("uk");
    expect(normalizeNativeLanguage(null, "uk")).toBe("uk");
    expect(normalizeNativeLanguage("ga", "uk")).toBe("uk");
    expect(normalizeNativeLanguage("xx", "uk")).toBe("uk");
  });

  it("validates raw langLearning values before normalization", () => {
    expect(validateAndNormalizeLearningLanguage(undefined)).toEqual({
      ok: true,
      value: DEFAULT_LEARNING_LANGUAGE,
    });
    expect(validateAndNormalizeLearningLanguage("pl")).toEqual({
      ok: true,
      value: "pl",
    });
    expect(validateAndNormalizeLearningLanguage(" EN ")).toEqual({
      ok: true,
      value: "en",
    });
    expect(validateAndNormalizeLearningLanguage("xx")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("validates raw langNative values before fallback", () => {
    expect(validateAndNormalizeNativeLanguage(undefined, "uk")).toEqual({
      ok: true,
      value: "uk",
    });
    expect(validateAndNormalizeNativeLanguage("ru", "uk")).toEqual({
      ok: true,
      value: "ru",
    });
    expect(validateAndNormalizeNativeLanguage(" EN ", "uk")).toEqual({
      ok: true,
      value: "en",
    });
    expect(validateAndNormalizeNativeLanguage("ga", "uk")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
