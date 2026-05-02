import { promptRepository } from '#app/repositories/prompt-repository.js';
import type { PromptRow, PromptType, PromptUpdate } from '#app/repositories/prompt-repository.js';
import logger from '#logger';

const cache = new Map<PromptType, PromptRow>();

export const promptService = {
    async load(): Promise<void> {
        const rows = await promptRepository.findAll();
        for (const row of rows) {
            cache.set(row.type, row);
        }
        logger.info(`PromptService: loaded ${String(rows.length)} prompts`);
    },

    get(type: PromptType): PromptRow | undefined {
        return cache.get(type);
    },

    getContent(type: PromptType): string {
        return cache.get(type)?.content ?? '';
    },

    getModel(type: PromptType): string | null {
        return cache.get(type)?.model ?? null;
    },

    getTemperature(type: PromptType): number | null {
        return cache.get(type)?.temperature ?? null;
    },

    getMaxTokens(type: PromptType): number | null {
        return cache.get(type)?.maxTokens ?? null;
    },

    async update(type: PromptType, data: PromptUpdate): Promise<boolean> {
        const ok = await promptRepository.update(type, data);
        if (ok) {
            const updated = await promptRepository.findByType(type);
            if (updated !== undefined) cache.set(type, updated);
        }
        return ok;
    },

    all(): PromptRow[] {
        return [...cache.values()];
    },
};
