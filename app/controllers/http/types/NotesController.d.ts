/**
 * Response types for NotesController
 */

export interface Note {
    id: number;
    title: string;
    content: string;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

export interface NotePhoto {
    id: number;
    noteId: number;
    url: string;
    createdAt: string;
}

export interface GetNotesResponse {
    status: 'ok';
    notes: Note[];
}

export interface CreateNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    note?: Note;
}

export interface GetNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    note?: Note;
}

export interface UpdateNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    note?: Note;
}

export interface DeleteNoteResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface AddPhotoResponse {
    status: 'ok' | 'error';
    message?: string;
    photo?: NotePhoto;
}

export interface DeletePhotoResponse {
    status: 'ok' | 'error';
    message?: string;
}
