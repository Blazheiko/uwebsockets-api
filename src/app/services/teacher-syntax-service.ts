import { teacherSyntaxRepository } from '#app/repositories/teacher-syntax-repository.js';
import { ReusableSyntaxLessonUnavailableError } from '#app/repositories/teacher-syntax-repository.js';
import { teacherSettingsRepository } from '#app/repositories/teacher-settings-repository.js';
import { broadcastService } from '#app/services/broadcast-service.js';
import { teacherSyntaxEmbeddingService } from '#app/services/teacher-syntax-embedding-service.js';
import {
    teacherSyntaxLessonTransformer,
    teacherSyntaxAttemptTransformer,
    teacherSyntaxExerciseAttemptTransformer,
    teacherSyntaxProgressTransformer,
} from '#app/transformers/teacher-syntax-transformer.js';
import type {
    SerializedSyntaxLessonPreview,
    SerializedSyntaxLessonFull,
    SerializedSyntaxAttempt,
    SerializedSyntaxExerciseAttempt,
    SerializedSyntaxProgress,
} from '#app/transformers/teacher-syntax-transformer.js';
import {
    failure,
    success,
    type ServiceFailure,
    type ServiceResult,
    type ServiceSuccess,
} from '#app/services/shared/service-result.js';
import { teacherLlmService } from '#app/services/teacher-llm-service.js';
import { promptService } from '#app/services/prompt-service.js';
import { llmUsageService } from '#app/services/llm-usage-service.js';
import { grokUsageService } from '#app/services/grok-usage-service.js';
import { audioAdapter } from '#app/services/ai/ai-provider.js';
import {
    buildFullS3Key,
    buildS3FileUrl,
    buildStudyAudioEntityKey,
    buildStudyAudioHash,
    buildStudyAudioLookupKey,
    requireStudyAudioLanguage,
    resolveStudyVoice,
    synthesizeStudyAudioToUrl,
} from '#app/services/shared/study-audio.js';
import { deleteFromS3 } from '#vendor/utils/storage/s3.js';
import { updateRateLimitCounter } from '#vendor/utils/rate-limit/rate-limit-counter.js';
import aiConfig from '#config/ai.js';
import type { TextUsageCompleteHandler } from '#app/services/ai/types.js';
import type {
    TeacherSyntaxLessonRow,
    TeacherSyntaxAttemptRow,
    TeacherSyntaxExerciseRow,
    TeacherSyntaxExerciseAttemptRow,
    TeacherSyntaxUserLessonRow,
} from '#app/repositories/teacher-syntax-repository.js';
import { comparePronunciation, normalizePronunciationText } from 'shared/utils';
import logger from '#logger';

const SYNTAX_SIMILARITY_MAX_DISTANCE = 0.2;

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 120);
}

function getNonEmptyString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

interface LlmSyntaxLessonOutput {
    topicTitle: string;
    topicSlug: string;
    ruleSummary: string;
    levelCode?: string;
    sections: { heading: string; content: string }[];
    examples: { sentence: string; translation: string; highlight?: string; note?: string }[];
    exercises: {
        type: string;
        instruction: string;
        promptText: string;
        correctAnswer: string;
        repeatPhrase?: string;
        repeatTranslation?: string;
        repeatHint?: string;
        explanation?: string;
        options?: string[];
        meta?: unknown;
    }[];
}

export const teacherSyntaxService = {
    async getSyntaxLessons(
        userId: bigint,
        langLearning: string,
    ): Promise<ServiceResult<{ data: SerializedSyntaxLessonPreview[] }>> {
        const rows = await teacherSyntaxRepository.findLessonsByUser(userId, langLearning);
        const data = rows.map((row) =>
            teacherSyntaxLessonTransformer.serializePreview(
                row.lesson,
                row.userLesson,
                getPronunciationConfig(),
            ),
        );
        return success({ data });
    },

    async getSyntaxLessonDetail(
        userId: bigint,
        lessonId: string,
    ): Promise<ServiceResult<{ data: SerializedSyntaxLessonFull }>> {
        const accessResult = await assertUserHasLesson(userId, BigInt(lessonId));
        if (!accessResult.ok) {
            return accessResult;
        }

        const { lesson, userLesson } = accessResult.data;
        const [sections, examples, exercises] = await Promise.all([
            teacherSyntaxRepository.findSectionsByLessonId(lesson.id),
            teacherSyntaxRepository.findExamplesByLessonId(lesson.id),
            teacherSyntaxRepository.findExercisesByLessonId(lesson.id),
        ]);
        const voice = resolveStudyVoice();
        const language = requireStudyAudioLanguage(lesson.langLearning, `syntax lesson ${String(lesson.id)}`);
        const exampleHashById = new Map(
            examples.map((example) => [
                String(example.id),
                buildStudyAudioHash({ text: example.sentence, language }),
            ]),
        );
        const exampleHashes = [...new Set(exampleHashById.values())];
        const exampleAudioRows = await teacherSyntaxRepository.findExampleAudioByExampleIds(
            examples.map((example) => example.id),
            voice,
            language,
            exampleHashes,
        );
        const exampleVoiceSrcById = new Map(
            exampleAudioRows
                .filter((row) => exampleHashById.get(String(row.scopeId)) === row.contentHash)
                .map((row) => [String(row.scopeId), row.voiceSrc]),
        );

        const exerciseIds = exercises.map((exercise) => exercise.id);
        const exerciseHashById = new Map(
            exercises.map((exercise) => [
                String(exercise.id),
                buildStudyAudioHash({ text: exercise.repeatPhrase, language }),
            ]),
        );
        const exerciseHashes = [...new Set(exerciseHashById.values())];
        const [exerciseAudioRows, options] = await Promise.all([
            teacherSyntaxRepository.findExerciseAudioByExerciseIds(exerciseIds, voice, language, exerciseHashes),
            teacherSyntaxRepository.findOptionsByExerciseIds(exerciseIds),
        ]);
        const exerciseVoiceSrcById = new Map(
            exerciseAudioRows
                .filter((row) => exerciseHashById.get(String(row.scopeId)) === row.contentHash)
                .map((row) => [String(row.scopeId), row.voiceSrc]),
        );

        const data = teacherSyntaxLessonTransformer.serializeFull(
            lesson,
            sections,
            examples,
            exercises,
            options,
            userLesson,
            exampleVoiceSrcById,
            exerciseVoiceSrcById,
            getPronunciationConfig(),
        );
        return success({ data });
    },

    async deleteSyntaxLesson(
        userId: bigint,
        lessonId: string,
    ): Promise<ServiceResult<void>> {
        const accessResult = await assertUserHasLesson(userId, BigInt(lessonId));
        if (!accessResult.ok) {
            return accessResult;
        }

        const { voiceSrcKeys } = await teacherSyntaxRepository.detachAndMaybeHardDelete(
            userId,
            accessResult.data.lesson.id,
        );
        await deleteS3Keys(voiceSrcKeys);
        return success(undefined);
    },

    async deleteAllSyntaxLessons(userId: bigint): Promise<void> {
        const lessonIds = await teacherSyntaxRepository.findAllLessonIdsByUser(userId);
        if (lessonIds.length === 0) {
            return;
        }

        const allKeys = new Set<string>();
        for (const lessonId of lessonIds) {
            const { voiceSrcKeys } = await teacherSyntaxRepository.detachAndMaybeHardDelete(userId, lessonId);
            for (const key of voiceSrcKeys) {
                allKeys.add(key);
            }
        }

        await deleteS3Keys([...allKeys]);
    },

    async generateSyntaxLesson(
        userId: bigint,
        topic: string,
        levelCodeOverride?: string,
    ): Promise<ServiceResult<{ lessonId: string; reused: boolean }>> {
        const settings = await teacherSettingsRepository.findByUserId(userId);
        const langLearning = settings?.langLearning ?? 'en';
        const langNative = settings?.langNative ?? 'ru';
        const proficiencyLevel = levelCodeOverride ?? settings?.proficiencyLevel ?? 'beginner';
        const studyTopic = settings?.topic ?? null;
        const learningGoal = settings?.learningGoal ?? null;

        if (teacherSyntaxEmbeddingService.isEnabled()) {
            const queryVector = await teacherSyntaxEmbeddingService.embedTopic({ sourceTopic: topic });
            if (queryVector !== null) {
                const candidate = await teacherSyntaxRepository.findReusableLessonForUser({
                    userId,
                    langLearning,
                    langNative,
                    levelCode: proficiencyLevel,
                    queryVector,
                    maxDistance: SYNTAX_SIMILARITY_MAX_DISTANCE,
                });

                if (candidate !== undefined) {
                    try {
                        await teacherSyntaxRepository.attachReadyLessonToUser(userId, candidate.id);
                        broadcastService.broadcastMessageToUser(
                            String(userId),
                            'teacher_syntax_lesson_ready',
                            {
                                lessonId: String(candidate.id),
                                topicTitle: candidate.topicTitle,
                                reused: true,
                            },
                        );
                        return success({ lessonId: String(candidate.id), reused: true });
                    } catch (err: unknown) {
                        if (!(err instanceof ReusableSyntaxLessonUnavailableError)) {
                            throw err;
                        }

                        logger.warn(
                            {
                                err,
                                candidateId: String(candidate.id),
                                userId: String(userId),
                            },
                            'Reuse attach failed, falling back to generation',
                        );
                    }
                }
            }
        }

        const lesson = await teacherSyntaxRepository.createLessonAndAttachAuthor({
            userId,
            langLearning,
            langNative,
            sourceTopic: topic,
            topicSlug: slugify(topic),
            topicTitle: topic,
            ruleSummary: '',
            levelCode: proficiencyLevel,
            studyTopic: studyTopic ?? undefined,
            learningGoal: learningGoal ?? undefined,
            status: 'generating',
        }, userId);

        broadcastService.broadcastMessageToUser(
            String(userId),
            'teacher_syntax_lesson_generating',
            { lessonId: String(lesson.id), topicTitle: topic },
        );

        void teacherSyntaxService.runGeneration(
            userId,
            lesson.id,
            topic,
            langLearning,
            langNative,
            proficiencyLevel,
            studyTopic,
            learningGoal,
        );

        return success({ lessonId: String(lesson.id), reused: false });
    },

    async runGeneration(
        userId: bigint,
        lessonId: bigint,
        topic: string,
        langLearning: string,
        langNative: string,
        level: string,
        studyTopic: string | null,
        learningGoal: string | null,
    ): Promise<void> {
        const userIdStr = String(userId);
        try {
            const systemContent = promptService.getContent('TEACHER_SYNTAX_LESSON');
            const userMessage = buildSyntaxLessonPrompt(
                topic,
                langLearning,
                langNative,
                level,
                studyTopic,
                learningGoal,
            );

            const onComplete: TextUsageCompleteHandler = (usage, model, finalPrompt) => {
                llmUsageService.recordText({
                    userId,
                    llmSystemPromptId: null,
                    model,
                    feature: 'TEACHER_SYNTAX_LESSON',
                    finalPrompt,
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    totalTokens: usage.totalTokens,
                });
            };

            const raw = await teacherLlmService.generateSyntaxLessonJson(
                systemContent.length > 0 ? systemContent : 'You are a language teacher. Return valid JSON only.',
                userMessage,
                onComplete,
            );

            const jsonMatch = /\{[\s\S]*\}/.exec(raw);
            if (jsonMatch === null) {
                throw new Error('LLM returned no JSON');
            }

            const parsed = JSON.parse(jsonMatch[0]) as LlmSyntaxLessonOutput;
            if (
                !Array.isArray(parsed.sections) || parsed.sections.length === 0 ||
                !Array.isArray(parsed.examples) || parsed.examples.length === 0 ||
                !Array.isArray(parsed.exercises) || parsed.exercises.length < 3
            ) {
                throw new Error('Invalid lesson structure from LLM');
            }

            const contentUpdate: { topicTitle: string; topicSlug: string; ruleSummary: string; levelCode?: string } = {
                topicTitle: getNonEmptyString(parsed.topicTitle, topic),
                topicSlug: slugify(getNonEmptyString(parsed.topicSlug, topic)),
                ruleSummary: getNonEmptyString(parsed.ruleSummary, ''),
            };
            if (typeof parsed.levelCode === 'string' && parsed.levelCode.length > 0) {
                contentUpdate.levelCode = parsed.levelCode;
            }

            await teacherSyntaxRepository.updateLessonContent(lessonId, contentUpdate);

            await teacherSyntaxRepository.insertSections(
                parsed.sections.map((section, index) => ({
                    lessonId,
                    sortOrder: index,
                    heading: section.heading,
                    content: section.content,
                })),
            );

            await teacherSyntaxRepository.insertExamples(
                parsed.examples.map((example, index) => ({
                    lessonId,
                    sortOrder: index,
                    sentence: example.sentence,
                    translation: example.translation,
                    highlight: example.highlight ?? null,
                    note: example.note ?? null,
                })),
            );

            const exerciseRows = await teacherSyntaxRepository.insertExercises(
                parsed.exercises.map((exercise, index) => {
                    const resolvedRepeatPhrase = resolveRepeatPhrase(
                        exercise.repeatPhrase,
                        exercise.promptText,
                        exercise.correctAnswer,
                    );
                    return {
                        lessonId,
                        sortOrder: index,
                        type: exercise.type,
                        instruction: exercise.instruction,
                        promptText: exercise.promptText,
                        correctAnswer: exercise.correctAnswer,
                        repeatPhrase: resolvedRepeatPhrase,
                        repeatTranslation: exercise.repeatTranslation ?? null,
                        repeatHint: exercise.repeatHint ?? null,
                        explanation: exercise.explanation ?? null,
                        meta: exercise.meta ?? null,
                    };
                }),
            );

            const allOptions: {
                exerciseId: bigint;
                sortOrder: number;
                text: string;
                isCorrect: boolean;
            }[] = [];
            for (let i = 0; i < parsed.exercises.length; i++) {
                const exercise = parsed.exercises[i];
                const row = exerciseRows[i];
                if (exercise === undefined || row === undefined) {
                    continue;
                }

                if (exercise.type === 'choose_correct' && Array.isArray(exercise.options)) {
                    for (let j = 0; j < exercise.options.length; j++) {
                        const optionText = exercise.options[j];
                        if (optionText === undefined) {
                            continue;
                        }

                        allOptions.push({
                            exerciseId: row.id,
                            sortOrder: j,
                            text: optionText,
                            isCorrect: optionText === exercise.correctAnswer,
                        });
                    }
                }
            }

            if (allOptions.length > 0) {
                await teacherSyntaxRepository.insertExerciseOptions(allOptions);
            }

            await teacherSyntaxRepository.updateUserLessonProgress(userId, lessonId, {
                totalExercises: exerciseRows.length,
            });

            await teacherSyntaxEmbeddingService.indexLesson(lessonId, {
                sourceTopic: topic,
                topicTitle: contentUpdate.topicTitle,
                ruleSummary: contentUpdate.ruleSummary,
            });

            await teacherSyntaxRepository.updateLessonStatus(lessonId, 'ready');

            broadcastService.broadcastMessageToUser(userIdStr, 'teacher_syntax_lesson_ready', {
                lessonId: String(lessonId),
                topicTitle: contentUpdate.topicTitle,
            });
        } catch (err: unknown) {
            logger.error({ err }, 'Syntax lesson generation failed');

            const { voiceSrcKeys } = await teacherSyntaxRepository.detachAndMaybeHardDelete(userId, lessonId);
            await deleteS3Keys(voiceSrcKeys);
            logger.warn(
                { lessonId: String(lessonId), userId: String(userId) },
                'Syntax lesson hard-deleted after generation failure',
            );

            broadcastService.broadcastMessageToUser(userIdStr, 'teacher_syntax_lesson_error', {
                lessonId: String(lessonId),
                error: 'Failed to generate lesson',
            });
        }
    },

    async startAttempt(
        userId: bigint,
        lessonId: string,
    ): Promise<ServiceResult<{ data: SerializedSyntaxAttempt }>> {
        const accessResult = await assertUserHasLesson(userId, BigInt(lessonId));
        if (!accessResult.ok) {
            return accessResult;
        }

        const { lesson } = accessResult.data;
        if (lesson.status !== 'ready') {
            return failure('BAD_REQUEST', 'Lesson is not ready');
        }

        const exercises = await teacherSyntaxRepository.findExercisesByLessonId(lesson.id);
        const activeAttempt = await teacherSyntaxRepository.findLatestActiveAttempt(lesson.id, userId);
        const attempt = activeAttempt ?? await teacherSyntaxRepository.createAttempt(lesson.id, userId, exercises.length);
        const exerciseAttempts = await teacherSyntaxRepository.findExerciseAttemptsByAttemptId(attempt.id);
        return success({
            data: {
                ...teacherSyntaxAttemptTransformer.serialize(attempt),
                exerciseAttempts: exerciseAttempts.map((row) => teacherSyntaxExerciseAttemptTransformer.serialize(row)),
            },
        });
    },

    async submitAnswer(
        userId: bigint,
        lessonId: string,
        attemptId: string,
        exerciseId: string,
        userAnswer: string,
    ): Promise<ServiceResult<{ data: SerializedSyntaxExerciseAttempt; progress: SerializedSyntaxProgress | null }>> {
        const accessResult = await assertUserHasLesson(userId, BigInt(lessonId));
        if (!accessResult.ok) {
            return accessResult;
        }

        const { lesson } = accessResult.data;
        const attempt = await teacherSyntaxRepository.findAttemptById(BigInt(attemptId));
        if (attempt?.lessonId !== lesson.id || attempt.userId !== userId) {
            return failure('NOT_FOUND', 'Attempt not found');
        }

        const exercises = await teacherSyntaxRepository.findExercisesByLessonId(lesson.id);
        const exercise = exercises.find((row) => String(row.id) === exerciseId);
        if (exercise === undefined) {
            return failure('NOT_FOUND', 'Exercise not found');
        }

        const existingAttempt = await teacherSyntaxRepository.findExerciseAttemptByAttemptAndExercise(attempt.id, exercise.id);
        if (existingAttempt !== undefined) {
            if (existingAttempt.userAnswer !== userAnswer) {
                return failure('CONFLICT', 'Exercise answer is already locked');
            }
            const progress = await teacherSyntaxRepository.findUserLesson(userId, lesson.id);
            return success({
                data: teacherSyntaxExerciseAttemptTransformer.serialize(existingAttempt),
                progress: progress !== undefined
                    ? teacherSyntaxProgressTransformer.serialize(progress)
                    : null,
            });
        }

        const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(exercise.correctAnswer);
        const exerciseAttempt = await teacherSyntaxRepository.createExerciseAttempt({
            attemptId: attempt.id,
            lessonId: lesson.id,
            exerciseId: exercise.id,
            userAnswer,
            isCorrect,
            feedback: isCorrect ? '' : (exercise.explanation ?? ''),
        });
        return success({
            data: teacherSyntaxExerciseAttemptTransformer.serialize(exerciseAttempt),
            progress: teacherSyntaxProgressTransformer.serialize(accessResult.data.userLesson),
        });
    },

    async submitPronunciation(
        userId: bigint,
        lessonId: string,
        exerciseId: string,
        attemptId: string,
        audioBuffer: ArrayBuffer,
        mimeType: string,
    ): Promise<ServiceResult<{
        outcome: 'updated' | 'no_speech_detected';
        data: SerializedSyntaxExerciseAttempt;
        progress: SerializedSyntaxProgress | null;
    }>> {
        const resolved = await resolveAttemptContext(userId, lessonId, attemptId, exerciseId);
        if (!resolved.ok) {
            return resolved;
        }

        const { lesson, attempt, exercise, exerciseAttempt } = resolved.data;
        if (exerciseAttempt.completedAt !== null) {
            const progress = await teacherSyntaxRepository.findUserLesson(userId, lesson.id);
            return success({
                outcome: 'updated',
                data: teacherSyntaxExerciseAttemptTransformer.serialize(exerciseAttempt),
                progress: progress !== undefined ? teacherSyntaxProgressTransformer.serialize(progress) : null,
            });
        }

        if (!checkPronunciationGlobalRateLimit(userId)) {
            return failure('CONFLICT', 'Too many pronunciation requests, please try again shortly');
        }

        let recognizedText = '';
        try {
            const languageHint = resolveSttLanguageHint(lesson.langLearning);
            recognizedText = await audioAdapter.transcribe({
                audioBuffer,
                mimeType,
                ...(languageHint !== undefined ? { language: languageHint } : {}),
            });
        } catch (error: unknown) {
            logger.error({ error, lessonId, attemptId, exerciseId }, 'Syntax pronunciation transcription failed');
            const changed = await teacherSyntaxRepository.markExercisePronunciationSkipped(
                exerciseAttempt.id,
                'technical_unavailable',
                'server',
            );
            if (changed) {
                await recomputeLessonProgress(userId, lesson, attempt);
            }
            const refreshedAttempt = await teacherSyntaxRepository.findExerciseAttemptByAttemptAndExercise(attempt.id, exercise.id);
            if (refreshedAttempt === undefined) {
                return failure('INTERNAL', 'Pronunciation skip after transcription failure was not persisted');
            }
            const progress = await teacherSyntaxRepository.findUserLesson(userId, lesson.id);
            return success({
                outcome: 'updated',
                data: teacherSyntaxExerciseAttemptTransformer.serialize(refreshedAttempt),
                progress: progress !== undefined ? teacherSyntaxProgressTransformer.serialize(progress) : null,
            });
        }
        const normalizedRecognizedText = normalizePronunciationText(recognizedText);
        if (normalizedRecognizedText.length === 0) {
            const progress = await teacherSyntaxRepository.findUserLesson(userId, lesson.id);
            return success({
                outcome: 'no_speech_detected',
                data: teacherSyntaxExerciseAttemptTransformer.serialize(exerciseAttempt),
                progress: progress !== undefined ? teacherSyntaxProgressTransformer.serialize(progress) : null,
            });
        }

        const comparison = comparePronunciation(
            exercise.repeatPhrase,
            normalizedRecognizedText,
            aiConfig.pronunciation.passThreshold,
        );
        const scoreValue = comparison.similarity.toFixed(2);

        if (comparison.isCorrect) {
            const changed = await teacherSyntaxRepository.markExercisePronunciationPassed(
                exerciseAttempt.id,
                recognizedText,
                scoreValue,
            );
            if (changed) {
                await recomputeLessonProgress(userId, lesson, attempt);
            }
        } else {
            await teacherSyntaxRepository.recordExercisePronunciationAttempt(
                exerciseAttempt.id,
                recognizedText,
                scoreValue,
            );
        }

        const refreshedAttempt = await teacherSyntaxRepository.findExerciseAttemptByAttemptAndExercise(attempt.id, exercise.id);
        if (refreshedAttempt === undefined) {
            return failure('INTERNAL', 'Pronunciation attempt was not persisted');
        }
        const progress = await teacherSyntaxRepository.findUserLesson(userId, lesson.id);
        return success({
            outcome: 'updated',
            data: teacherSyntaxExerciseAttemptTransformer.serialize(refreshedAttempt),
            progress: progress !== undefined ? teacherSyntaxProgressTransformer.serialize(progress) : null,
        });
    },

    async skipPronunciation(
        userId: bigint,
        lessonId: string,
        exerciseId: string,
        attemptId: string,
        reason: 'attempt_limit' | 'technical_unavailable',
    ): Promise<ServiceResult<{ data: SerializedSyntaxExerciseAttempt; progress: SerializedSyntaxProgress | null }>> {
        const resolved = await resolveAttemptContext(userId, lessonId, attemptId, exerciseId);
        if (!resolved.ok) {
            return resolved;
        }

        const { lesson, attempt, exerciseAttempt } = resolved.data;
        if (reason === 'attempt_limit' && exerciseAttempt.pronunciationAttemptsCount < aiConfig.pronunciation.skipAfterAttempts) {
            return failure('BAD_REQUEST', 'Pronunciation skip is not available yet');
        }

        if (reason === 'technical_unavailable') {
            logger.info({
                userId: String(userId),
                lessonId,
                exerciseId,
                attemptId,
                pronunciationAttemptsCount: exerciseAttempt.pronunciationAttemptsCount,
            }, 'Syntax pronunciation skipped by client because microphone or STT was unavailable');
        }

        const changed = await teacherSyntaxRepository.markExercisePronunciationSkipped(
            exerciseAttempt.id,
            reason,
            reason === 'technical_unavailable' ? 'client' : 'server',
        );
        if (changed) {
            await recomputeLessonProgress(userId, lesson, attempt);
        }

        const refreshedAttempt = await teacherSyntaxRepository.findExerciseAttemptByAttemptAndExercise(attempt.id, BigInt(exerciseId));
        if (refreshedAttempt === undefined) {
            return failure('INTERNAL', 'Pronunciation skip was not persisted');
        }
        const progress = await teacherSyntaxRepository.findUserLesson(userId, lesson.id);
        return success({
            data: teacherSyntaxExerciseAttemptTransformer.serialize(refreshedAttempt),
            progress: progress !== undefined ? teacherSyntaxProgressTransformer.serialize(progress) : null,
        });
    },

    async getSyntaxExampleAudio(
        userId: bigint,
        exampleId: string,
    ): Promise<ServiceResult<{ audioUrl: string; voiceSrc: string }>> {
        const example = await teacherSyntaxRepository.findExampleById(BigInt(exampleId));
        if (example === undefined) {
            return failure('NOT_FOUND', 'Syntax example not found');
        }

        const accessResult = await assertUserHasLesson(userId, example.lessonId);
        if (!accessResult.ok) {
            return accessResult;
        }

        const { lesson } = accessResult.data;
        const voice = resolveStudyVoice();
        const language = requireStudyAudioLanguage(lesson.langLearning, `syntax lesson ${String(lesson.id)}`);
        const contentHash = buildStudyAudioHash({ text: example.sentence, language });
        const cached = await teacherSyntaxRepository.findExampleAudio(example.id, voice, language, contentHash);

        if (cached !== undefined) {
            logger.debug({ exampleId, voice, language }, 'Study audio cache hit for syntax example');
            return success({
                audioUrl: buildS3FileUrl(cached.voiceSrc),
                voiceSrc: cached.voiceSrc,
            });
        }

        logger.debug({ exampleId, voice, language }, 'Study audio cache miss for syntax example');
        const legacy = await teacherSyntaxRepository.findLegacyExampleAudio(example.id, voice);
        if (legacy !== undefined) {
            await teacherSyntaxRepository.setExampleAudio(example.id, voice, language, contentHash, legacy.voiceSrc);
            // During rollout we intentionally keep referencing the legacy S3 object here.
            logger.info({ exampleId, voice, language }, 'Study audio bridged from legacy syntax example cache');
            return success({
                audioUrl: buildS3FileUrl(legacy.voiceSrc),
                voiceSrc: legacy.voiceSrc,
            });
        }

        const lockKey = buildStudyAudioLookupKey({
            scope: 'syntax_example',
            scopeId: example.id,
            voice,
            language,
            contentHash,
        });
        const entityKey = buildStudyAudioEntityKey({
            scope: 'syntax_example',
            scopeId: example.id,
            voice,
            language,
            contentHash,
        });
        const audioUrl = await synthesizeStudyAudioToUrl(
            lockKey,
            entityKey,
            example.sentence,
            voice,
            language,
        );

        await teacherSyntaxRepository.setExampleAudio(example.id, voice, language, contentHash, entityKey);

        grokUsageService.record({
            userId,
            voice,
            language,
            feature: 'TEACHER_SYNTAX',
            characterCount: example.sentence.length,
        });

        return success({ audioUrl, voiceSrc: entityKey });
    },

    async getSyntaxExerciseAudio(
        userId: bigint,
        lessonId: string,
        exerciseId: string,
    ): Promise<ServiceResult<{ audioUrl: string; voiceSrc: string }>> {
        const accessResult = await assertUserHasLesson(userId, BigInt(lessonId));
        if (!accessResult.ok) {
            return accessResult;
        }

        const exercise = await teacherSyntaxRepository.findExerciseById(BigInt(exerciseId));
        if (exercise?.lessonId !== BigInt(lessonId)) {
            return failure('NOT_FOUND', 'Syntax exercise not found');
        }

        const { lesson } = accessResult.data;
        const voice = resolveStudyVoice();
        const language = requireStudyAudioLanguage(lesson.langLearning, `syntax lesson ${String(lesson.id)}`);
        const contentHash = buildStudyAudioHash({ text: exercise.repeatPhrase, language });
        const cached = await teacherSyntaxRepository.findExerciseAudio(exercise.id, voice, language, contentHash);
        if (cached !== undefined) {
            logger.debug({ exerciseId, voice, language }, 'Study audio cache hit for syntax exercise');
            return success({
                audioUrl: buildS3FileUrl(cached.voiceSrc),
                voiceSrc: cached.voiceSrc,
            });
        }

        logger.debug({ exerciseId, voice, language }, 'Study audio cache miss for syntax exercise');
        const legacy = await teacherSyntaxRepository.findLegacyExerciseAudio(exercise.id, voice);
        if (legacy !== undefined) {
            await teacherSyntaxRepository.setExerciseAudio(exercise.id, voice, language, contentHash, legacy.voiceSrc);
            // During rollout we intentionally keep referencing the legacy S3 object here.
            logger.info({ exerciseId, voice, language }, 'Study audio bridged from legacy syntax exercise cache');
            return success({
                audioUrl: buildS3FileUrl(legacy.voiceSrc),
                voiceSrc: legacy.voiceSrc,
            });
        }

        const lockKey = buildStudyAudioLookupKey({
            scope: 'syntax_exercise',
            scopeId: exercise.id,
            voice,
            language,
            contentHash,
        });
        const entityKey = buildStudyAudioEntityKey({
            scope: 'syntax_exercise',
            scopeId: exercise.id,
            voice,
            language,
            contentHash,
        });
        const audioUrl = await synthesizeStudyAudioToUrl(
            lockKey,
            entityKey,
            exercise.repeatPhrase,
            voice,
            language,
        );
        await teacherSyntaxRepository.setExerciseAudio(exercise.id, voice, language, contentHash, entityKey);

        grokUsageService.record({
            userId,
            voice,
            language,
            feature: 'TEACHER_SYNTAX',
            characterCount: exercise.repeatPhrase.length,
        });

        return success({ audioUrl, voiceSrc: entityKey });
    },
};

async function assertUserHasLesson(
    userId: bigint,
    lessonId: bigint,
): Promise<ServiceSuccess<{ lesson: TeacherSyntaxLessonRow; userLesson: TeacherSyntaxUserLessonRow }> | ServiceFailure> {
    const [lesson, userLesson] = await Promise.all([
        teacherSyntaxRepository.findLessonById(lessonId),
        teacherSyntaxRepository.findUserLesson(userId, lessonId),
    ]);

    if (lesson === undefined || userLesson === undefined) {
        return failure('NOT_FOUND', 'Lesson not found');
    }

    return success({ lesson, userLesson });
}

async function deleteS3Keys(keys: string[]): Promise<void> {
    await Promise.all(
        [...new Set(keys)]
            .filter((key) => key.length > 0)
            .map((key) => deleteFromS3(buildFullS3Key(key)).catch(() => undefined)),
    );
}
const pronunciationGlobalRateLimitPrefix = 'teacher-syntax-pronunciation-global';

function normalizeAnswer(answer: string): string {
    return answer
        .trim()
        .toLowerCase()
        .replace(/\.\.\./g, ' ')
        .replace(/[.,!?;:]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPronunciationConfig(): { threshold: number; skipAfterAttempts: number } {
    return {
        threshold: aiConfig.pronunciation.passThreshold,
        skipAfterAttempts: aiConfig.pronunciation.skipAfterAttempts,
    };
}

function resolveRepeatPhrase(
    repeatPhrase: string | undefined,
    promptText: string,
    correctAnswer: string,
): string {
    const validPhraseCandidates = [repeatPhrase, correctAnswer];
    for (const candidate of validPhraseCandidates) {
        if (isRepeatPhraseCandidateValid(candidate)) {
            return candidate.trim();
        }
    }

    if (isPromptTextRepeatFallbackValid(promptText)) {
        return promptText.trim();
    }

    return correctAnswer.trim().length > 0 ? correctAnswer.trim() : promptText.trim();
}

function isRepeatPhraseCandidateValid(candidate: string | undefined): candidate is string {
    const normalized = normalizePronunciationText(candidate ?? '');
    const words = normalized.length === 0 ? [] : normalized.split(' ');
    return words.length >= 2 && words.length <= 12;
}

function isPromptTextRepeatFallbackValid(promptText: string): boolean {
    if (promptText.includes('_') || promptText.includes('/')) {
        return false;
    }
    return isRepeatPhraseCandidateValid(promptText);
}

function checkPronunciationGlobalRateLimit(userId: bigint): boolean {
    const info = updateRateLimitCounter(
        `${pronunciationGlobalRateLimitPrefix}:${String(userId)}`,
        aiConfig.pronunciation.globalWindowMs,
    );
    return info.requests <= aiConfig.pronunciation.globalMaxRequests;
}

function resolveSttLanguageHint(language: string): string | undefined {
    const normalized = language.trim().toLowerCase();
    if (normalized.length === 0) return undefined;

    const directMatch = /^[a-z]{2}$/.exec(normalized);
    if (directMatch !== null) {
        return directMatch[0];
    }

    const primarySubtag = /^[a-z]{2}(?=[-_])/.exec(normalized);
    if (primarySubtag !== null) {
        return primarySubtag[0];
    }

    return undefined;
}

async function resolveAttemptContext(
    userId: bigint,
    lessonId: string,
    attemptId: string,
    exerciseId: string,
): Promise<ServiceResult<{
    lesson: TeacherSyntaxLessonRow;
    attempt: TeacherSyntaxAttemptRow;
    exercise: TeacherSyntaxExerciseRow;
    exerciseAttempt: TeacherSyntaxExerciseAttemptRow;
}>> {
    const accessResult = await assertUserHasLesson(userId, BigInt(lessonId));
    if (!accessResult.ok) {
        return accessResult;
    }
    const { lesson } = accessResult.data;
    const [attempt, exercise] = await Promise.all([
        teacherSyntaxRepository.findAttemptById(BigInt(attemptId)),
        teacherSyntaxRepository.findExerciseById(BigInt(exerciseId)),
    ]);
    if (attempt?.userId !== userId || attempt.lessonId !== lesson.id) {
        return failure('NOT_FOUND', 'Attempt not found');
    }
    if (exercise?.lessonId !== lesson.id) {
        return failure('NOT_FOUND', 'Exercise not found');
    }
    const exerciseAttempt = await teacherSyntaxRepository.findExerciseAttemptByAttemptAndExercise(attempt.id, exercise.id);
    if (exerciseAttempt === undefined) {
        return failure('BAD_REQUEST', 'Exercise answer is required before pronunciation');
    }

    return success({ lesson, attempt, exercise, exerciseAttempt });
}

async function recomputeLessonProgress(
    userId: bigint,
    lesson: TeacherSyntaxLessonRow,
    attempt: TeacherSyntaxAttemptRow,
    exercises: TeacherSyntaxExerciseRow[] | null = null,
): Promise<void> {
    const lessonExercises = exercises ?? await teacherSyntaxRepository.findExercisesByLessonId(lesson.id);
    const exerciseAttempts = await teacherSyntaxRepository.findExerciseAttemptsByAttemptId(attempt.id);
    const totalExercises = lessonExercises.length
    const completedExercises = exerciseAttempts.filter((row) => row.completedAt !== null).length
    const pronouncedExercises = exerciseAttempts.filter((row) => row.pronunciationStatus === 'passed').length
    const correctCount = exerciseAttempts.filter((row) => row.isCorrect).length
    const mistakesCount = exerciseAttempts.filter((row) => !row.isCorrect).length

    let masteryStatus = 'in_progress'
    if (completedExercises >= totalExercises && totalExercises > 0) {
        const answerRatio = correctCount / totalExercises
        masteryStatus = answerRatio >= 0.8 && pronouncedExercises === totalExercises
            ? 'mastered'
            : 'completed'
    }

    await teacherSyntaxRepository.updateUserLessonProgress(userId, lesson.id, {
        totalExercises,
        completedExercises,
        pronouncedExercises,
        correctCount,
        mistakesCount,
        masteryStatus,
        lastPracticedAt: new Date(),
    });

    await teacherSyntaxRepository.updateAttemptStats(attempt.id, {
        correctCount,
        mistakesCount,
        resultStatus: masteryStatus,
        ...(completedExercises >= totalExercises && totalExercises > 0 ? { completedAt: new Date() } : {}),
    });
}

function buildSyntaxLessonPrompt(
    topic: string,
    langLearning: string,
    langNative: string,
    level: string,
    studyTopic: string | null,
    learningGoal: string | null,
): string {
    let prompt = `Generate a structured syntax lesson about "${topic}" for a student learning ${langLearning}.

Student profile:
- Native language: ${langNative} (use for explanations)
- Proficiency level: ${level}`;

    if (studyTopic !== null && studyTopic.length > 0) {
        prompt += `\n- Current study theme: ${studyTopic}`;
    }
    if (learningGoal !== null && learningGoal.length > 0) {
        prompt += `\n- Learning goal: ${learningGoal}`;
    }

    prompt += `

Requirements:
1. Focus on ONE syntax rule only
2. Write explanations in ${langNative}
3. Write examples and exercise sentences in ${langLearning}
4. Include at least 5 exercises (types: fill_blank, choose_correct, reorder)
5. For choose_correct exercises, include exactly 4 options
6. For every exercise, include a short natural repeatPhrase in ${langLearning} that the student should repeat aloud
7. repeatPhrase must be 2-12 words and closely match the exercise target pattern

Return valid JSON with this structure:
{
  "topicTitle": "rule title in ${langLearning}",
  "topicSlug": "kebab-case-slug",
  "ruleSummary": "one-sentence rule summary in ${langNative}",
  "levelCode": "${level}",
  "sections": [
    { "heading": "section heading", "content": "markdown explanation" }
  ],
  "examples": [
    { "sentence": "example in ${langLearning}", "translation": "translation in ${langNative}", "highlight": "key part", "note": "optional note" }
  ],
  "exercises": [
    { "type": "fill_blank", "instruction": "task text", "promptText": "sentence with ___", "correctAnswer": "answer", "repeatPhrase": "natural full sentence", "repeatTranslation": "translation in ${langNative}", "repeatHint": "optional hint", "explanation": "why" },
    { "type": "choose_correct", "instruction": "task text", "promptText": "sentence with ___", "correctAnswer": "correct option", "repeatPhrase": "natural full sentence", "repeatTranslation": "translation in ${langNative}", "repeatHint": "optional hint", "options": ["opt1", "opt2", "opt3", "opt4"], "explanation": "why" },
    { "type": "reorder", "instruction": "task text", "promptText": "shuffled / words / here", "correctAnswer": "correct sentence", "repeatPhrase": "natural full sentence", "repeatTranslation": "translation in ${langNative}", "repeatHint": "optional hint", "meta": { "words": ["correct", "sentence"] }, "explanation": "why" }
  ]
}`;

    return prompt;
}
