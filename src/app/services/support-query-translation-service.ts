import { getTextAdapterForModel } from '#app/services/ai/ai-provider.js';
import { promptService } from '#app/services/prompt-service.js';
import logger from '#logger';

const DEFAULT_SYSTEM_PROMPT =
    'Translate the following user support question into English. ' +
    'Return ONLY the English translation, nothing else. ' +
    'If the text is already in English, return it unchanged.';

export const supportQueryTranslationService = {
    async translateToEnglish(text: string): Promise<string> {
        const model = promptService.getModel('SUPPORT_QUERY_TRANSLATION');
        const temperature = promptService.getTemperature('SUPPORT_QUERY_TRANSLATION') ?? 0.1;
        const maxTokens = promptService.getMaxTokens('SUPPORT_QUERY_TRANSLATION') ?? 500;
        const systemPrompt = promptService.getContent('SUPPORT_QUERY_TRANSLATION') || DEFAULT_SYSTEM_PROMPT;

        const adapter = getTextAdapterForModel(model);
        if (!adapter.isConfigured()) {
            logger.warn('Support query translation: text adapter not configured, using original query');
            return text;
        }

        try {
            let result = '';
            for await (const chunk of adapter.streamText({
                systemPrompt,
                userPrompt: text,
                temperature,
                maxOutputTokens: maxTokens,
                modelOverride: model ?? undefined,
            })) {
                result += chunk;
            }
            const englishQuery = result.trim();
            return englishQuery.length > 0 ? englishQuery : text;
        } catch (err) {
            logger.error(
                { err, originalLength: text.length, originalQuery: text },
                'Support: query translation failed, using original',
            );
            return text;
        }
    },
};
