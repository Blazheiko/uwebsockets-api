import { HttpContext } from '../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';

export default {
    async getNotes(context: HttpContext) {
        const { auth, logger } = context;
        logger.info('getNotes handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const notes = await prisma.notes.findMany({
                where: { userId: auth.user.id },
                include: { photos: true },
                orderBy: { createdAt: 'desc' }
            });
            return { status: 'success', data: notes };
        } catch (error) {
            logger.error('Error getting notes:', error);
            return { status: 'error', message: 'Failed to get notes' };
        }
    },

    async createNote(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('createNote handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { title, description } = httpData.payload;

        try {
            const note = await prisma.notes.create({
                data: {
                    title,
                    description,
                    userId: auth.user.id
                },
                include: { photos: true }
            });
            return { status: 'success', data: note };
        } catch (error) {
            logger.error('Error creating note:', error);
            return { status: 'error', message: 'Failed to create note' };
        }
    },

    async getNote(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getNote handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };

        try {
            const note = await prisma.notes.findFirst({
                where: { 
                    id: parseInt(noteId),
                    userId: auth.user.id 
                },
                include: { photos: true }
            });

            if (!note) {
                return { status: 'error', message: 'Note not found' };
            }

            return { status: 'success', data: note };
        } catch (error) {
            logger.error('Error getting note:', error);
            return { status: 'error', message: 'Failed to get note' };
        }
    },

    async updateNote(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('updateNote handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };
        const { title, description } = httpData.payload;

        try {
            const note = await prisma.notes.updateMany({
                where: { 
                    id: parseInt(noteId),
                    userId: auth.user.id 
                },
                data: { title, description }
            });

            if (note.count === 0) {
                return { status: 'error', message: 'Note not found' };
            }

            const updatedNote = await prisma.notes.findUnique({
                where: { id: parseInt(noteId) },
                include: { photos: true }
            });

            return { status: 'success', data: updatedNote };
        } catch (error) {
            logger.error('Error updating note:', error);
            return { status: 'error', message: 'Failed to update note' };
        }
    },

    async deleteNote(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('deleteNote handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };

        try {
            const deleted = await prisma.notes.deleteMany({
                where: { 
                    id: parseInt(noteId),
                    userId: auth.user.id 
                }
            });

            if (deleted.count === 0) {
                return { status: 'error', message: 'Note not found' };
            }

            return { status: 'success', message: 'Note deleted successfully' };
        } catch (error) {
            logger.error('Error deleting note:', error);
            return { status: 'error', message: 'Failed to delete note' };
        }
    },

    async addPhoto(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('addPhoto handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId } = httpData.params as { noteId: string };
        const { src, filename, size } = httpData.payload;

        try {
            // Verify note belongs to user
            const note = await prisma.notes.findFirst({
                where: { 
                    id: parseInt(noteId),
                    userId: auth.user.id 
                }
            });

            if (!note) {
                return { status: 'error', message: 'Note not found' };
            }

            const photo = await prisma.notesPhoto.create({
                data: {
                    noteId: parseInt(noteId),
                    src,
                    filename,
                    size
                }
            });

            return { status: 'success', data: photo };
        } catch (error) {
            logger.error('Error adding photo:', error);
            return { status: 'error', message: 'Failed to add photo' };
        }
    },

    async deletePhoto(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('deletePhoto handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { noteId, photoId } = httpData.params as { noteId: string; photoId: string };

        try {
            // Verify note belongs to user
            const note = await prisma.notes.findFirst({
                where: { 
                    id: parseInt(noteId),
                    userId: auth.user.id 
                }
            });

            if (!note) {
                return { status: 'error', message: 'Note not found' };
            }

            const deleted = await prisma.notesPhoto.deleteMany({
                where: { 
                    id: parseInt(photoId),
                    noteId: parseInt(noteId)
                }
            });

            if (deleted.count === 0) {
                return { status: 'error', message: 'Photo not found' };
            }

            return { status: 'success', message: 'Photo deleted successfully' };
        } catch (error) {
            logger.error('Error deleting photo:', error);
            return { status: 'error', message: 'Failed to delete photo' };
        }
    }
}; 