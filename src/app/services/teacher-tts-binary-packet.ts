const TTS_PACKET_VERSION = 2;
const TTS_PACKET_TYPE_CHUNK = 1;
export const TTS_PACKET_TYPE_TRANSLATOR_CHUNK = 2;
export const TTS_PACKET_TYPE_SUPPORT_CHUNK = 3;
const HEADER_SIZE = 12; // version(1) + type(1) + langLen(2) + index(4) + sessionId(4)

let _ttsSessionCounter = 0;

export function nextTtsSessionId(): number {
  _ttsSessionCounter = (_ttsSessionCounter + 1) & 0xffffffff;
  return _ttsSessionCounter;
}

function normalizeBase64(value: string): string {
  const normalized = value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (normalized.length % 4)) % 4;
  return normalized + "=".repeat(pad);
}

export function decodeBase64AudioChunk(base64: string): Buffer {
  return Buffer.from(normalizeBase64(base64), "base64");
}

export function encodeTeacherTtsChunkPacket(params: {
  langLearning: string;
  index: number;
  sessionId: number;
  pcmBytes: Buffer;
}): Buffer {
  const langBytes = Buffer.from(params.langLearning, "utf8");
  const packet = Buffer.allocUnsafe(HEADER_SIZE + langBytes.length + params.pcmBytes.length);

  packet.writeUInt8(TTS_PACKET_VERSION, 0);
  packet.writeUInt8(TTS_PACKET_TYPE_CHUNK, 1);
  packet.writeUInt16LE(langBytes.length, 2);
  packet.writeUInt32LE(params.index >>> 0, 4);
  packet.writeUInt32LE(params.sessionId >>> 0, 8);
  langBytes.copy(packet, HEADER_SIZE);
  params.pcmBytes.copy(packet, HEADER_SIZE + langBytes.length);

  return packet;
}

export function encodeTranslatorTtsChunkPacket(params: {
  langLearning: string;
  index: number;
  sessionId: number;
  pcmBytes: Buffer;
}): Buffer {
  const langBytes = Buffer.from(params.langLearning, "utf8");
  const packet = Buffer.allocUnsafe(HEADER_SIZE + langBytes.length + params.pcmBytes.length);

  packet.writeUInt8(TTS_PACKET_VERSION, 0);
  packet.writeUInt8(TTS_PACKET_TYPE_TRANSLATOR_CHUNK, 1);
  packet.writeUInt16LE(langBytes.length, 2);
  packet.writeUInt32LE(params.index >>> 0, 4);
  packet.writeUInt32LE(params.sessionId >>> 0, 8);
  langBytes.copy(packet, HEADER_SIZE);
  params.pcmBytes.copy(packet, HEADER_SIZE + langBytes.length);

  return packet;
}

export function encodeSupportTtsChunkPacket(params: {
  index: number;
  sessionId: number;
  pcmBytes: Buffer;
}): Buffer {
  // Use a fixed lang string 'support' to identify these packets
  const langBytes = Buffer.from('support', 'utf8');
  const packet = Buffer.allocUnsafe(HEADER_SIZE + langBytes.length + params.pcmBytes.length);

  packet.writeUInt8(TTS_PACKET_VERSION, 0);
  packet.writeUInt8(TTS_PACKET_TYPE_SUPPORT_CHUNK, 1);
  packet.writeUInt16LE(langBytes.length, 2);
  packet.writeUInt32LE(params.index >>> 0, 4);
  packet.writeUInt32LE(params.sessionId >>> 0, 8);
  langBytes.copy(packet, HEADER_SIZE);
  params.pcmBytes.copy(packet, HEADER_SIZE + langBytes.length);

  return packet;
}
