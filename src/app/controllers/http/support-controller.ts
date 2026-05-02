import type { HttpContext } from '#vendor/types/types.js';
import { supportRepository } from '#app/repositories/support-repository.js';
import { knowledgeBaseService } from '#app/services/knowledge-base-service.js';
import { presignUrl } from '#vendor/utils/storage/s3.js';
import type {
    SupportGetChatHistoryResponse,
    SupportDeleteChatHistoryResponse,
} from 'shared/responses';
import logger from '#logger';

function getUserId(context: HttpContext): bigint | null {
    if (!context.auth.check()) {
        context.responseData.status = 401;
        return null;
    }
    const id = context.auth.getUserId();
    if (id === null) {
        context.responseData.status = 401;
        return null;
    }
    return BigInt(id);
}

export default {
    async getChatHistory(context: HttpContext): Promise<SupportGetChatHistoryResponse> {
        const userId = getUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const rows = await supportRepository.findChatHistory(userId);
        const data = rows.map((m) => ({
            id: String(m.id),
            role: m.role,
            content: m.content,
            screenshots: (m.screenshots as string[] | null) ?? null,
            createdAt: m.createdAt.toISOString(),
        }));

        return { status: 'ok', data };
    },

    async deleteChatHistory(context: HttpContext): Promise<SupportDeleteChatHistoryResponse> {
        const userId = getUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        await supportRepository.deleteAllChatHistory(userId);
        return { status: 'ok' };
    },

    async getScreenshot(context: HttpContext): Promise<{ status: string; message?: string }> {
        const userId = getUserId(context);
        if (userId === null) return { status: 'error', message: 'Unauthorized' };

        const articleIdStr = context.httpData.params?.['articleId'];
        if (articleIdStr === undefined) {
            context.responseData.status = 400;
            return { status: 'error', message: 'Missing articleId' };
        }

        let articleId: bigint;
        try {
            articleId = BigInt(articleIdStr);
        } catch {
            context.responseData.status = 400;
            return { status: 'error', message: 'Invalid articleId' };
        }

        const screenshotKey = await knowledgeBaseService.getScreenshotKey(articleId);
        if (screenshotKey === null) {
            context.responseData.status = 404;
            return { status: 'error', message: 'Screenshot not found' };
        }

        try {
            const signedUrl = await presignUrl(screenshotKey, 300); // 5 min
            context.responseData.status = 302;
            context.responseData.setHeader('Location', signedUrl);
            return { status: 'redirect' };
        } catch (err) {
            logger.error({ err, screenshotKey }, 'Failed to presign screenshot URL');
            context.responseData.status = 500;
            return { status: 'error', message: 'Failed to retrieve screenshot' };
        }
    },
};
