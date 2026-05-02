import { randomUUID } from "node:crypto";
import path from "node:path";
import type { UploadedFile } from "#vendor/types/types.js";
import {
  notesPhotoRepository,
  notesRepository,
} from "#app/repositories/index.js";
import {
  notesPhotoTransformer,
  notesTransformer,
} from "#app/transformers/index.js";
import {
  failure,
  success,
  type ServiceResult,
} from "#app/services/shared/service-result.js";
import { uploadToS3 } from "#vendor/utils/storage/s3.js";
import type { CreateNoteInput, UpdateNoteInput } from "shared/schemas";

export const notesService = {
  async getNotes(
    userId: bigint,
  ): Promise<
    ServiceResult<{ data: ReturnType<typeof notesTransformer.serializeArray> }>
  > {
    const notes = await notesRepository.findByUserId(userId);
    return success({ data: notesTransformer.serializeArray(notes) });
  },

  async createNote(
    userId: bigint,
    payload: CreateNoteInput,
  ): Promise<
    ServiceResult<{ data: ReturnType<typeof notesTransformer.serialize> }>
  > {
    const created = await notesRepository.create({
      title: payload.title,
      description: payload.description,
      userId,
    });

    const withPhotos = await notesRepository.findByIdAndUserId(
      created.id,
      userId,
    );
    if (withPhotos === undefined) {
      return failure("INTERNAL", "Failed to create note");
    }

    return success({ data: notesTransformer.serialize(withPhotos) });
  },

  async getNote(
    userId: bigint,
    noteId: bigint,
  ): Promise<
    ServiceResult<{ data: ReturnType<typeof notesTransformer.serialize> }>
  > {
    const note = await notesRepository.findByIdAndUserId(noteId, userId);
    if (note === undefined) {
      return failure("NOT_FOUND", "Note not found");
    }

    return success({ data: notesTransformer.serialize(note) });
  },

  async updateNote(
    userId: bigint,
    noteId: bigint,
    payload: UpdateNoteInput,
  ): Promise<
    ServiceResult<{ data: ReturnType<typeof notesTransformer.serialize> }>
  > {
    const updateData: { title?: string; description?: string } = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined)
      updateData.description = payload.description;

    const updated = await notesRepository.update(noteId, userId, updateData);
    if (updated === undefined) {
      return failure("NOT_FOUND", "Note not found");
    }

    const withPhotos = await notesRepository.findByIdAndUserId(
      updated.id,
      userId,
    );
    if (withPhotos === undefined) {
      return failure("NOT_FOUND", "Note not found");
    }

    return success({ data: notesTransformer.serialize(withPhotos) });
  },

  async deleteNote(
    userId: bigint,
    noteId: bigint,
  ): Promise<ServiceResult<{ message: string }>> {
    const deleted = await notesRepository.delete(noteId, userId);
    if (!deleted) {
      return failure("NOT_FOUND", "Note not found");
    }

    return success({ message: "Note deleted successfully" });
  },

  async addPhoto(
    userId: bigint,
    noteId: bigint,
    file: UploadedFile | undefined,
  ): Promise<
    ServiceResult<{ photo: ReturnType<typeof notesPhotoTransformer.serialize> }>
  > {
    if (file === undefined) {
      return failure("BAD_REQUEST", "No file uploaded");
    }

    const hasAccess = await notesRepository.verifyOwnership(noteId, userId);
    if (!hasAccess) {
      return failure("NOT_FOUND", "Note not found or access denied");
    }

    const extname = path.extname(file.filename);
    const ext = extname === "" ? ".bin" : extname;
    const uniqueName = `${randomUUID()}${ext}`;
    const s3Key = `my-notes/${String(userId)}/${uniqueName}`;

    await uploadToS3(s3Key, Buffer.from(file.data), file.type);

    const photo = await notesPhotoRepository.create({
      noteId,
      src: s3Key,
      filename: file.filename,
      size: file.data.byteLength,
    });

    return success({ photo: notesPhotoTransformer.serialize(photo) });
  },

  async deletePhoto(
    userId: bigint,
    noteId: bigint,
    photoId: bigint,
  ): Promise<ServiceResult<{ message: string }>> {
    const hasAccess = await notesRepository.verifyOwnership(noteId, userId);
    if (!hasAccess) {
      return failure("NOT_FOUND", "Note not found or access denied");
    }

    const deleted = await notesPhotoRepository.delete(photoId, noteId);
    if (!deleted) {
      return failure("NOT_FOUND", "Photo not found");
    }

    return success({ message: "Photo deleted successfully" });
  },
};
