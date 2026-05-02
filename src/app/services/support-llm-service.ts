import { getTextAdapterForModel } from '#app/services/ai/ai-provider.js';
import { promptService } from '#app/services/prompt-service.js';
import type { TextUsageCompleteHandler } from '#app/services/ai/types.js';
import type { SupportChatRow } from '#app/repositories/support-repository.js';
import { resolveLanguageName } from 'shared/enums';
import logger from '#logger';
import supportConfig from '#config/support.js';

function buildNativeLanguageInstruction(langNative: string): string {
    const nativeLanguageName = resolveLanguageName(langNative);
    return [
        `The user's native language code is "${langNative}".`,
        `The user's native language is ${nativeLanguageName}.`,
        `Always answer in ${nativeLanguageName} unless the user explicitly asks you to switch to another language.`,
        `Do not choose the response language from the knowledge base context or article language.`,
    ].join(' ');
}

export const supportLlmService = {
    async *openChatStream(
        langNative: string,
        onComplete?: TextUsageCompleteHandler,
    ): AsyncGenerator<string, void, undefined> {
        const systemPromptBase = promptService.getContent('SUPPORT_FIRST_CHAT') || supportConfig.defaultFirstChatPrompt;
        const temperature = promptService.getTemperature('SUPPORT_FIRST_CHAT') ?? 0.5;
        const maxTokens = promptService.getMaxTokens('SUPPORT_FIRST_CHAT') ?? 512;
        const modelOverride = promptService.getModel('SUPPORT_FIRST_CHAT');
        const adapter = getTextAdapterForModel(modelOverride);
        const systemPrompt = `${systemPromptBase}\n\n${buildNativeLanguageInstruction(langNative)}`;

        yield* adapter.streamText(
            {
                systemPrompt,
                userPrompt: 'Start the conversation.',
                temperature,
                maxOutputTokens: maxTokens,
                modelOverride: modelOverride ?? undefined,
            },
            onComplete,
        );
    },

    async *chatStream(
        userMessage: string,
        knowledgeContext: string,
        chatHistory: SupportChatRow[],
        langNative: string,
        onComplete?: TextUsageCompleteHandler,
    ): AsyncGenerator<string, void, undefined> {
        const systemPromptTemplate = promptService.getContent('SUPPORT_SYSTEM') || supportConfig.defaultSystemPrompt;
        const temperature = promptService.getTemperature('SUPPORT_SYSTEM') ?? 0.3;
        const maxTokens = promptService.getMaxTokens('SUPPORT_SYSTEM') ?? 2048;
        const modelOverride = promptService.getModel('SUPPORT_SYSTEM');
        const adapter = getTextAdapterForModel(modelOverride);

        let injected = systemPromptTemplate.replace('{context}', knowledgeContext);
        if (injected === systemPromptTemplate) {
            logger.warn(
                { templateSource: systemPromptTemplate === supportConfig.defaultSystemPrompt ? 'default' : 'db' },
                'Support: {context} placeholder not found in system prompt — appending knowledge base context as fallback',
            );
            injected = `${systemPromptTemplate}\n\nKNOWLEDGE BASE CONTEXT:\n${knowledgeContext}`;
        }
        const systemPrompt = [injected, buildNativeLanguageInstruction(langNative)].join('\n\n');

        const historyLines = chatHistory
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n');

        const userPrompt = historyLines.length > 0
            ? `Chat history:\n${historyLines}\n\nuser: ${userMessage}`
            : `user: ${userMessage}`;

        yield* adapter.streamText(
            {
                systemPrompt,
                userPrompt,
                temperature,
                maxOutputTokens: maxTokens,
                modelOverride: modelOverride ?? undefined,
            },
            onComplete,
        );
    },
};
