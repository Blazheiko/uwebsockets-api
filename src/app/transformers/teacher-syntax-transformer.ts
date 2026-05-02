import { DateTime } from 'luxon';
import type {
    TeacherSyntaxLessonRow,
    TeacherSyntaxLessonListRow,
    TeacherSyntaxSectionRow,
    TeacherSyntaxExampleRow,
    TeacherSyntaxExerciseRow,
    TeacherSyntaxExerciseOptionRow,
    TeacherSyntaxUserLessonRow,
    TeacherSyntaxAttemptRow,
    TeacherSyntaxExerciseAttemptRow,
} from '#app/repositories/teacher-syntax-repository.js';

export interface SerializedSyntaxLessonPreview {
    id: string;
    langLearning: string;
    langNative: string;
    sourceTopic: string;
    topicSlug: string;
    topicTitle: string;
    ruleSummary: string;
    levelCode: string | null;
    status: string;
    created_at: string | null;
    updated_at: string | null;
    pronunciationConfig: {
        threshold: number;
        skipAfterAttempts: number;
    };
    progress?: SerializedSyntaxProgress | null;
}

export interface SerializedSyntaxLessonFull extends SerializedSyntaxLessonPreview {
    studyTopic: string | null;
    learningGoal: string | null;
    sections: SerializedSyntaxSection[];
    examples: SerializedSyntaxExample[];
    exercises: SerializedSyntaxExercise[];
}

export interface SerializedSyntaxSection {
    id: string;
    sortOrder: number;
    heading: string;
    content: string;
}

export interface SerializedSyntaxExample {
    id: string;
    sortOrder: number;
    sentence: string;
    translation: string;
    highlight: string | null;
    note: string | null;
    voiceSrc: string | null;
}

export interface SerializedSyntaxExercise {
    id: string;
    sortOrder: number;
    type: string;
    instruction: string;
    promptText: string;
    correctAnswer: string;
    repeatPhrase: string;
    repeatTranslation: string | null;
    repeatHint: string | null;
    repeatVoiceSrc: string | null;
    explanation: string | null;
    meta: unknown;
    options?: SerializedSyntaxExerciseOption[];
}

export interface SerializedSyntaxExerciseOption {
    id: string;
    sortOrder: number;
    text: string;
    isCorrect: boolean;
}

export interface SerializedSyntaxProgress {
    lessonId: string;
    totalExercises: number;
    completedExercises: number;
    pronouncedExercises: number;
    correctCount: number;
    mistakesCount: number;
    masteryStatus: string;
    last_practiced_at: string | null;
    updated_at: string | null;
}

export interface SerializedSyntaxAttempt {
    id: string;
    lessonId: string;
    started_at: string | null;
    completed_at: string | null;
    totalExercises: number;
    correctCount: number;
    mistakesCount: number;
    resultStatus: string;
    exerciseAttempts?: SerializedSyntaxExerciseAttempt[];
}

export interface SerializedSyntaxExerciseAttempt {
    id: string;
    exerciseId: string;
    userAnswer: string;
    isCorrect: boolean;
    feedback: string | null;
    recognizedText: string | null;
    pronunciationScore: number | null;
    pronunciationStatus: 'pending' | 'passed' | 'skipped';
    skipReason: 'attempt_limit' | 'technical_unavailable' | null;
    pronunciationAttemptsCount: number;
    pronunciationPassedAt: string | null;
    completedAt: string | null;
    answered_at: string | null;
}

function toIso(date: Date | null): string | null {
    if (date === null) return null;
    return DateTime.fromJSDate(date).toISO();
}

export const teacherSyntaxLessonTransformer = {
    serializePreview(
        row: TeacherSyntaxLessonRow | TeacherSyntaxLessonListRow,
        progress?: TeacherSyntaxUserLessonRow | null,
        pronunciationConfig: { threshold: number; skipAfterAttempts: number } = {
            threshold: 0.8,
            skipAfterAttempts: 3,
        },
    ): SerializedSyntaxLessonPreview {
        return {
            id: String(row.id),
            langLearning: row.langLearning,
            langNative: row.langNative,
            sourceTopic: row.sourceTopic,
            topicSlug: row.topicSlug,
            topicTitle: row.topicTitle,
            ruleSummary: row.ruleSummary,
            levelCode: row.levelCode,
            status: row.status,
            created_at: toIso(row.createdAt),
            updated_at: toIso(row.updatedAt),
            pronunciationConfig,
            progress: progress !== undefined && progress !== null
                ? teacherSyntaxProgressTransformer.serialize(progress)
                : null,
        };
    },

    serializeFull(
        row: TeacherSyntaxLessonRow,
        sections: TeacherSyntaxSectionRow[],
        examples: TeacherSyntaxExampleRow[],
        exercises: TeacherSyntaxExerciseRow[],
        exerciseOptions: TeacherSyntaxExerciseOptionRow[],
        progress?: TeacherSyntaxUserLessonRow | null,
        exampleVoiceSrcById?: Map<string, string>,
        exerciseVoiceSrcById?: Map<string, string>,
        pronunciationConfig?: { threshold: number; skipAfterAttempts: number },
    ): SerializedSyntaxLessonFull {
        const optionsByExercise = new Map<string, SerializedSyntaxExerciseOption[]>();
        for (const opt of exerciseOptions) {
            const key = String(opt.exerciseId);
            const list = optionsByExercise.get(key) ?? [];
            list.push(teacherSyntaxExerciseOptionTransformer.serialize(opt));
            optionsByExercise.set(key, list);
        }

        return {
            ...teacherSyntaxLessonTransformer.serializePreview(row, progress, pronunciationConfig),
            studyTopic: row.studyTopic,
            learningGoal: row.learningGoal,
            sections: sections.map((s) => teacherSyntaxSectionTransformer.serialize(s)),
            examples: examples.map((e) => teacherSyntaxExampleTransformer.serialize(
                e,
                exampleVoiceSrcById?.get(String(e.id)) ?? null,
            )),
            exercises: exercises.map((ex) => {
                const serialized = teacherSyntaxExerciseTransformer.serialize(
                    ex,
                    exerciseVoiceSrcById?.get(String(ex.id)) ?? null,
                );
                serialized.options = optionsByExercise.get(String(ex.id)) ?? [];
                return serialized;
            }),
        };
    },
};

export const teacherSyntaxSectionTransformer = {
    serialize(row: TeacherSyntaxSectionRow): SerializedSyntaxSection {
        return {
            id: String(row.id),
            sortOrder: row.sortOrder,
            heading: row.heading,
            content: row.content,
        };
    },
};

export const teacherSyntaxExampleTransformer = {
    serialize(row: TeacherSyntaxExampleRow, voiceSrc: string | null = null): SerializedSyntaxExample {
        return {
            id: String(row.id),
            sortOrder: row.sortOrder,
            sentence: row.sentence,
            translation: row.translation,
            highlight: row.highlight,
            note: row.note,
            voiceSrc,
        };
    },
};

export const teacherSyntaxExerciseTransformer = {
    serialize(row: TeacherSyntaxExerciseRow, repeatVoiceSrc: string | null = null): SerializedSyntaxExercise {
        return {
            id: String(row.id),
            sortOrder: row.sortOrder,
            type: row.type,
            instruction: row.instruction,
            promptText: row.promptText,
            correctAnswer: row.correctAnswer,
            repeatPhrase: row.repeatPhrase,
            repeatTranslation: row.repeatTranslation,
            repeatHint: row.repeatHint,
            repeatVoiceSrc,
            explanation: row.explanation,
            meta: row.meta,
        };
    },
};

export const teacherSyntaxExerciseOptionTransformer = {
    serialize(row: TeacherSyntaxExerciseOptionRow): SerializedSyntaxExerciseOption {
        return {
            id: String(row.id),
            sortOrder: row.sortOrder,
            text: row.text,
            isCorrect: row.isCorrect,
        };
    },
};

export const teacherSyntaxProgressTransformer = {
    serialize(row: TeacherSyntaxUserLessonRow): SerializedSyntaxProgress {
        return {
            lessonId: String(row.lessonId),
            totalExercises: row.totalExercises,
            completedExercises: row.completedExercises,
            pronouncedExercises: row.pronouncedExercises,
            correctCount: row.correctCount,
            mistakesCount: row.mistakesCount,
            masteryStatus: row.masteryStatus,
            last_practiced_at: toIso(row.lastPracticedAt),
            updated_at: toIso(row.updatedAt),
        };
    },
};

export const teacherSyntaxAttemptTransformer = {
    serialize(row: TeacherSyntaxAttemptRow): SerializedSyntaxAttempt {
        return {
            id: String(row.id),
            lessonId: String(row.lessonId),
            started_at: toIso(row.startedAt),
            completed_at: toIso(row.completedAt),
            totalExercises: row.totalExercises,
            correctCount: row.correctCount,
            mistakesCount: row.mistakesCount,
            resultStatus: row.resultStatus,
        };
    },
};

export const teacherSyntaxExerciseAttemptTransformer = {
    serialize(row: TeacherSyntaxExerciseAttemptRow): SerializedSyntaxExerciseAttempt {
        return {
            id: String(row.id),
            exerciseId: String(row.exerciseId),
            userAnswer: row.userAnswer,
            isCorrect: row.isCorrect,
            feedback: row.feedback,
            recognizedText: row.recognizedText,
            pronunciationScore: row.pronunciationScore === null ? null : Number(row.pronunciationScore),
            pronunciationStatus: row.pronunciationStatus,
            skipReason: row.skipReason,
            pronunciationAttemptsCount: row.pronunciationAttemptsCount,
            pronunciationPassedAt: toIso(row.pronunciationPassedAt),
            completedAt: toIso(row.completedAt),
            answered_at: toIso(row.answeredAt),
        };
    },
};
