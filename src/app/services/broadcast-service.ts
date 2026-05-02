import logger from "#logger";
import { broadcastToChannel } from "#vendor/start/server.js";
import { makeBroadcastJson } from "#vendor/utils/helpers/json-handlers.js";
import { wsConnectionRegistry } from "#app/websocket/ws-connection-registry.js";
import type { Payload } from "#vendor/types/types.js";
import { encodeTeacherTtsChunkPacket, encodeTranslatorTtsChunkPacket, encodeSupportTtsChunkPacket } from "#app/services/teacher-tts-binary-packet.js";

export const broadcastService = {
  broadcastMessageToUser(
    userId: string,
    event: string,
    payload: Payload,
  ): number {
    logger.info(`broadcastMessageToUser: ${userId} ${event}`);
    let counter = 0;
    wsConnectionRegistry.forEachConnection(userId, (userConnection) => {
      try {
        const result = userConnection.send(makeBroadcastJson(event, 200, payload));
        if (result === 1) counter++;
      } catch (error) {
        logger.error({ err: error }, `Error sending message to user ${userId}`);
      }
    });
    return counter;
  },

  broadcastMessageToUserExcept(
    userId: string,
    excludeUuid: string,
    event: string,
    payload: Payload,
  ): number {
    logger.info(`broadcastMessageToUserExcept: ${userId} ${event} exclude: ${excludeUuid}`);
    let counter = 0;
    wsConnectionRegistry.forEachConnection(userId, (userConnection, uuid) => {
      if (uuid === excludeUuid) return;
      try {
        const result = userConnection.send(makeBroadcastJson(event, 200, payload));
        if (result === 1) counter++;
      } catch (error) {
        logger.error({ err: error }, `Error sending message to user ${userId}`);
      }
    });
    return counter;
  },

  broadcastMessageToUserConnection(
    userId: string,
    targetUuid: string,
    event: string,
    payload: Payload,
  ): number {
    logger.info(`broadcastMessageToUserConnection: ${userId} ${event} target: ${targetUuid}`);
    const connection = wsConnectionRegistry.getConnection(userId, targetUuid);
    if (connection === undefined) {
      logger.warn(`Target WS connection not found for user ${userId}: ${targetUuid}`);
      return 0;
    }
    try {
      const result = connection.send(makeBroadcastJson(event, 200, payload));
      return result === 1 ? 1 : 0;
    } catch (error) {
      logger.error({ err: error }, `Error sending message to target connection ${targetUuid}`);
      return 0;
    }
  },

  broadcastMessageToChannel(
    channel: string,
    event: string,
    payload: Payload,
  ): void {
    logger.info(`broadcastMessageToChannel: ${channel} ${event}`);
    broadcastToChannel(channel, event, payload);
  },

  broadcastTeacherTtsChunkBinary(
    userId: string,
    params: {
      langLearning: string;
      index: number;
      sessionId: number;
      pcmBytes: Buffer;
    },
  ): number {
    logger.info(`broadcastTeacherTtsChunkBinary: ${userId} teacher_tts_chunk #${String(params.index)}`);
    let counter = 0;
    const packet = encodeTeacherTtsChunkPacket(params);
    wsConnectionRegistry.forEachConnection(userId, (userConnection) => {
      try {
        const result = userConnection.send(packet, true);
        if (result === 1) counter++;
      } catch (error) {
        logger.error({ err: error }, `Error sending binary TTS message to user ${userId}`);
      }
    });
    return counter;
  },

  broadcastTeacherTtsChunkBinaryToConnection(
    userId: string,
    targetUuid: string,
    params: {
      langLearning: string;
      index: number;
      sessionId: number;
      pcmBytes: Buffer;
    },
  ): number {
    const connection = wsConnectionRegistry.getConnection(userId, targetUuid);
    if (connection === undefined) {
      logger.warn(`Target WS connection not found for user ${userId}: ${targetUuid}`);
      return 0;
    }
    const packet = encodeTeacherTtsChunkPacket(params);
    try {
      const result = connection.send(packet, true);
      return result === 1 ? 1 : 0;
    } catch (error) {
      logger.error({ err: error }, `Error sending binary TTS packet to target connection ${targetUuid}`);
      return 0;
    }
  },

  broadcastTranslatorTtsChunkBinary(
    userId: string,
    params: {
      langLearning: string;
      index: number;
      sessionId: number;
      pcmBytes: Buffer;
    },
  ): number {
    logger.info(`broadcastTranslatorTtsChunkBinary: ${userId} translator_tts_chunk #${String(params.index)}`);
    let counter = 0;
    const packet = encodeTranslatorTtsChunkPacket(params);
    wsConnectionRegistry.forEachConnection(userId, (userConnection) => {
      try {
        const result = userConnection.send(packet, true);
        if (result === 1) counter++;
      } catch (error) {
        logger.error({ err: error }, `Error sending binary translator TTS message to user ${userId}`);
      }
    });
    return counter;
  },

  broadcastSupportTtsChunkBinary(
    userId: string,
    params: {
      index: number;
      sessionId: number;
      pcmBytes: Buffer;
    },
  ): number {
    let counter = 0;
    const packet = encodeSupportTtsChunkPacket(params);
    wsConnectionRegistry.forEachConnection(userId, (userConnection) => {
      try {
        const result = userConnection.send(packet, true);
        if (result === 1) counter++;
      } catch (error) {
        logger.error({ err: error }, `Error sending binary support TTS message to user ${userId}`);
      }
    });
    return counter;
  },

  broadcastSupportTtsChunkBinaryToConnection(
    userId: string,
    targetUuid: string,
    params: {
      index: number;
      sessionId: number;
      pcmBytes: Buffer;
    },
  ): number {
    const connection = wsConnectionRegistry.getConnection(userId, targetUuid);
    if (connection === undefined) {
      logger.warn(`Target WS connection not found for user ${userId}: ${targetUuid}`);
      return 0;
    }
    const packet = encodeSupportTtsChunkPacket(params);
    try {
      const result = connection.send(packet, true);
      return result === 1 ? 1 : 0;
    } catch (error) {
      logger.error({ err: error }, `Error sending binary support TTS packet to target connection ${targetUuid}`);
      return 0;
    }
  },
};
