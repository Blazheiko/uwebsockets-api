/**
 * Response types for NotesController
 */

export interface Note {
    id: number;
    title: string;
    description: string;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

export interface NotePhoto {
    id: number;
    noteId: number;
    src: string;
    filename: string;
    size: number;
    createdAt: string;
}

export interface GetNotesResponse {
    status: 'ok' | 'error';
    message?: string;
    data?: Note[];
}

export interface CreateNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    data?: Note;
}

export interface GetNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    data?: Note;
}

export interface UpdateNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    data?: Note;
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
