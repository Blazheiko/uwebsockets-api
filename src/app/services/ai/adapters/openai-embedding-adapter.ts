import OpenAI from 'openai';
import aiConfig from '#config/ai.js';

const cfg = aiConfig.openaiEmbedding;

let client: OpenAI | undefined;

function getClient(): OpenAI {
    if (client === undefined) {
        client = new OpenAI({ apiKey: cfg.apiKey });
    }
    return client;
}

export const openaiEmbeddingAdapter = {
    isConfigured(): boolean {
        return cfg.apiKey !== '';
    },

    async embed(text: string): Promise<number[]> {
        const response = await getClient().embeddings.create({
            model: cfg.model,
            input: text,
            dimensions: cfg.dimensions,
        });

        const data = response.data[0];
        if (data === undefined) {
            throw new Error('OpenAI Embedding: empty response');
        }
        return data.embedding;
    },

    async embedBatch(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) return [];

        const response = await getClient().embeddings.create({
            model: cfg.model,
            input: texts,
            dimensions: cfg.dimensions,
        });

        const sorted = [...response.data].sort((a, b) => a.index - b.index);
        return sorted.map((d) => d.embedding);
    },
};
