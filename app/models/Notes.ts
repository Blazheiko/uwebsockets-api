import { prisma } from '#database/prisma.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/model.js';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
};

const required = ['title', 'userId'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create note');
        
        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be object');
        }
        
        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        const note = await prisma.notes.create({
            data: {
                title: payload.title,
                description: payload.description,
                userId: payload.userId
            },
            include: { photos: true }
        });

        return serializeModel(note, schema, hidden);
    },

    async findById(id: number, userId: number) {
        logger.info(`find note by id: ${id} for user: ${userId}`);
        
        const note = await prisma.notes.findFirst({
            where: {
                id,
                userId
            },
            include: { photos: true }
        });
        
        if (!note) {
            throw new Error(`Note with id ${id} not found`);
        }
        
        return serializeModel(note, schema, hidden);
    },

    async findByUserId(userId: number) {
        logger.info(`find all notes for user: ${userId}`);
        
        const notes = await prisma.notes.findMany({
            where: { userId },
            include: { photos: true },
            orderBy: { createdAt: 'desc' }
        });

        return this.serializeArray(notes);
    },

    async update(id: number, userId: number, payload: any) {
        logger.info(`update note id: ${id} for user: ${userId}`);
        
        const updateData: any = {
            updatedAt: DateTime.now().toISO(),
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;

        const result = await prisma.notes.updateMany({
            where: {
                id,
                userId
            },
            data: updateData
        });

        if (result.count === 0) {
            throw new Error('Note not found or access denied');
        }

        const updatedNote = await prisma.notes.findUnique({
            where: { id },
            include: { photos: true }
        });

        return serializeModel(updatedNote, schema, hidden);
    },

    async delete(id: number, userId: number) {
        logger.info(`delete note id: ${id} for user: ${userId}`);
        
        // Start transaction to handle photos and note deletion
        const result = await prisma.$transaction(async (prisma) => {
            // First, delete all photos associated with the note
            await prisma.notesPhoto.deleteMany({
                where: {
                    noteId: id
                }
            });

            // Then delete the note
            const deleted = await prisma.notes.deleteMany({
                where: {
                    id,
                    userId
                }
            });

            if (deleted.count === 0) {
                throw new Error('Note not found or access denied');
            }

            return deleted;
        });

        return result;
    },

    async verifyOwnership(id: number, userId: number): Promise<boolean> {
        logger.info(`verify note ownership id: ${id} for user: ${userId}`);
        
        const note = await prisma.notes.findFirst({
            where: {
                id,
                userId
            }
        });

        return !!note;
    },

    async getNotesStatistics(userId: number) {
        logger.info(`get notes statistics for user: ${userId}`);
        
        const notes = await prisma.notes.findMany({
            where: { userId },
            include: { photos: true }
        });

        const totalNotes = notes.length;
        const totalPhotos = notes.reduce((sum, note) => sum + note.photos.length, 0);
        const notesWithPhotos = notes.filter(note => note.photos.length > 0).length;
        const averagePhotosPerNote = totalNotes > 0 ? totalPhotos / totalNotes : 0;

        const recentNotes = notes.filter(note => {
            const noteDate = new Date(note.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return noteDate >= weekAgo;
        }).length;

        return {
            totalNotes,
            totalPhotos,
            notesWithPhotos,
            notesWithoutPhotos: totalNotes - notesWithPhotos,
            averagePhotosPerNote: Math.round(averagePhotosPerNote * 100) / 100,
            recentNotes
        };
    },

    query() {
        return prisma.notes;
    },

    serialize(note: any) {
        return serializeModel(note, schema, hidden);
    },

    serializeArray(notes: any) {
        return notes.map((note: any) => serializeModel(note, schema, hidden));
    },
};
