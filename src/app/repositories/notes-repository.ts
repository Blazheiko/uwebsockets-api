import { db } from '#database/db.js';
import { notes, notesPhotos } from '#database/schema.js';
import { and, desc, eq } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type NoteRow = InferSelectModel<typeof notes>;
export type NoteInsert = InferInsertModel<typeof notes>;
export type NoteUpdate = Partial<Pick<NoteInsert, 'title' | 'description'>>;
export type NotePhotoRow = InferSelectModel<typeof notesPhotos>;
export type NoteWithPhotos = NoteRow & { photos: NotePhotoRow[] };

export interface INotesRepository {
    create(data: NoteInsert): Promise<NoteRow>;
    findById(id: bigint): Promise<NoteRow | undefined>;
    findByIdAndUserId(id: bigint, userId: bigint): Promise<NoteWithPhotos | undefined>;
    findByUserId(userId: bigint): Promise<NoteWithPhotos[]>;
    update(id: bigint, userId: bigint, data: NoteUpdate): Promise<NoteRow | undefined>;
    delete(id: bigint, userId: bigint): Promise<boolean>;
    verifyOwnership(id: bigint, userId: bigint): Promise<boolean>;
}

async function attachPhotos(note: NoteRow): Promise<NoteWithPhotos> {
    const photos = await db
        .select()
        .from(notesPhotos)
        .where(eq(notesPhotos.noteId, note.id));
    return { ...note, photos };
}

export const notesRepository: INotesRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(notes).values({
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create note');
        }
        return created;
    },

    async findById(id) {
        return await db
            .select()
            .from(notes)
            .where(eq(notes.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByIdAndUserId(id, userId) {
        const note = await db
            .select()
            .from(notes)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)))
            .limit(1)
            .then((rows) => rows.at(0));
        if (note === undefined) {
            return undefined;
        }
        return attachPhotos(note);
    },

    async findByUserId(userId) {
        const notesData = await db
            .select()
            .from(notes)
            .where(eq(notes.userId, userId))
            .orderBy(desc(notes.createdAt));
        return Promise.all(notesData.map(attachPhotos));
    },

    async update(id, userId, data) {
        await db
            .update(notes)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(notes.id, id), eq(notes.userId, userId)));
        return notesRepository.findById(id);
    },

    async delete(id, userId) {
        await db.delete(notesPhotos).where(eq(notesPhotos.noteId, id));
        const deleted = await db
            .delete(notes)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)))
            .returning();
        return deleted.length > 0;
    },

    async verifyOwnership(id, userId) {
        const result = await db
            .select({ id: notes.id })
            .from(notes)
            .where(and(eq(notes.id, id), eq(notes.userId, userId)))
            .limit(1);
        return result.length > 0;
    },
};
