import {
  contactListRepository,
  userRepository,
} from "#app/repositories/index.js";
import { contactListTransformer } from "#app/transformers/index.js";
import { wsConnectionRegistry } from "#app/websocket/ws-connection-registry.js";
import {
  isAuthorizedEntityRequest,
  isCanonicalEntityId,
} from "#vendor/utils/helpers/entity-id.js";
import { failure, success, type ServiceResult } from "#app/services/shared/service-result.js";

type SessionUserId = string | undefined;

export const chatListService = {
  async getContactList(
    requestedUserId: string,
    sessionUserId: SessionUserId,
  ): Promise<
    ServiceResult<{
      contactList: ReturnType<typeof contactListTransformer.serializeArrayWithDetails>;
      onlineUsers: string[];
    }>
  > {
    if (!isAuthorizedEntityRequest(requestedUserId, sessionUserId)) {
      return failure("UNAUTHORIZED", "Session expired");
    }

    const userId = BigInt(requestedUserId);
    const contactListData =
      await contactListRepository.findByUserIdWithDetails(userId);
    const onlineUsers = wsConnectionRegistry.findOnlineUsers(
      contactListData.map((contact) => String(contact.contactId)),
    );

    return success({
      contactList: contactListTransformer.serializeArrayWithDetails(
        contactListData,
      ),
      onlineUsers,
    });
  },

  async createChat(
    userIdValue: SessionUserId,
    participantId: string,
  ): Promise<ServiceResult<{ chat: ReturnType<typeof contactListTransformer.serialize> }>> {
    if (!isCanonicalEntityId(userIdValue)) {
      return failure("UNAUTHORIZED", "Session expired");
    }

    if (!isCanonicalEntityId(participantId)) {
      return failure("BAD_REQUEST", "Participant ID is required");
    }

    const userId = BigInt(userIdValue);
    const participantBigInt = BigInt(participantId);

    const participant = await userRepository.findById(participantBigInt);
    if (participant === undefined) {
      return failure("NOT_FOUND", "Participant not found");
    }

    const existingChat = await contactListRepository.findExistingChat(
      userId,
      participantBigInt,
    );

    if (existingChat !== undefined) {
      return success({
        chat: contactListTransformer.serialize(existingChat),
      });
    }

    const createdChat = await contactListRepository.createWithUserInfo(
      userId,
      participantBigInt,
      "accepted",
    );

    if (createdChat === undefined) {
      return failure("INTERNAL", "Failed to create chat");
    }

    return success({
      chat: contactListTransformer.serialize(createdChat),
    });
  },

  async deleteChat(
    userIdValue: SessionUserId,
    chatIdValue: string,
  ): Promise<ServiceResult<{ message: string }>> {
    if (!isCanonicalEntityId(userIdValue)) {
      return failure("UNAUTHORIZED", "Session expired");
    }
    if (!isCanonicalEntityId(chatIdValue)) {
      return failure("BAD_REQUEST", "Chat ID is required");
    }

    const userId = BigInt(userIdValue);
    const chatId = BigInt(chatIdValue);

    const chat = await contactListRepository.findByIdAndUserId(chatId, userId);
    if (chat === undefined) {
      return failure("NOT_FOUND", "Chat not found or access denied");
    }

    await contactListRepository.delete(chatId);

    return success({ message: "Chat deleted successfully" });
  },
};
