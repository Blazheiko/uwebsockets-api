import { DateTime } from 'luxon';
import type { NotePhotoRow, NoteWithPhotos } from '#app/repositories/notes-repository.js';

export type SerializedNotePhoto = Omit<NotePhotoRow, 'id' | 'noteId' | 'createdAt' | 'updatedAt'> & {
    id: string;
    noteId: string;
    created_at: string | null;
    updated_at: string | null;
};

export type SerializedNote = Omit<NoteWithPhotos, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'photos'> & {
    id: string;
    userId: string;
    created_at: string | null;
    updated_at: string | null;
    photos: SerializedNotePhoto[];
};

function serializePhoto(photo: NotePhotoRow): SerializedNotePhoto {
    const { createdAt, updatedAt, id, noteId, ...rest } = photo;
    return {
        ...rest,
        id: String(id),
        noteId: String(noteId),
        created_at: DateTime.fromJSDate(createdAt).toISO(),
        updated_at: DateTime.fromJSDate(updatedAt).toISO(),
    };
}

export const notesTransformer = {
    serialize(note: NoteWithPhotos): SerializedNote {
        const { createdAt, updatedAt, photos, id, userId, ...rest } = note;
        return {
            ...rest,
            id: String(id),
            userId: String(userId),
            created_at: DateTime.fromJSDate(createdAt).toISO(),
            updated_at: DateTime.fromJSDate(updatedAt).toISO(),
            photos: photos.map(serializePhoto),
        };
    },

    serializeArray(notesList: NoteWithPhotos[]): SerializedNote[] {
        return notesList.map((n) => notesTransformer.serialize(n));
    },
};
