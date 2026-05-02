import { db } from '#database/db.js';
import { notesPhotos } from '#database/schema.js';
import { and, desc, eq } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type NotePhotoRow = InferSelectModel<typeof notesPhotos>;
export type NotePhotoInsert = InferInsertModel<typeof notesPhotos>;
export type NotePhotoUpdate = Partial<Pick<NotePhotoInsert, 'src' | 'filename' | 'size'>>;

export interface INotesPhotoRepository {
    create(data: NotePhotoInsert): Promise<NotePhotoRow>;
    findById(id: bigint): Promise<NotePhotoRow | undefined>;
    findByNoteId(noteId: bigint): Promise<NotePhotoRow[]>;
    delete(id: bigint, noteId: bigint): Promise<boolean>;
    deleteByNoteId(noteId: bigint): Promise<void>;
    verifyPhotoInNote(photoId: bigint, noteId: bigint): Promise<boolean>;
}

export const notesPhotoRepository: INotesPhotoRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(notesPhotos).values({
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create note photo');
        }
        return created;
    },

    async findById(id) {
        return await db
            .select()
            .from(notesPhotos)
            .where(eq(notesPhotos.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByNoteId(noteId) {
        return await db
            .select()
            .from(notesPhotos)
            .where(eq(notesPhotos.noteId, noteId))
            .orderBy(desc(notesPhotos.createdAt));
    },

    async delete(id, noteId) {
        const deleted = await db
            .delete(notesPhotos)
            .where(and(eq(notesPhotos.id, id), eq(notesPhotos.noteId, noteId)))
            .returning();
        return deleted.length > 0;
    },

    async deleteByNoteId(noteId) {
        await db.delete(notesPhotos).where(eq(notesPhotos.noteId, noteId));
    },

    async verifyPhotoInNote(photoId, noteId) {
        const result = await db
            .select({ id: notesPhotos.id })
            .from(notesPhotos)
            .where(and(eq(notesPhotos.id, photoId), eq(notesPhotos.noteId, noteId)))
            .limit(1);
        return result.length > 0;
    },
};
