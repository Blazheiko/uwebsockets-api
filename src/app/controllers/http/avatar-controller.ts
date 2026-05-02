import type { HttpContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { avatarService } from '#app/services/avatar-service.js';
import type { GenerateAvatarInput } from 'shared/schemas';
import type {
    UploadAvatarResponse,
    DeleteAvatarResponse,
    GenerateAvatarResponse,
} from 'shared/responses';

function setServiceErrorStatus(
    context: HttpContext,
    code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL',
): void {
    if (code === 'BAD_REQUEST') {
        context.responseData.status = 400;
        return;
    }
    if (code === 'UNAUTHORIZED') {
        context.responseData.status = 401;
        return;
    }
    if (code === 'NOT_FOUND') {
        context.responseData.status = 404;
        return;
    }
    if (code === 'CONFLICT') {
        context.responseData.status = 409;
        return;
    }
    context.responseData.status = 500;
}

function resolveUserId(context: HttpContext): bigint | null {
    if (!context.auth.check()) {
        context.responseData.status = 401;
        return null;
    }

    const userId = context.auth.getUserId();
    if (userId === null) {
        context.responseData.status = 401;
        return null;
    }

    return BigInt(userId);
}

export default {
    async uploadAvatar(context: HttpContext): Promise<UploadAvatarResponse> {
        context.logger.info('uploadAvatar handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const file = context.httpData.files?.get('avatar');
        const result = await avatarService.uploadAvatar(userId, file);

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', user: result.data.user };
    },

    async deleteAvatar(context: HttpContext): Promise<DeleteAvatarResponse> {
        context.logger.info('deleteAvatar handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const result = await avatarService.deleteAvatar(userId);

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', user: result.data.user };
    },

    async generateAvatar(context: HttpContext<GenerateAvatarInput>): Promise<GenerateAvatarResponse> {
        context.logger.info('generateAvatar handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const prompt = payload.prompt ?? '';
        const result = await avatarService.generateAvatarWithAi(prompt, userId);

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return {
            status: 'ok',
            imageBase64: result.data.imageBase64,
            mimeType: result.data.mimeType,
        };
    },
};
