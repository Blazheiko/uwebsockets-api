import { HttpContext } from '../../../vendor/types/types.js';
import Notes from '../../models/notes.js';
import NotesPhoto from '../../models/notes-photo.js';

export default {
    async getNotes(context: HttpContext) {
        const { auth, logger } = context;
        logger.info('getNotes handler');
        
        if (!auth?.check()) {
            return { status: '', message: 'Unauthorized' };
        }

        try {
            const userId = auth.getUserId();
            const notes = await Notes.findByUserId(userId);
            return { status: 'ok', data: notes };
        } catch (error) {
            logger.error('Error getting notes:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get notes' };
        }
    },

    async createNote(context: HttpContext) {
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
                userId
            });
            return { status: 'ok', data: note };
        } catch (error) {
            logger.error('Error creating note:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to create note' };
        }
    },

    async getNote(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getNote handler');
        
        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };

        try {
            const userId = auth.getUserId();
            const note = await Notes.findById(parseInt(noteId), userId);
            return { status: 'ok', data: note };
        } catch (error) {
            logger.error('Error getting note:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get note' };
        }
    },

    async updateNote(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('updateNote handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };
        const { title, description } = httpData.payload;

        try {
            const userId = auth.getUserId();
            const note = await Notes.update(parseInt(noteId), userId, {
                title,
                description
            });
            return { status: 'ok', data: note };
        } catch (error) {
            logger.error('Error updating note:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to update note' };
        }
    },

    async deleteNote(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('deleteNote handler');
        
        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };

        try {
            const userId = auth.getUserId();
            await Notes.delete(parseInt(noteId), userId);
            return { status: 'ok', message: 'Note deleted successfully' };
        } catch (error) {
            logger.error('Error deleting note:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to delete note' };
        }
    },

    async addPhoto(context: HttpContext) {
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
            const hasAccess = await Notes.verifyOwnership(parseInt(noteId), userId);
            if (!hasAccess) {
                return { status: 'error', message: 'Note not found or access denied' };
            }
            
            const photo = await NotesPhoto.create({
                noteId: parseInt(noteId),
                src,
                filename,
                size,
            });
        } catch (error) {
            logger.error('Error adding photo:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to add photo' };
        }
    },

    async deletePhoto(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('deletePhoto handler');
        
        if (!auth?.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId, photoId } = httpData.params as { noteId: string; photoId: string };

        try {
            // Verify note belongs to user
            const userId = auth.getUserId();
            const hasAccess = await Notes.verifyOwnership(parseInt(noteId), userId);
            if (!hasAccess) {
                return { status: 'error', message: 'Note not found or access denied' };
            }

            await NotesPhoto.delete(parseInt(photoId), parseInt(noteId));
            return { status: 'ok', message: 'Photo deleted successfully' };
        } catch (error) {
            logger.error('Error deleting photo:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to delete photo' };
        }
    }
}; 