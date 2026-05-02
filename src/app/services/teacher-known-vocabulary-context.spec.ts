/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { describe, expect, it } from "vitest";
import {
  buildActiveLessonVocabularyHash,
  buildKnownVocabularyCacheKey,
  normalizeKnownVocabularyWord,
  selectKnownVocabularyPromptContext,
  type KnownVocabularyContextRow,
} from "./teacher-known-vocabulary-context.js";

function row(
  overrides: Partial<KnownVocabularyContextRow> & {
    word: string;
    masteryStatus: KnownVocabularyContextRow["masteryStatus"];
  },
): KnownVocabularyContextRow {
  return {
    word: overrides.word,
    normalizedWord: overrides.normalizedWord ?? normalizeKnownVocabularyWord(overrides.word),
    translation: overrides.translation ?? `${overrides.word}-translation`,
    masteryStatus: overrides.masteryStatus,
    correctCount: overrides.correctCount ?? 0,
    smoothedErrorRate: overrides.smoothedErrorRate ?? 0,
    lastPracticedAt: overrides.lastPracticedAt ?? null,
  };
}

describe("teacher known vocabulary context helpers", () => {
  it("normalizes active lesson words into a stable hash", () => {
    expect(buildActiveLessonVocabularyHash(["Meeting!", "deadline"])).toBe(
      buildActiveLessonVocabularyHash(["deadline", "meeting"]),
    );
    expect(buildActiveLessonVocabularyHash([])).toBe("no-lesson");
  });

  it("builds cache keys with active lesson hash", () => {
    expect(
      buildKnownVocabularyCacheKey({
        userId: 42n,
        langLearning: "EN",
        langNative: "RU",
        activeLessonHash: "abc123",
      }),
    ).toBe("teacher-known-vocabulary:42:en:ru:abc123");
  });

  it("selects bounded prompt context and excludes new words", () => {
    const context = selectKnownVocabularyPromptContext([
      row({ word: "new-word", masteryStatus: "new" }),
      row({ word: "mastered-word", masteryStatus: "mastered" }),
      row({ word: "reviewing-word", masteryStatus: "reviewing" }),
      row({ word: "learning-word", masteryStatus: "learning" }),
    ]);

    expect(context.mastered.map((item) => item.word)).toEqual(["mastered-word"]);
    expect(context.reviewing.map((item) => item.word)).toEqual(["reviewing-word"]);
    expect(context.learning.map((item) => item.word)).toEqual(["learning-word"]);
  });

  it("sorts mastered words by oldest practice date first", () => {
    const context = selectKnownVocabularyPromptContext([
      row({
        word: "recent",
        masteryStatus: "mastered",
        lastPracticedAt: new Date("2026-01-10T00:00:00.000Z"),
      }),
      row({
        word: "old",
        masteryStatus: "mastered",
        lastPracticedAt: new Date("2025-01-10T00:00:00.000Z"),
      }),
      row({
        word: "never",
        masteryStatus: "mastered",
        lastPracticedAt: null,
      }),
    ]);

    expect(context.mastered.map((item) => item.word)).toEqual(["never", "old", "recent"]);
  });

  it("sorts reviewing and learning words by smoothed error rate first", () => {
    const context = selectKnownVocabularyPromptContext([
      row({ word: "easy-review", masteryStatus: "reviewing", smoothedErrorRate: 0.1 }),
      row({ word: "hard-review", masteryStatus: "reviewing", smoothedErrorRate: 0.8 }),
      row({ word: "easy-learning", masteryStatus: "learning", smoothedErrorRate: 0.2 }),
      row({ word: "hard-learning", masteryStatus: "learning", smoothedErrorRate: 0.7 }),
    ]);

    expect(context.reviewing.map((item) => item.word)).toEqual(["hard-review", "easy-review"]);
    expect(context.learning.map((item) => item.word)).toEqual(["hard-learning", "easy-learning"]);
  });

  it("enforces mastered, reviewing, and learning limits", () => {
    const context = selectKnownVocabularyPromptContext([
      ...Array.from({ length: 30 }, (_, index) =>
        row({
          word: `mastered-${String(index).padStart(2, "0")}`,
          masteryStatus: "mastered",
        }),
      ),
      ...Array.from({ length: 30 }, (_, index) =>
        row({
          word: `reviewing-${String(index).padStart(2, "0")}`,
          masteryStatus: "reviewing",
        }),
      ),
      ...Array.from({ length: 30 }, (_, index) =>
        row({
          word: `learning-${String(index).padStart(2, "0")}`,
          masteryStatus: "learning",
        }),
      ),
    ]);

    expect(context.mastered).toHaveLength(10);
    expect(context.reviewing).toHaveLength(10);
    expect(context.learning).toHaveLength(5);
  });

  it("uses normalized word as a deterministic tiebreaker", () => {
    const context = selectKnownVocabularyPromptContext([
      row({ word: "beta", masteryStatus: "reviewing", smoothedErrorRate: 0.5 }),
      row({ word: "alpha", masteryStatus: "reviewing", smoothedErrorRate: 0.5 }),
    ]);

    expect(context.reviewing.map((item) => item.word)).toEqual(["alpha", "beta"]);
  });
});
