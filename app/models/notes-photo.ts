import { prisma } from '#database/prisma.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import { Prisma } from '@prisma/client';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
};

const required = ['noteId', 'src'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create notes photo');

        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be object');
        }

        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        const photo = await prisma.notesPhoto.create({
            data: {
                noteId: payload.noteId,
                src: payload.src,
                filename: payload.filename,
                size: payload.size,
            },
        });

        return serializeModel(photo, schema, hidden);
    },

    async findById(id: number) {
        logger.info(`find notes photo by id: ${id}`);

        const photo = await prisma.notesPhoto.findUnique({
            where: { id },
        });

        if (!photo) {
            throw new Error(`Photo with id ${id} not found`);
        }

        return serializeModel(photo, schema, hidden);
    },

    async findByNoteId(noteId: number) {
        logger.info(`find all photos for note: ${noteId}`);

        const photos = await prisma.notesPhoto.findMany({
            where: { noteId },
            orderBy: { createdAt: 'desc' },
        });

        return this.serializeArray(photos);
    },

    async update(id: number, payload: any) {
        logger.info(`update notes photo id: ${id}`);

        const updateData: any = {
            updatedAt: DateTime.now().toISO(),
        };

        if (payload.src !== undefined) updateData.src = payload.src;
        if (payload.filename !== undefined)
            updateData.filename = payload.filename;
        if (payload.size !== undefined) updateData.size = payload.size;

        const photo = await prisma.notesPhoto.update({
            where: { id },
            data: updateData,
        });

        return serializeModel(photo, schema, hidden);
    },

    async delete(id: number, noteId: number) {
        logger.info(`delete notes photo id: ${id} from note: ${noteId}`);

        const deleted = await prisma.notesPhoto.deleteMany({
            where: {
                id,
                noteId,
            },
        });

        if (deleted.count === 0) {
            throw new Error('Photo not found or access denied');
        }

        return deleted;
    },

    async deleteByNoteId(noteId: number) {
        logger.info(`delete all photos for note: ${noteId}`);

        const deleted = await prisma.notesPhoto.deleteMany({
            where: { noteId },
        });

        return deleted;
    },

    async verifyPhotoInNote(photoId: number, noteId: number): Promise<boolean> {
        logger.info(`verify photo ${photoId} belongs to note ${noteId}`);

        const photo = await prisma.notesPhoto.findFirst({
            where: {
                id: photoId,
                noteId,
            },
        });

        return !!photo;
    },

    async getPhotoStatistics(noteId?: number) {
        logger.info(
            `get photo statistics${noteId ? ` for note: ${noteId}` : ' for all notes'}`,
        );

        const where = noteId ? { noteId } : {};

        const photos = await prisma.notesPhoto.findMany({
            where,
        });

        const totalPhotos = photos.length;
        const totalSize = photos.reduce(
            (sum: number, photo: any) => sum + (photo.size || 0),
            0,
        );
        const averageSize = totalPhotos > 0 ? totalSize / totalPhotos : 0;

        const recentPhotos = photos.filter((photo: any) => {
            const photoDate = new Date(photo.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return photoDate >= weekAgo;
        }).length;

        return {
            totalPhotos,
            totalSize,
            averageSize: Math.round(averageSize),
            recentPhotos,
        };
    },

    query() {
        return prisma.notesPhoto;
    },

    serialize(photo: any) {
        return serializeModel(photo, schema, hidden);
    },

    serializeArray(photos: any) {
        return photos.map((photo: any) =>
            serializeModel(photo, schema, hidden),
        );
    },
};
