import { supportRepository } from '#app/repositories/support-repository.js';
import { teacherSettingsRepository } from '#app/repositories/teacher-settings-repository.js';
import { supportEmbeddingService } from '#app/services/support-embedding-service.js';
import { supportLlmService } from '#app/services/support-llm-service.js';
import { supportQueryTranslationService } from '#app/services/support-query-translation-service.js';
import { broadcastService } from '#app/services/broadcast-service.js';
import { llmUsageService } from '#app/services/llm-usage-service.js';
import { ttsAdapter } from '#app/services/ai/ai-provider.js';
import { promptService } from '#app/services/prompt-service.js';
import {
    TtsSentenceQueue,
    extractCompleteSentences,
    prepareTextForTts,
} from '#app/services/tts-sentence-utils.js';
import {
    decodeBase64AudioChunk,
    nextTtsSessionId,
} from '#app/services/teacher-tts-binary-packet.js';
import aiConfig from '#config/ai.js';
import { resolveGrokVoice } from '#app/services/ai/grok-tts-helpers.js';
import logger from '#logger';

const TTS_MAX_RETRIES = 3;
const TTS_RETRY_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => { setTimeout(resolve, ms) });
}

function broadcastToConnection(
    userIdStr: string,
    targetUuid: string | undefined,
    event: string,
    payload: Record<string, unknown>,
): void {
    if (targetUuid !== undefined) {
        const sent = broadcastService.broadcastMessageToUserConnection(userIdStr, targetUuid, event, payload);
        if (sent === 0) {
            broadcastService.broadcastMessageToUser(userIdStr, event, payload);
        }
    } else {
        broadcastService.broadcastMessageToUser(userIdStr, event, payload);
    }
}

function extractScreenshotIds(text: string): string[] {
    const ids: string[] = [];
    const regex = /\[screenshot:(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        if (match[1] !== undefined) {
            ids.push(match[1]);
        }
    }
    return ids;
}

function formatKnowledgeContext(results: Awaited<ReturnType<typeof supportEmbeddingService.search>>): string {
    if (results.length === 0) {
        return 'No relevant articles found in the knowledge base.';
    }
    return results
        .map((r, i) => {
            const screenshotNote = r.screenshotKey !== null
                ? `\n[This article has a screenshot. Use [screenshot:${String(r.id)}] to show it if relevant.]`
                : '';
            return `--- Article ${i + 1} (id: ${String(r.id)}) ---\nTitle: ${r.title}\n${r.content}${screenshotNote}`;
        })
        .join('\n\n');
}

function resolveSupportNativeLanguage(langNative?: string): string {
    const normalized = langNative?.trim();
    return normalized !== undefined && normalized.length > 0 ? normalized : 'ru';
}

interface StreamChunkResult {
    nextIndex: number;
    sessionId: number;
}

async function streamSupportTtsChunks(
    userIdStr: string,
    prepared: string,
    startIndex: number,
    voice: string,
    sessionId: number,
    targetUuid?: string,
): Promise<StreamChunkResult> {
    let lastError: unknown;
    let currentSessionId = sessionId;

    for (let attempt = 0; attempt <= TTS_MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            currentSessionId = nextTtsSessionId();
            await delay(TTS_RETRY_DELAY_MS);
            startIndex = 0;
        }

        try {
            let index = startIndex;
            for await (const chunkBase64 of ttsAdapter.synthesizeStream({ text: prepared, voice, language: '' })) {
                const pcmBytes = decodeBase64AudioChunk(chunkBase64);
                if (pcmBytes.length === 0) continue;

                if (targetUuid !== undefined) {
                    const sent = broadcastService.broadcastSupportTtsChunkBinaryToConnection(
                        userIdStr,
                        targetUuid,
                        { index: index++, sessionId: currentSessionId, pcmBytes },
                    );
                    if (sent === 0) {
                        broadcastService.broadcastSupportTtsChunkBinary(userIdStr, {
                            index: index - 1,
                            sessionId: currentSessionId,
                            pcmBytes,
                        });
                    }
                } else {
                    broadcastService.broadcastSupportTtsChunkBinary(userIdStr, {
                        index: index++,
                        sessionId: currentSessionId,
                        pcmBytes,
                    });
                }
            }
            return { nextIndex: index, sessionId: currentSessionId };
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}

async function processSupportTtsSentenceQueue(
    userIdStr: string,
    queue: TtsSentenceQueue,
    voice: string,
    targetUuid?: string,
): Promise<void> {
    let globalIndex = 0;
    let sessionId = nextTtsSessionId();

    try {
        for await (const sentence of queue) {
            const prepared = prepareTextForTts(sentence);
            if (prepared.length === 0) continue;
            const result = await streamSupportTtsChunks(
                userIdStr,
                prepared,
                globalIndex,
                voice,
                sessionId,
                targetUuid,
            );
            globalIndex = result.nextIndex;
            sessionId = result.sessionId;
        }

        const completeFn = (): void => {
            broadcastService.broadcastMessageToUser(userIdStr, 'support_tts_complete', {});
        };

        if (targetUuid !== undefined) {
            const sent = broadcastService.broadcastMessageToUserConnection(
                userIdStr, targetUuid, 'support_tts_complete', {},
            );
            if (sent === 0) completeFn();
        } else {
            completeFn();
        }
    } catch (err) {
        logger.error({ err, userIdStr }, 'Support: TTS streaming failed');
        broadcastService.broadcastMessageToUser(userIdStr, 'support_tts_error', {
            message: 'TTS streaming failed',
        });
    }
}

export const supportService = {
    async openChat(
        userId: bigint,
        withTts = false,
        targetUuid?: string,
    ): Promise<void> {
        const userIdStr = String(userId);
        try {
            const settings = await teacherSettingsRepository.findByUserId(userId);
            const langNative = resolveSupportNativeLanguage(settings?.langNative);
            const existing = await supportRepository.findChatHistory(userId, 1);
            if (existing.length > 0) {
                return;
            }

            const voice = resolveGrokVoice(undefined, aiConfig.grokTts.defaultVoice);
            const ttsQueue = withTts && ttsAdapter.isConfigured() ? new TtsSentenceQueue() : null;
            let sentenceAccum = '';
            const promptId = promptService.get('SUPPORT_FIRST_CHAT')?.id ?? null;

            if (ttsQueue !== null) {
                void processSupportTtsSentenceQueue(userIdStr, ttsQueue, voice, targetUuid);
            }

            let fullReply = '';
            for await (const token of supportLlmService.openChatStream(
                langNative,
                (usage, model, finalPrompt) => {
                    llmUsageService.recordText({
                        userId,
                        llmSystemPromptId: promptId,
                        model,
                        feature: 'SUPPORT_CHAT',
                        finalPrompt,
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens,
                    });
                },
            )) {
                fullReply += token;
                broadcastToConnection(userIdStr, targetUuid, 'support_chat_token', { token });
                if (ttsQueue !== null) {
                    sentenceAccum += token;
                    const extracted = extractCompleteSentences(sentenceAccum);
                    for (const s of extracted.sentences) {
                        ttsQueue.push(s);
                    }
                    sentenceAccum = extracted.remainder;
                }
            }

            if (ttsQueue !== null) {
                if (sentenceAccum.trim().length > 0) ttsQueue.push(sentenceAccum);
                ttsQueue.close();
            }

            if (fullReply.length > 0) {
                await supportRepository.addChatMessage(userId, 'assistant', fullReply);
            }

            broadcastToConnection(userIdStr, targetUuid, 'support_chat_complete', {
                content: fullReply,
                screenshots: [],
            });
        } catch (err) {
            logger.error({ err, userId: userIdStr }, 'Support: openChat failed');
            broadcastToConnection(userIdStr, targetUuid, 'support_chat_error', {
                message: 'Failed to open support chat',
            });
        }
    },

    async chat(
        userId: bigint,
        message: string,
        withTts = false,
        targetUuid?: string,
    ): Promise<void> {
        const userIdStr = String(userId);
        try {
            const settings = await teacherSettingsRepository.findByUserId(userId);
            const langNative = resolveSupportNativeLanguage(settings?.langNative);
            await supportRepository.addChatMessage(userId, 'user', message);

            const [englishQuery, chatHistory] = await Promise.all([
                supportQueryTranslationService.translateToEnglish(message),
                supportRepository.findChatHistory(userId, 20),
            ]);

            const searchResults = await supportEmbeddingService.search(englishQuery, 5);
            const knowledgeContext = formatKnowledgeContext(searchResults);
            const promptId = promptService.get('SUPPORT_SYSTEM')?.id ?? null;

            const voice = resolveGrokVoice(undefined, aiConfig.grokTts.defaultVoice);
            const ttsQueue = withTts && ttsAdapter.isConfigured() ? new TtsSentenceQueue() : null;
            let sentenceAccum = '';

            if (ttsQueue !== null) {
                void processSupportTtsSentenceQueue(userIdStr, ttsQueue, voice, targetUuid);
            }

            let fullReply = '';
            for await (const token of supportLlmService.chatStream(
                message,
                knowledgeContext,
                chatHistory.filter((m) => m.role !== 'user' || m.content !== message),
                langNative,
                (usage, model, finalPrompt) => {
                    llmUsageService.recordText({
                        userId,
                        llmSystemPromptId: promptId,
                        model,
                        feature: 'SUPPORT_CHAT',
                        finalPrompt,
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens,
                    });
                },
            )) {
                fullReply += token;
                broadcastToConnection(userIdStr, targetUuid, 'support_chat_token', { token });
                if (ttsQueue !== null) {
                    sentenceAccum += token;
                    const extracted = extractCompleteSentences(sentenceAccum);
                    for (const s of extracted.sentences) {
                        ttsQueue.push(s);
                    }
                    sentenceAccum = extracted.remainder;
                }
            }

            if (ttsQueue !== null) {
                if (sentenceAccum.trim().length > 0) ttsQueue.push(sentenceAccum);
                ttsQueue.close();
            }

            const screenshotIds = extractScreenshotIds(fullReply);

            await supportRepository.addChatMessage(
                userId,
                'assistant',
                fullReply,
                screenshotIds,
            );

            broadcastToConnection(userIdStr, targetUuid, 'support_chat_complete', {
                content: fullReply,
                screenshots: screenshotIds,
            });
        } catch (err) {
            logger.error({ err, userId: userIdStr }, 'Support: chat failed');
            broadcastToConnection(userIdStr, targetUuid, 'support_chat_error', {
                message: 'Chat failed',
            });
        }
    },
};
