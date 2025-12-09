import { HttpContext } from '../../../vendor/types/types.js';
import Notes from '#app/models/Notes.js';
import NotesPhoto from '#app/models/notes-photo.js';
import type {
    GetNotesResponse,
    CreateNoteResponse,
    GetNoteResponse,
    UpdateNoteResponse,
    DeleteNoteResponse,
    AddPhotoResponse,
    DeletePhotoResponse,
} from '../types/NotesController.js';

export default {
    async getNotes(context: HttpContext): Promise<GetNotesResponse> {
        const { auth, logger } = context;
        logger.info('getNotes handler');

        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const userId = auth.getUserId();
            const notes = await Notes.findByUserId(userId);
            return { status: 'ok', data: notes };
        } catch (error) {
            logger.error({ err: error }, 'Error getting notes:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get notes',
            };
        }
    },

    async createNote(context: HttpContext): Promise<CreateNoteResponse> {
        const { httpData, auth, logger } = context;
        logger.info('createNote handler');

        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { title, description } = httpData.payload;

        try {
            const userId = auth.getUserId();
            const note = await Notes.create({
                title,
                description,
                userId,
            });
            return { status: 'ok', data: note };
        } catch (error) {
            logger.error({ err: error }, 'Error creating note:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create note',
            };
        }
    },

    async getNote(context: HttpContext): Promise<GetNoteResponse> {
        const { httpData, auth, logger } = context;
        logger.info('getNote handler');

        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };

        try {
            const userId = auth.getUserId();
            const note = await Notes.findById(BigInt(noteId), userId);
            return { status: 'ok', data: note };
        } catch (error) {
            logger.error({ err: error }, 'Error getting note:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get note',
            };
        }
    },

    async updateNote(context: HttpContext): Promise<UpdateNoteResponse> {
        const { httpData, auth, logger } = context;
        logger.info('updateNote handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };
        const { title, description } = httpData.payload;

        try {
            const userId = auth.getUserId();
            const note = await Notes.update(BigInt(noteId), userId, {
                title,
                description,
            });
            return { status: 'ok', data: note };
        } catch (error) {
            logger.error({ err: error }, 'Error updating note:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to update note',
            };
        }
    },

    async deleteNote(context: HttpContext): Promise<DeleteNoteResponse> {
        const { httpData, auth, logger } = context;
        logger.info('deleteNote handler');

        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };

        try {
            const userId = auth.getUserId();
            await Notes.delete(BigInt(noteId), userId);
            return { status: 'ok', message: 'Note deleted successfully' };
        } catch (error) {
            logger.error({ err: error }, 'Error deleting note:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to delete note',
            };
        }
    },

    async addPhoto(context: HttpContext): Promise<AddPhotoResponse> {
        const { httpData, auth, logger } = context;
        logger.info('addPhoto handler');

        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };
        const { src, filename, size } = httpData.payload;

        try {
            // Verify note belongs to user
            const userId = auth.getUserId();
            const hasAccess = await Notes.verifyOwnership(
                BigInt(noteId),
                userId,
            );
            if (!hasAccess) {
                return {
                    status: 'error',
                    message: 'Note not found or access denied',
                };
            }

            const photo = await NotesPhoto.create({
                noteId: parseInt(noteId),
                src,
                filename,
                size,
            });
            return { status: 'ok', photo };
        } catch (error) {
            logger.error({ err: error }, 'Error adding photo:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to add photo',
            };
        }
    },

    async deletePhoto(context: HttpContext): Promise<DeletePhotoResponse> {
        const { httpData, auth, logger } = context;
        logger.info('deletePhoto handler');

        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId, photoId } = httpData.params as {
            noteId: string;
            photoId: string;
        };

        try {
            // Verify note belongs to user
            const userId = auth.getUserId();
            const hasAccess = await Notes.verifyOwnership(
                BigInt(noteId),
                userId,
            );
            if (!hasAccess) {
                return {
                    status: 'error',
                    message: 'Note not found or access denied',
                };
            }

            await NotesPhoto.delete(BigInt(photoId), BigInt(noteId));
            return { status: 'ok', message: 'Photo deleted successfully' };
        } catch (error) {
            logger.error({ err: error }, 'Error deleting photo:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to delete photo',
            };
        }
    },
};
