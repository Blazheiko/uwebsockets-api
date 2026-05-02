import { access, readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openaiEmbeddingAdapter } from '#app/services/ai/adapters/openai-embedding-adapter.js';
import { supportKnowledgeRepository } from '#app/repositories/support-knowledge-repository.js';
import { supportEmbeddingService } from '#app/services/support-embedding-service.js';
import logger from '#logger';

const INIT_DELAY_MS = 100;

export type KnowledgeBaseInitStartErrorCode =
    | 'ALREADY_RUNNING'
    | 'EMBEDDINGS_NOT_CONFIGURED'
    | 'NOT_EMPTY';

export interface KnowledgeBaseInitStatus {
    state: 'idle' | 'running' | 'completed' | 'failed';
    totalFiles: number;
    processedFiles: number;
    createdArticles: number;
    failedFiles: number;
    progressPercent: number;
    currentFile: string | null;
    startedAt: string | null;
    completedAt: string | null;
    message: string | null;
}

const status: KnowledgeBaseInitStatus = {
    state: 'idle',
    totalFiles: 0,
    processedFiles: 0,
    createdArticles: 0,
    failedFiles: 0,
    progressPercent: 0,
    currentFile: null,
    startedAt: null,
    completedAt: null,
    message: null,
};

function cloneStatus(): KnowledgeBaseInitStatus {
    return { ...status };
}

function setProgress(): void {
    status.progressPercent = status.totalFiles === 0
        ? 0
        : Math.min(100, Math.round((status.processedFiles / status.totalFiles) * 100));
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function parseArticleFile(raw: string, filename: string): { title: string; content: string } {
    const normalized = raw.replace(/\r\n/g, '\n').trim();
    const lines = normalized.split('\n');
    const title = lines.find((line) => line.trim().length > 0)?.trim() ?? basename(filename, '.txt');
    const titleIndex = lines.findIndex((line) => line.trim() === title);
    const content = lines
        .slice(titleIndex >= 0 ? titleIndex + 1 : 0)
        .join('\n')
        .trim();

    return {
        title,
        content: content.length > 0 ? content : normalized,
    };
}

function inferCategory(filename: string): string | null {
    const lower = filename.toLowerCase();
    if (lower.includes('translator')) return 'translator';
    if (lower.includes('teacher') || lower.includes('lesson') || lower.includes('syntax')) return 'teacher';
    if (lower.includes('vocabulary')) return 'vocabulary';
    if (lower.includes('support')) return 'support';
    if (lower.includes('admin')) return 'admin';
    if (lower.includes('account') || lower.includes('calendar') || lower.includes('notes')) return 'account';
    if (lower.includes('login') || lower.includes('navigation')) return 'getting-started';
    if (lower.includes('contact') || lower.includes('chat')) return 'chat';
    return null;
}

async function resolveKnowledgeBaseDir(): Promise<string> {
    const candidates = [
        join(process.cwd(), 'docs', 'support-knowledge-base'),
        fileURLToPath(new URL('../../../../../docs/support-knowledge-base/', import.meta.url)),
    ];

    for (const candidate of candidates) {
        try {
            await access(candidate);
            return candidate;
        } catch {
            continue;
        }
    }

    throw new Error('Knowledge base source directory not found');
}

async function runInit(): Promise<void> {
    try {
        const knowledgeBaseDir = await resolveKnowledgeBaseDir();
        const files = (await readdir(knowledgeBaseDir))
            .filter((name) => name.endsWith('.txt') && name !== 'README.txt')
            .sort((a, b) => a.localeCompare(b));

        status.totalFiles = files.length;
        setProgress();

        for (let index = 0; index < files.length; index++) {
            const filename = files[index];
            if (filename === undefined) continue;

            status.currentFile = filename;

            try {
                const raw = await readFile(join(knowledgeBaseDir, filename), 'utf8');
                const article = parseArticleFile(raw, filename);
                const created = await supportKnowledgeRepository.create({
                    title: article.title,
                    content: article.content,
                    category: inferCategory(filename),
                    isActive: true,
                });
                await supportEmbeddingService.indexArticle(created.id, created.title, created.content);
                status.createdArticles += 1;
            } catch (err) {
                status.failedFiles += 1;
                logger.error({ err, filename }, 'Knowledge base init: failed to import article');
            } finally {
                status.processedFiles += 1;
                setProgress();
            }

            if (index < files.length - 1) {
                await delay(INIT_DELAY_MS);
            }
        }

        status.currentFile = null;
        status.completedAt = new Date().toISOString();
        if (status.failedFiles > 0) {
            status.state = 'failed';
            status.message = `Completed with ${String(status.failedFiles)} failed file(s).`;
        } else {
            status.state = 'completed';
            status.message = `Imported ${String(status.createdArticles)} article(s).`;
        }
    } catch (err) {
        logger.error({ err }, 'Knowledge base init: unexpected failure');
        status.state = 'failed';
        status.currentFile = null;
        status.completedAt = new Date().toISOString();
        status.message = err instanceof Error ? err.message : 'Knowledge base initialization failed';
    }
}

export const knowledgeBaseInitService = {
    getStatus(): KnowledgeBaseInitStatus {
        return cloneStatus();
    },

    async start(): Promise<{
        ok: boolean;
        status: KnowledgeBaseInitStatus;
        message?: string;
        errorCode?: KnowledgeBaseInitStartErrorCode;
    }> {
        if (status.state === 'running') {
            return {
                ok: false,
                status: cloneStatus(),
                message: 'Knowledge base initialization is already running',
                errorCode: 'ALREADY_RUNNING',
            };
        }

        if (!openaiEmbeddingAdapter.isConfigured()) {
            return {
                ok: false,
                status: cloneStatus(),
                message: 'OpenAI embeddings are not configured',
                errorCode: 'EMBEDDINGS_NOT_CONFIGURED',
            };
        }

        const existing = await supportKnowledgeRepository.findAll({ limit: 1, offset: 0 });
        if (existing.total > 0) {
            return {
                ok: false,
                status: cloneStatus(),
                message: 'Knowledge base is not empty',
                errorCode: 'NOT_EMPTY',
            };
        }

        status.state = 'running';
        status.totalFiles = 0;
        status.processedFiles = 0;
        status.createdArticles = 0;
        status.failedFiles = 0;
        status.progressPercent = 0;
        status.currentFile = null;
        status.startedAt = new Date().toISOString();
        status.completedAt = null;
        status.message = null;

        void runInit();

        return {
            ok: true,
            status: cloneStatus(),
        };
    },
};
