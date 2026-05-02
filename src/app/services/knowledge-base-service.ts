import { randomUUID } from 'node:crypto';
import { supportKnowledgeRepository } from '#app/repositories/support-knowledge-repository.js';
import { supportEmbeddingService } from '#app/services/support-embedding-service.js';
import { uploadToS3, deleteFromS3 } from '#vendor/utils/storage/s3.js';
import diskConfig from '#config/disk.js';
import {
    failure,
    success,
    type ServiceResult,
} from '#app/services/shared/service-result.js';
import type { KbArticleRow } from '#app/repositories/support-knowledge-repository.js';
import type { UploadedFile } from '#vendor/types/types.js';
import logger from '#logger';

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_SCREENSHOT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function buildFullS3Key(key: string): string {
    const s3DynamicDataPrefix = (diskConfig.s3DynamicDataPrefix ?? 'uploads').replace(/^\/+|\/+$/g, '');
    const prefix = (diskConfig.s3Prefix ?? 'app').replace(/^\/+|\/+$/g, '');
    return `${prefix}/${s3DynamicDataPrefix}/${key}`;
}

function getExtFromMime(mime: string): string {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'jpg';
}

export interface KbItemData {
    id: string;
    title: string;
    content: string;
    category: string | null;
    isActive: boolean;
    hasScreenshot: boolean;
    screenshotKey: string | null;
    embeddingIndexed: boolean;
    createdAt: string;
    updatedAt: string;
}

function rowToData(row: KbArticleRow): KbItemData {
    return {
        id: String(row.id),
        title: row.title,
        content: row.content,
        category: row.category,
        isActive: row.isActive,
        hasScreenshot: row.screenshotKey !== null,
        screenshotKey: row.screenshotKey,
        embeddingIndexed: row.embeddingIndexed,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export const knowledgeBaseService = {
    async getAll(opts: { category?: string; page?: number; limit?: number }): Promise<ServiceResult<{ items: KbItemData[]; total: number }>> {
        const limit = opts.limit ?? 50;
        const offset = ((opts.page ?? 1) - 1) * limit;
        const { rows, total } = await supportKnowledgeRepository.findAll({
            ...(opts.category !== undefined ? { category: opts.category } : {}),
            limit,
            offset,
        });
        return success({ items: rows.map(rowToData), total });
    },

    async getById(id: bigint): Promise<ServiceResult<{ item: KbItemData }>> {
        const row = await supportKnowledgeRepository.findById(id);
        if (row === undefined) {
            return failure('NOT_FOUND', 'Article not found');
        }
        return success({ item: rowToData(row) });
    },

    async create(data: {
        title: string;
        content: string;
        category?: string | null;
        isActive?: boolean;
    }): Promise<ServiceResult<{ item: KbItemData }>> {
        const row = await supportKnowledgeRepository.create(data);
        // Fire-and-forget embedding generation
        void supportEmbeddingService.indexArticle(row.id, row.title, row.content).catch((err: unknown) => {
            logger.error({ err, articleId: String(row.id) }, 'Failed to index new KB article');
        });

        const created = await supportKnowledgeRepository.findById(row.id);
        if (created === undefined) {
            return failure('INTERNAL', 'Article not found after create');
        }

        return success({ item: rowToData(created) });
    },

    async update(id: bigint, data: {
        title?: string;
        content?: string;
        category?: string | null;
        isActive?: boolean;
    }): Promise<ServiceResult<{ item: KbItemData }>> {
        const existing = await supportKnowledgeRepository.findById(id);
        if (existing === undefined) {
            return failure('NOT_FOUND', 'Article not found');
        }
        const updated = await supportKnowledgeRepository.update(id, data);
        if (updated === undefined) {
            return failure('INTERNAL', 'Failed to update article');
        }
        // Re-index if content changed
        if (data.title !== undefined || data.content !== undefined) {
            void supportEmbeddingService.indexArticle(updated.id, updated.title, updated.content).catch((err: unknown) => {
                logger.error({ err, articleId: String(id) }, 'Failed to re-index KB article');
            });
        }

        const updatedWithStatus = await supportKnowledgeRepository.findById(id);
        if (updatedWithStatus === undefined) {
            return failure('INTERNAL', 'Article not found after update');
        }

        return success({ item: rowToData(updatedWithStatus) });
    },

    async delete(id: bigint): Promise<ServiceResult<void>> {
        const existing = await supportKnowledgeRepository.findById(id);
        if (existing === undefined) {
            return failure('NOT_FOUND', 'Article not found');
        }
        // Delete screenshot from S3 if present
        if (existing.screenshotKey !== null) {
            try {
                await deleteFromS3(buildFullS3Key(existing.screenshotKey));
            } catch (err) {
                logger.warn({ err, key: existing.screenshotKey }, 'Failed to delete KB screenshot from S3');
            }
        }
        await supportKnowledgeRepository.delete(id);
        return success(undefined);
    },

    async uploadScreenshot(id: bigint, file: UploadedFile | undefined): Promise<ServiceResult<{ item: KbItemData }>> {
        if (file === undefined) {
            return failure('BAD_REQUEST', 'No file uploaded');
        }
        if (file.data.byteLength > MAX_SCREENSHOT_SIZE) {
            return failure('BAD_REQUEST', 'File size exceeds 5 MB limit');
        }
        if (!ALLOWED_SCREENSHOT_TYPES.has(file.type)) {
            return failure('BAD_REQUEST', 'Invalid file type. Allowed: png, jpeg, webp');
        }

        const existing = await supportKnowledgeRepository.findById(id);
        if (existing === undefined) {
            return failure('NOT_FOUND', 'Article not found');
        }

        // Delete old screenshot
        if (existing.screenshotKey !== null) {
            try {
                await deleteFromS3(buildFullS3Key(existing.screenshotKey));
            } catch (err) {
                logger.warn({ err }, 'Failed to delete old KB screenshot');
            }
        }

        const ext = getExtFromMime(file.type);
        const s3Key = `knowledge-base/${String(id)}/${randomUUID()}.${ext}`;
        await uploadToS3(s3Key, Buffer.from(file.data), file.type);
        // Store the raw key (without prefix); presignUrl/download add the prefix at read time
        await supportKnowledgeRepository.setScreenshot(id, s3Key, file.type);

        const updated = await supportKnowledgeRepository.findById(id);
        if (updated === undefined) {
            return failure('INTERNAL', 'Article not found after update');
        }
        return success({ item: rowToData(updated) });
    },

    async deleteScreenshot(id: bigint): Promise<ServiceResult<{ item: KbItemData }>> {
        const existing = await supportKnowledgeRepository.findById(id);
        if (existing === undefined) {
            return failure('NOT_FOUND', 'Article not found');
        }
        if (existing.screenshotKey !== null) {
            try {
                await deleteFromS3(buildFullS3Key(existing.screenshotKey));
            } catch (err) {
                logger.warn({ err }, 'Failed to delete KB screenshot from S3');
            }
        }
        await supportKnowledgeRepository.clearScreenshot(id);
        const updated = await supportKnowledgeRepository.findById(id);
        if (updated === undefined) {
            return failure('INTERNAL', 'Article not found after update');
        }
        return success({ item: rowToData(updated) });
    },

    async getScreenshotKey(articleId: bigint): Promise<string | null> {
        const row = await supportKnowledgeRepository.findById(articleId);
        return row?.screenshotKey ?? null;
    },

    async reindexArticle(id: bigint): Promise<ServiceResult<{ indexed: number }>> {
        const row = await supportKnowledgeRepository.findById(id);
        if (row === undefined) {
            return failure('NOT_FOUND', 'Article not found');
        }
        await supportEmbeddingService.indexArticle(row.id, row.title, row.content);
        return success({ indexed: 1 });
    },

    async reindexAll(): Promise<ServiceResult<{ indexed: number }>> {
        const indexed = await supportEmbeddingService.reindexAll();
        return success({ indexed });
    },
};
