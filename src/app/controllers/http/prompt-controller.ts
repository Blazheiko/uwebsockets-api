import type { HttpContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { promptService } from '#app/services/prompt-service.js';
import type { PromptType, PromptUpdate } from '#app/repositories/prompt-repository.js';
import { textAdapter } from '#app/services/ai/ai-provider.js';
import translatorConfig from '#config/translator.js';
import logger from '#logger';
import type { PromptTestInput, PromptUpdateInput } from 'shared/schemas';
import type {
    PromptGetListResponse,
    PromptGetByTypeResponse,
    PromptUpdateResponse,
    PromptTestResponse,
} from 'shared';

const PROMPT_TYPES: PromptType[] = [
    'TEACHER_SYSTEM',
    'TEACHER_APP_CAPABILITIES',
    'TEACHER_VOCABULARY_SYSTEM',
    'TEACHER_LESSON',
    'TRANSLATOR_SYSTEM',
    'TRANSLATOR_SUMMARY',
    'TRANSLATOR_REALTIME_SYSTEM',
    'IMAGE_STYLE',
    'TEACHER_FIRST_CHAT',
    'SUPPORT_SYSTEM',
    'SUPPORT_FIRST_CHAT',
    'SUPPORT_QUERY_TRANSLATION',
];

function isPromptType(value: string): value is PromptType {
    return (PROMPT_TYPES as string[]).includes(value);
}

interface MinimalFetchResponse {
    ok: boolean;
    status: number;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
}

async function callLlm(systemPrompt: string, userPrompt: string): Promise<string> {
    if (textAdapter.isConfigured()) {
        try {
            const gen = textAdapter.streamText({
                systemPrompt,
                userPrompt,
                temperature: 0.5,
                maxOutputTokens: 2000,
            });
            let result = '';
            for await (const chunk of gen) {
                result += chunk;
            }
            return result;
        } catch (error) {
            logger.warn({ err: error }, 'LLM prompt test failed, falling back to OpenAI');
        }
    }

    const openaiKey = translatorConfig.openaiApiKey;
    if (openaiKey === '') {
        throw new Error('No AI API key configured (XAI_API_KEY or OPENAI_API_KEY)');
    }

    const response = (await fetch(translatorConfig.openaiApiUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: translatorConfig.openaiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            stream: false,
            temperature: 0.5,
            max_tokens: 2000,
        }),
    })) as unknown as MinimalFetchResponse;

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI error ${String(response.status)}: ${errorText.slice(0, 200)}`);
    }

    const json = await response.json();
    if (typeof json !== 'object' || json === null) throw new Error('Invalid response');
    const choices = (json as Record<string, unknown>)['choices'];
    if (!Array.isArray(choices) || choices.length === 0) throw new Error('No choices');
    const message = (choices[0] as Record<string, unknown>)['message'];
    if (typeof message !== 'object' || message === null) throw new Error('No message');
    const content = (message as Record<string, unknown>)['content'];
    return typeof content === 'string' ? content : '';
}

export default {
    list(_context: HttpContext): PromptGetListResponse {
        return { status: 'success', data: promptService.all() };
    },

    getByType(context: HttpContext): PromptGetByTypeResponse {
        const { type } = context.httpData.params as { type: string };
        if (!isPromptType(type)) {
            context.responseData.status = 400;
            return { status: 'error', message: `Unknown prompt type: ${type}` };
        }
        const prompt = promptService.get(type);
        if (prompt === undefined) {
            context.responseData.status = 404;
            return { status: 'error', message: 'Prompt not found' };
        }
        return { status: 'success', data: prompt };
    },

    async testPrompt(context: HttpContext<PromptTestInput>): Promise<PromptTestResponse> {
        const { type } = context.httpData.params as { type: string };
        if (!isPromptType(type)) {
            context.responseData.status = 400;
            return { status: 'error', message: `Unknown prompt type: ${type}` };
        }

        const prompt = promptService.get(type);
        if (prompt === undefined) {
            context.responseData.status = 404;
            return { status: 'error', message: 'Prompt not found' };
        }

        const { message } = getTypedPayload(context);

        try {
            const result = await callLlm(prompt.content, message);
            return { status: 'success', result };
        } catch (error) {
            logger.error({ err: error }, 'Prompt test LLM call failed');
            return { status: 'error', message: 'LLM call failed' };
        }
    },

    async update(context: HttpContext<PromptUpdateInput>): Promise<PromptUpdateResponse> {
        const { type } = context.httpData.params as { type: string };
        if (!isPromptType(type)) {
            context.responseData.status = 400;
            return { status: 'error', message: `Unknown prompt type: ${type}` };
        }

        const payload = getTypedPayload(context);
        const updateData: PromptUpdate = {};

        if (payload.content !== undefined) updateData.content = payload.content;
        if ('model' in payload) updateData.model = payload.model ?? null;
        if ('temperature' in payload) updateData.temperature = payload.temperature ?? null;
        if ('maxTokens' in payload) updateData.maxTokens = payload.maxTokens ?? null;

        if (Object.keys(updateData).length === 0) {
            context.responseData.status = 400;
            return { status: 'error', message: 'Nothing to update' };
        }

        const ok = await promptService.update(type, updateData);
        if (!ok) {
            context.responseData.status = 404;
            return { status: 'error', message: 'Prompt not found or not updated' };
        }
        return { status: 'success' };
    },
};
