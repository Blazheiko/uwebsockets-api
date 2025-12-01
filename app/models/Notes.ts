import { db } from '#database/db.js';
import { notes, notesPhotos } from '#database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
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

        const now = new Date();
        const [note] = await db.insert(notes).values({
            title: payload.title,
            description: payload.description || '',
            userId: BigInt(payload.userId),
            createdAt: now,
            updatedAt: now,
        });

        const createdNote = await db.select()
            .from(notes)
            .where(eq(notes.id, BigInt(note.insertId)))
            .limit(1);

        return serializeModel(createdNote[0], schema, hidden);
    },

    async findById(id: bigint, userId: bigint) {
        logger.info(`find note by id: ${id} for user: ${userId}`);

        const note = await db.select()
            .from(notes)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)))
            .limit(1);

        if (note.length === 0) {
            throw new Error(`Note with id ${id} not found`);
        }

        // Get photos for the note
        const photos = await db.select()
            .from(notesPhotos)
            .where(eq(notesPhotos.noteId, id));

        return serializeModel({ ...note[0], photos }, schema, hidden);
    },

    async findByUserId(userId: bigint) {
        logger.info(`find all notes for user: ${userId}`);

        const notesData = await db.select()
            .from(notes)
            .where(eq(notes.userId, userId))
            .orderBy(desc(notes.createdAt));

        // Get photos for each note
        const notesWithPhotos = await Promise.all(
            notesData.map(async (note) => {
                const photos = await db.select()
                    .from(notesPhotos)
                    .where(eq(notesPhotos.noteId, note.id));
                return { ...note, photos };
            })
        );

        return this.serializeArray(notesWithPhotos);
    },

    async update(id: bigint, userId: bigint, payload: any) {
        logger.info(`update note id: ${id} for user: ${userId}`);

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;

        await db.update(notes)
            .set(updateData)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)));

        const updatedNote = await db.select()
            .from(notes)
            .where(eq(notes.id, id))
            .limit(1);

        if (updatedNote.length === 0) {
            throw new Error('Note not found or access denied');
        }

        // Get photos for the note
        const photos = await db.select()
            .from(notesPhotos)
            .where(eq(notesPhotos.noteId, id));

        return serializeModel({ ...updatedNote[0], photos }, schema, hidden);
    },

    async delete(id: bigint, userId: bigint) {
        logger.info(`delete note id: ${id} for user: ${userId}`);

        // First, delete all photos associated with the note
        await db.delete(notesPhotos).where(eq(notesPhotos.noteId, id));

        // Then delete the note
        const deleted = await db.delete(notes)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)));

        const deletedCount = await db.select({ count: sql<number>`count(*)` })
            .from(notes)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)));
        
        if (deletedCount[0]?.count === 0) {
            throw new Error('Note not found or access denied');
        }

        return deleted;
    },

    async verifyOwnership(id: bigint, userId: bigint): Promise<boolean> {
        logger.info(`verify note ownership id: ${id} for user: ${userId}`);

        const note = await db.select()
            .from(notes)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)))
            .limit(1);

        return note.length > 0;
    },

    async getNotesStatistics(userId: bigint) {
        logger.info(`get notes statistics for user: ${userId}`);

        const notesData = await db.select()
            .from(notes)
            .where(eq(notes.userId, userId));

        const notesWithPhotos = await Promise.all(
            notesData.map(async (note) => {
                const photos = await db.select()
                    .from(notesPhotos)
                    .where(eq(notesPhotos.noteId, note.id));
                return { ...note, photos };
            })
        );

        const totalNotes = notesWithPhotos.length;
        const totalPhotos = notesWithPhotos.reduce(
            (sum: number, note: any) => sum + note.photos.length,
            0,
        );
        const notesWithPhotosCount = notesWithPhotos.filter(
            (note: any) => note.photos.length > 0,
        ).length;
        const averagePhotosPerNote =
            totalNotes > 0 ? totalPhotos / totalNotes : 0;

        const recentNotes = notesWithPhotos.filter((note: any) => {
            const noteDate = new Date(note.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return noteDate >= weekAgo;
        }).length;

        return {
            totalNotes,
            totalPhotos,
            notesWithPhotos: notesWithPhotosCount,
            notesWithoutPhotos: totalNotes - notesWithPhotosCount,
            averagePhotosPerNote: Math.round(averagePhotosPerNote * 100) / 100,
            recentNotes,
        };
    },

    query() {
        return db.select().from(notes);
    },

    serialize(note: any) {
        return serializeModel(note, schema, hidden);
    },

    serializeArray(notesData: any) {
        return notesData.map((note: any) => serializeModel(note, schema, hidden));
    },
};
