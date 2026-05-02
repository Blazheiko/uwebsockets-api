import type { HttpContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { notesService } from '#app/services/notes-service.js';
import type {
    GetNotesResponse,
    CreateNoteResponse,
    GetNoteResponse,
    UpdateNoteResponse,
    DeleteNoteResponse,
    AddPhotoResponse,
    DeletePhotoResponse,
} from 'shared';
import type { CreateNoteInput, UpdateNoteInput } from 'shared/schemas';

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
    async getNotes(context: HttpContext): Promise<GetNotesResponse> {
        context.logger.info('getNotes handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const result = await notesService.getNotes(userId);
        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', data: result.data.data };
    },

    async createNote(
        context: HttpContext<CreateNoteInput>,
    ): Promise<CreateNoteResponse> {
        context.logger.info('createNote handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const payload = getTypedPayload(context);
        const result = await notesService.createNote(userId, payload);

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', data: result.data.data };
    },

    async getNote(context: HttpContext): Promise<GetNoteResponse> {
        context.logger.info('getNote handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = context.httpData.params as { noteId: string };
        const result = await notesService.getNote(userId, BigInt(noteId));

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', data: result.data.data };
    },

    async updateNote(
        context: HttpContext<UpdateNoteInput>,
    ): Promise<UpdateNoteResponse> {
        context.logger.info('updateNote handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = context.httpData.params as { noteId: string };
        const payload = getTypedPayload(context);
        const result = await notesService.updateNote(userId, BigInt(noteId), payload);

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', data: result.data.data };
    },

    async deleteNote(context: HttpContext): Promise<DeleteNoteResponse> {
        context.logger.info('deleteNote handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = context.httpData.params as { noteId: string };
        const result = await notesService.deleteNote(userId, BigInt(noteId));

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', message: result.data.message };
    },

    async addPhoto(context: HttpContext): Promise<AddPhotoResponse> {
        context.logger.info('addPhoto handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = context.httpData.params as { noteId: string };
        const file = context.httpData.files?.get('photo');
        const result = await notesService.addPhoto(userId, BigInt(noteId), file);

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', photo: result.data.photo };
    },

    async deletePhoto(context: HttpContext): Promise<DeletePhotoResponse> {
        context.logger.info('deletePhoto handler');

        const userId = resolveUserId(context);
        if (userId === null) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId, photoId } = context.httpData.params as {
            noteId: string;
            photoId: string;
        };

        const result = await notesService.deletePhoto(
            userId,
            BigInt(noteId),
            BigInt(photoId),
        );

        if (!result.ok) {
            setServiceErrorStatus(context, result.code);
            return { status: 'error', message: result.message };
        }

        return { status: 'ok', message: result.data.message };
    },
};
