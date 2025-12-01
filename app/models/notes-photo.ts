import { db } from '#database/db.js';
import { notesPhotos } from '#database/schema.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
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

        const now = new Date();
        const [photo] = await db.insert(notesPhotos).values({
            noteId: BigInt(payload.noteId),
            src: payload.src,
            filename: payload.filename || null,
            size: payload.size || null,
            createdAt: now,
            updatedAt: now,
        });

        const createdPhoto = await db.select()
            .from(notesPhotos)
            .where(eq(notesPhotos.id, BigInt(photo.insertId)))
            .limit(1);

        return serializeModel(createdPhoto[0], schema, hidden);
    },

    async findById(id: bigint) {
        logger.info(`find notes photo by id: ${id}`);

        const photo = await db.select()
            .from(notesPhotos)
            .where(eq(notesPhotos.id, id))
            .limit(1);

        if (photo.length === 0) {
            throw new Error(`Photo with id ${id} not found`);
        }

        return serializeModel(photo[0], schema, hidden);
    },

    async findByNoteId(noteId: bigint) {
        logger.info(`find all photos for note: ${noteId}`);

        const photos = await db.select()
            .from(notesPhotos)
            .where(eq(notesPhotos.noteId, noteId))
            .orderBy(desc(notesPhotos.createdAt));

        return this.serializeArray(photos);
    },

    async update(id: bigint, payload: any) {
        logger.info(`update notes photo id: ${id}`);

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (payload.src !== undefined) updateData.src = payload.src;
        if (payload.filename !== undefined) updateData.filename = payload.filename;
        if (payload.size !== undefined) updateData.size = payload.size;

        await db.update(notesPhotos).set(updateData).where(eq(notesPhotos.id, id));
        const photo = await db.select().from(notesPhotos).where(eq(notesPhotos.id, id)).limit(1);

        return serializeModel(photo[0], schema, hidden);
    },

    async delete(id: bigint, noteId: bigint) {
        logger.info(`delete notes photo id: ${id} from note: ${noteId}`);

        const deleted = await db.delete(notesPhotos)
            .where(and(eq(notesPhotos.id, id), eq(notesPhotos.noteId, noteId)));

        if (!deleted || deleted[0]?.affectedRows === 0) {
            throw new Error('Photo not found or access denied');
        }

        return deleted;
    },

    async deleteByNoteId(noteId: bigint) {
        logger.info(`delete all photos for note: ${noteId}`);

        const deleted = await db.delete(notesPhotos).where(eq(notesPhotos.noteId, noteId));
        return deleted;
    },

    async verifyPhotoInNote(photoId: bigint, noteId: bigint): Promise<boolean> {
        logger.info(`verify photo ${photoId} belongs to note ${noteId}`);

        const photo = await db.select()
            .from(notesPhotos)
            .where(and(eq(notesPhotos.id, photoId), eq(notesPhotos.noteId, noteId)))
            .limit(1);

        return photo.length > 0;
    },

    async getPhotoStatistics(noteId?: bigint) {
        logger.info(
            `get photo statistics${noteId ? ` for note: ${noteId}` : ' for all notes'}`,
        );

        let photos;
        if (noteId) {
            photos = await db.select().from(notesPhotos).where(eq(notesPhotos.noteId, noteId));
        } else {
            photos = await db.select().from(notesPhotos);
        }

        const totalPhotos = photos.length;
        const totalSize = photos.reduce(
            (sum: number, photo: any) => sum + (Number(photo.size) || 0),
            0,
        );
        const averageSize = totalPhotos > 0 ? totalSize / totalPhotos : 0;

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentPhotos = photos.filter((photo: any) => {
            const photoDate = new Date(photo.createdAt);
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
        return db.select().from(notesPhotos);
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
