import { createHash } from "node:crypto";
import { normalizeTeacherVocabularyWord } from "./teacher-vocabulary-normalization.js";

export type KnownVocabularyStatus = "mastered" | "reviewing" | "learning" | "new";

export interface KnownVocabularyContextRow {
  word: string;
  normalizedWord: string;
  translation: string;
  masteryStatus: KnownVocabularyStatus;
  correctCount: number;
  smoothedErrorRate: number;
  lastPracticedAt: Date | null;
}

export interface KnownVocabularyPromptItem {
  word: string;
  translation: string;
}

export interface KnownVocabularyPromptContext {
  mastered: KnownVocabularyPromptItem[];
  reviewing: KnownVocabularyPromptItem[];
  learning: KnownVocabularyPromptItem[];
}

const MASTERED_LIMIT = 10;
const REVIEWING_LIMIT = 10;
const LEARNING_LIMIT = 5;

export function normalizeKnownVocabularyWord(word: string): string {
  return normalizeTeacherVocabularyWord(word);
}

export function buildActiveLessonVocabularyHash(words: string[]): string {
  const normalized = words
    .map((word) => normalizeKnownVocabularyWord(word))
    .filter((word) => word.length > 0)
    .sort();

  if (normalized.length === 0) {
    return "no-lesson";
  }

  return createHash("sha256").update(normalized.join("|")).digest("hex").slice(0, 16);
}

export function buildKnownVocabularyCacheKey(params: {
  userId: bigint;
  langLearning: string;
  langNative: string;
  activeLessonHash: string;
}): string {
  return [
    "teacher-known-vocabulary",
    String(params.userId),
    normalizeCachePart(params.langLearning),
    normalizeCachePart(params.langNative),
    normalizeCachePart(params.activeLessonHash),
  ].join(":");
}

export function selectKnownVocabularyPromptContext(
  rows: KnownVocabularyContextRow[],
): KnownVocabularyPromptContext {
  return {
    mastered: rows
      .filter((row) => row.masteryStatus === "mastered")
      .sort(compareMasteredRows)
      .slice(0, MASTERED_LIMIT)
      .map(toPromptItem),
    reviewing: rows
      .filter((row) => row.masteryStatus === "reviewing")
      .sort(compareErrorFirstRows)
      .slice(0, REVIEWING_LIMIT)
      .map(toPromptItem),
    learning: rows
      .filter((row) => row.masteryStatus === "learning")
      .sort(compareErrorFirstRows)
      .slice(0, LEARNING_LIMIT)
      .map(toPromptItem),
  };
}

export function isKnownVocabularyPromptContextEmpty(
  context: KnownVocabularyPromptContext,
): boolean {
  return (
    context.mastered.length === 0 &&
    context.reviewing.length === 0 &&
    context.learning.length === 0
  );
}

function normalizeCachePart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  return normalized.length > 0 ? normalized : "none";
}

function compareMasteredRows(
  left: KnownVocabularyContextRow,
  right: KnownVocabularyContextRow,
): number {
  const dateComparison = compareNullableDatesAsc(left.lastPracticedAt, right.lastPracticedAt);
  if (dateComparison !== 0) return dateComparison;
  const errorComparison = right.smoothedErrorRate - left.smoothedErrorRate;
  if (errorComparison !== 0) return errorComparison;
  const correctComparison = right.correctCount - left.correctCount;
  if (correctComparison !== 0) return correctComparison;
  return left.normalizedWord.localeCompare(right.normalizedWord);
}

function compareErrorFirstRows(
  left: KnownVocabularyContextRow,
  right: KnownVocabularyContextRow,
): number {
  const errorComparison = right.smoothedErrorRate - left.smoothedErrorRate;
  if (errorComparison !== 0) return errorComparison;
  const dateComparison = compareNullableDatesAsc(left.lastPracticedAt, right.lastPracticedAt);
  if (dateComparison !== 0) return dateComparison;
  const correctComparison = right.correctCount - left.correctCount;
  if (correctComparison !== 0) return correctComparison;
  return left.normalizedWord.localeCompare(right.normalizedWord);
}

function compareNullableDatesAsc(left: Date | null, right: Date | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return left.getTime() - right.getTime();
}

function toPromptItem(row: KnownVocabularyContextRow): KnownVocabularyPromptItem {
  return {
    word: row.word,
    translation: row.translation,
  };
}
