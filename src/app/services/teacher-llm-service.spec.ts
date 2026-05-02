/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from "vitest";
import { buildKnownVocabularyContextBlock } from "./teacher-llm-service.js";

describe("buildKnownVocabularyContextBlock", () => {
  it("returns an empty string for missing or empty context", () => {
    expect(buildKnownVocabularyContextBlock()).toBe("");
    expect(
      buildKnownVocabularyContextBlock({
        mastered: [],
        reviewing: [],
        learning: [],
      }),
    ).toBe("");
  });

  it("renders a single section without empty sections", () => {
    expect(
      buildKnownVocabularyContextBlock({
        mastered: [{ word: "meeting", translation: "встреча" }],
        reviewing: [],
        learning: [],
      }),
    ).toContain("Mastered. You may freely reuse");
    expect(
      buildKnownVocabularyContextBlock({
        mastered: [{ word: "meeting", translation: "встреча" }],
        reviewing: [],
        learning: [],
      }),
    ).not.toContain("Reviewing. Prefer");
  });

  it("renders compact non-numbered known vocabulary sections", () => {
    expect(
      buildKnownVocabularyContextBlock({
        mastered: [
          { word: "meeting", translation: "встреча" },
          { word: "deadline", translation: "срок" },
        ],
        reviewing: [{ word: "schedule", translation: "расписание" }],
        learning: [{ word: "postpone", translation: "переносить" }],
      }),
    ).toMatchInlineSnapshot(`
      "Student known vocabulary:

      Mastered. You may freely reuse these words in natural examples and questions:
      meeting (встреча), deadline (срок)

      Reviewing. Prefer these for light repetition when relevant:
      schedule (расписание)

      Learning. Use sparingly, with context clues that hint at meaning:
      postpone (переносить)

      Rules:
      - Use known vocabulary naturally, not in every message.
      - Usually include no more than 0-1 known words in a short chat response.
      - Use up to 2 known words only when the student asks for a vocabulary exercise.
      - Prefer mastered and reviewing words.
      - Do not assume learning/new words are already fully known.
      - For learning words, prefer natural context clues over explicit translations.
      - Add a translation only when the student seems confused or explicitly asks.
      - If the active lesson has vocabulary, prioritize active lesson words first."
    `);
  });
});
