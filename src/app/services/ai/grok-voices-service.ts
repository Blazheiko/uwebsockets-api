import aiConfig from '#config/ai.js';

export interface GrokVoice {
  voiceId: string;
  displayName: string;
  description: string;
  languages: string[];
  gender: 'unknown';
}

const GROK_VOICES: GrokVoice[] = [
  { voiceId: 'eve', displayName: 'Eve', description: 'Energetic, upbeat', languages: [], gender: 'unknown' },
  { voiceId: 'ara', displayName: 'Ara', description: 'Warm, friendly', languages: [], gender: 'unknown' },
  { voiceId: 'rex', displayName: 'Rex', description: 'Confident, clear', languages: [], gender: 'unknown' },
  { voiceId: 'sal', displayName: 'Sal', description: 'Smooth, balanced', languages: [], gender: 'unknown' },
  { voiceId: 'leo', displayName: 'Leo', description: 'Authoritative, strong', languages: [], gender: 'unknown' },
];

export function getGrokVoices(): GrokVoice[] {
  return GROK_VOICES;
}

export function getDefaultGrokVoice(): { voiceId: string; displayName: string; gender: 'unknown' } {
  const defaultId = aiConfig.grokTts.defaultVoice;
  const found = GROK_VOICES.find((v) => v.voiceId === defaultId);
  return {
    voiceId: found?.voiceId ?? 'eve',
    displayName: found?.displayName ?? 'Eve',
    gender: 'unknown',
  };
}
