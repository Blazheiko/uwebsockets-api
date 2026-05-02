import { createHash } from 'node:crypto';
import aiConfig from '#config/ai.js';
import diskConfig from '#config/disk.js';
import { teacherPhraseAudioScopeEnum } from '#database/schema.js';
import { ttsAdapter } from '#app/services/ai/ai-provider.js';
import { uploadToS3 } from '#vendor/utils/storage/s3.js';
import logger from '#logger';

export type StudyAudioScope = typeof teacherPhraseAudioScopeEnum.enumValues[number];
const TTS_GENERATION_TIMEOUT_MS = 30_000;
const studyAudioGenerationLocks = new Map<string, Promise<string>>();

function sanitizeStudyAudioSegment(value: string): string {
    return value
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120) || 'default';
}

export function normalizeStudyAudioText(text: string): string {
    return text
        .normalize('NFC')
        .trim()
        .replace(/\s+/g, ' ');
}

export function canonicalizeStudyAudioLanguage(language: string): string {
    const normalized = language.normalize('NFC').trim();
    if (normalized.length === 0) {
        return 'und';
    }

    try {
        return Intl.getCanonicalLocales(normalized)[0] ?? normalized;
    } catch {
        return normalized;
    }
}

export function requireStudyAudioLanguage(language: string, context: string): string {
    const normalized = canonicalizeStudyAudioLanguage(language);
    if (normalized === 'und') {
        throw new Error(`Study audio language is required for ${context}`);
    }
    return normalized;
}

export function buildStudyAudioHash(params: { text: string; language: string }): string {
    const normalizedText = normalizeStudyAudioText(params.text);
    const normalizedLanguage = canonicalizeStudyAudioLanguage(params.language);
    return createHash('sha1')
        .update(normalizedLanguage)
        .update('\0')
        .update(normalizedText)
        .digest('hex');
}

export function buildStudyAudioLookupKey(params: {
    scope: StudyAudioScope;
    scopeId: bigint;
    voice: string;
    language: string;
    contentHash: string;
}): string {
    return [
        params.scope,
        String(params.scopeId),
        params.voice,
        canonicalizeStudyAudioLanguage(params.language),
        params.contentHash,
    ].join(':');
}

export function buildStudyAudioEntityKey(params: {
    scope: StudyAudioScope;
    scopeId: bigint;
    voice: string;
    language: string;
    contentHash: string;
}): string {
    const normalizedLanguage = canonicalizeStudyAudioLanguage(params.language);
    return [
        'study-audio',
        params.scope,
        String(params.scopeId),
        sanitizeStudyAudioSegment(normalizedLanguage),
        sanitizeStudyAudioSegment(params.voice),
        `${params.contentHash}.mp3`,
    ].join('/');
}

export function resolveStudyVoice(): string {
    return aiConfig.grokTts.studyVoice;
}

export function buildFullS3Key(key: string): string {
    const s3DynamicDataPrefix = (
        diskConfig.s3DynamicDataPrefix ?? 'uploads'
    ).replace(/^\/+|\/+$/g, '');
    const prefix = (diskConfig.s3Prefix ?? 'app').replace(/^\/+|\/+$/g, '');
    return `${prefix}/${s3DynamicDataPrefix}/${key}`;
}

export function buildS3FileUrl(key: string): string {
    const endpoint = (diskConfig.s3Endpoint ?? '').replace(/\/+$/g, '');
    const bucket = diskConfig.s3Bucket ?? '';
    const fullKey = buildFullS3Key(key);
    if (endpoint.length === 0 || bucket.length === 0) {
        return fullKey;
    }
    return `${endpoint}/${bucket}/${fullKey}`;
}

export async function synthesizeStudyAudioToUrl(
    lockKey: string,
    entityKey: string,
    text: string,
    voice: string,
    language: string,
): Promise<string> {
    const existingLock = studyAudioGenerationLocks.get(lockKey);
    if (existingLock !== undefined) {
        logger.info({ lockKey }, 'Study audio generate conflict: reusing in-flight generation');
        return existingLock;
    }

    const generationPromise = (async (): Promise<string> => {
        const { buffer, contentType } = await ttsAdapter.synthesizeToBuffer({
            text,
            voice,
            language,
        });
        await uploadToS3(entityKey, buffer, contentType);
        return buildS3FileUrl(entityKey);
    })();

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error('TTS generation timed out'));
        }, TTS_GENERATION_TIMEOUT_MS);
    });

    const racedPromise = Promise.race([generationPromise, timeoutPromise]);
    studyAudioGenerationLocks.set(lockKey, racedPromise);

    try {
        return await racedPromise;
    } finally {
        if (timeoutHandle !== null) {
            clearTimeout(timeoutHandle);
        }
        studyAudioGenerationLocks.delete(lockKey);
    }
}
