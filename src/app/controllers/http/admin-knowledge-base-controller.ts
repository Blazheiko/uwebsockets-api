import type { HttpContext } from '#vendor/types/types.js';
import { knowledgeBaseService } from '#app/services/knowledge-base-service.js';
import type {
    SupportKnowledgeBaseListResponse,
    SupportKnowledgeBaseItemResponse,
    SupportKnowledgeBaseDeleteResponse,
    SupportKnowledgeBaseReindexResponse,
    SupportKnowledgeBaseInitResponse,
} from 'shared/responses';
import type { SupportKnowledgeBaseCreateInput, SupportKnowledgeBaseUpdateInput } from 'shared/schemas';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import type { ServiceErrorCode } from '#app/services/shared/service-result.js';
import { knowledgeBaseInitService } from '#app/services/knowledge-base-init-service.js';

function setError(context: HttpContext, code: ServiceErrorCode): void {
    if (code === 'BAD_REQUEST') context.responseData.status = 400;
    else if (code === 'NOT_FOUND') context.responseData.status = 404;
    else if (code === 'UNAUTHORIZED') context.responseData.status = 403;
    else context.responseData.status = 500;
}

function parseId(context: HttpContext): bigint | null {
    const idStr = context.httpData.params?.['id'];
    if (idStr === undefined) {
        context.responseData.status = 400;
        return null;
    }
    try {
        return BigInt(idStr);
    } catch {
        context.responseData.status = 400;
        return null;
    }
}

export default {
    async getAll(context: HttpContext): Promise<SupportKnowledgeBaseListResponse> {
        const query = context.httpData.query;
        const categoryRaw = query.get('category');
        const pageRaw = query.get('page');
        const limitRaw = query.get('limit');
        const page = pageRaw !== null ? parseInt(pageRaw, 10) : 1;
        const limit = limitRaw !== null ? parseInt(limitRaw, 10) : 50;

        const result = await knowledgeBaseService.getAll({
            ...(categoryRaw !== null ? { category: categoryRaw } : {}),
            page,
            limit,
        });
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', data: result.data.items, total: result.data.total };
    },

    async getById(context: HttpContext): Promise<SupportKnowledgeBaseItemResponse> {
        const id = parseId(context);
        if (id === null) return { status: 'error', message: 'Invalid ID' };

        const result = await knowledgeBaseService.getById(id);
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', data: result.data.item };
    },

    async create(context: HttpContext<SupportKnowledgeBaseCreateInput>): Promise<SupportKnowledgeBaseItemResponse> {
        const payload = getTypedPayload(context);
        const result = await knowledgeBaseService.create({
            title: payload.title,
            content: payload.content,
            category: payload.category ?? null,
            isActive: payload.isActive ?? true,
        });
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        context.responseData.status = 201;
        return { status: 'ok', data: result.data.item };
    },

    async update(context: HttpContext<SupportKnowledgeBaseUpdateInput>): Promise<SupportKnowledgeBaseItemResponse> {
        const id = parseId(context);
        if (id === null) return { status: 'error', message: 'Invalid ID' };

        const payload = getTypedPayload(context);
        const result = await knowledgeBaseService.update(id, {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.content !== undefined ? { content: payload.content } : {}),
            ...(payload.category !== undefined ? { category: payload.category } : {}),
            ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        });
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', data: result.data.item };
    },

    async delete(context: HttpContext): Promise<SupportKnowledgeBaseDeleteResponse> {
        const id = parseId(context);
        if (id === null) return { status: 'error', message: 'Invalid ID' };

        const result = await knowledgeBaseService.delete(id);
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok' };
    },

    async uploadScreenshot(context: HttpContext): Promise<SupportKnowledgeBaseItemResponse> {
        const id = parseId(context);
        if (id === null) return { status: 'error', message: 'Invalid ID' };

        const file = context.httpData.files?.get('screenshot');
        const result = await knowledgeBaseService.uploadScreenshot(id, file);
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', data: result.data.item };
    },

    async deleteScreenshot(context: HttpContext): Promise<SupportKnowledgeBaseItemResponse> {
        const id = parseId(context);
        if (id === null) return { status: 'error', message: 'Invalid ID' };

        const result = await knowledgeBaseService.deleteScreenshot(id);
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', data: result.data.item };
    },

    async reindex(context: HttpContext): Promise<SupportKnowledgeBaseReindexResponse> {
        const id = parseId(context);
        if (id === null) return { status: 'error', message: 'Invalid ID' };

        const result = await knowledgeBaseService.reindexArticle(id);
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', indexed: result.data.indexed };
    },

    async reindexAll(context: HttpContext): Promise<SupportKnowledgeBaseReindexResponse> {
        const result = await knowledgeBaseService.reindexAll();
        if (!result.ok) {
            setError(context, result.code);
            return { status: 'error', message: result.message };
        }
        return { status: 'ok', indexed: result.data.indexed };
    },

    async startInit(context: HttpContext): Promise<SupportKnowledgeBaseInitResponse> {
        const result = await knowledgeBaseInitService.start();
        if (!result.ok) {
            context.responseData.status = result.errorCode === 'ALREADY_RUNNING' ? 409 : 400;
            return {
                status: 'error',
                message: result.message ?? 'Knowledge base initialization failed',
                data: result.status,
            };
        }

        context.responseData.status = 202;
        return { status: 'ok', data: result.status };
    },

    async getInitStatus(): Promise<SupportKnowledgeBaseInitResponse> {
        return {
            status: 'ok',
            data: knowledgeBaseInitService.getStatus(),
        };
    },
};
