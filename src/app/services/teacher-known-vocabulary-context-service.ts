import logger from "#logger";
import redis from "#database/redis.js";
import { teacherVocabularyRepository } from "#app/repositories/teacher-vocabulary-repository.js";
import {
  buildActiveLessonVocabularyHash,
  buildKnownVocabularyCacheKey,
  isKnownVocabularyPromptContextEmpty,
  normalizeKnownVocabularyWord,
  selectKnownVocabularyPromptContext,
  type KnownVocabularyPromptContext,
} from "#app/services/teacher-known-vocabulary-context.js";

const CACHE_TTL_SECONDS = 30;
const REDIS_TIMEOUT_MS = 300;
const SQL_TIMEOUT_MS = 1500;

export const teacherKnownVocabularyContextService = {
  async getForChat(params: {
    userId: bigint;
    langLearning: string;
    langNative: string;
    activeLessonWords: string[];
  }): Promise<KnownVocabularyPromptContext | undefined> {
    const activeLessonHash = buildActiveLessonVocabularyHash(params.activeLessonWords);
    const cacheKey = buildKnownVocabularyCacheKey({
      userId: params.userId,
      langLearning: params.langLearning,
      langNative: params.langNative,
      activeLessonHash,
    });

    try {
      const cached = await withTimeout(readCache(cacheKey), REDIS_TIMEOUT_MS, "known vocabulary Redis read timed out");
      if (cached !== undefined) {
        return cached ?? undefined;
      }

      const excludeNormalizedWords = params.activeLessonWords
        .map((word) => normalizeKnownVocabularyWord(word))
        .filter((word) => word.length > 0);

      const rows = await withTimeout(
        teacherVocabularyRepository.findUserVocabularyForTeacherContext({
          userId: params.userId,
          langLearning: params.langLearning,
          langNative: params.langNative,
          excludeNormalizedWords,
          limit: 500,
        }),
        SQL_TIMEOUT_MS,
        "known vocabulary SQL query timed out",
      );
      const context = selectKnownVocabularyPromptContext(rows);
      const cacheValue = isKnownVocabularyPromptContextEmpty(context) ? null : context;
      try {
        await withTimeout(writeCache(cacheKey, cacheValue), REDIS_TIMEOUT_MS, "known vocabulary Redis write timed out");
      } catch (error) {
        logger.warn(
          {
            err: error,
            userId: String(params.userId),
            langLearning: params.langLearning,
            langNative: params.langNative,
          },
          "Teacher: failed to cache known vocabulary context",
        );
      }
      return cacheValue ?? undefined;
    } catch (error) {
      logger.warn(
        {
          err: error,
          userId: String(params.userId),
          langLearning: params.langLearning,
          langNative: params.langNative,
        },
        "Teacher: failed to load known vocabulary context, continuing without it",
      );
      return undefined;
    }
  },
};

async function readCache(cacheKey: string): Promise<KnownVocabularyPromptContext | null | undefined> {
  const raw = await redis.get(cacheKey);
  if (raw === null) return undefined;
  const parsed = parseCachedContext(raw);
  if (parsed === undefined) {
    await redis.del(cacheKey);
    return undefined;
  }
  return parsed;
}

async function writeCache(
  cacheKey: string,
  context: KnownVocabularyPromptContext | null,
): Promise<void> {
  await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(context));
}

function parseCachedContext(raw: string): KnownVocabularyPromptContext | null | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
  if (parsed === null) return null;
  if (typeof parsed !== "object") return undefined;
  const obj = parsed as Partial<KnownVocabularyPromptContext>;
  return {
    mastered: Array.isArray(obj.mastered) ? obj.mastered : [],
    reviewing: Array.isArray(obj.reviewing) ? obj.reviewing : [],
    learning: Array.isArray(obj.learning) ? obj.learning : [],
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
