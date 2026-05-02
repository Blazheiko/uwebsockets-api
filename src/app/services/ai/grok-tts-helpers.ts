const GROK_LANGUAGE_MAP: Record<string, string> = {
  en: 'en',
  ru: 'ru',
  de: 'de',
  fr: 'fr',
  es: 'es-ES',
  it: 'it',
  pt: 'pt-BR',
  zh: 'zh',
  ja: 'ja',
  ko: 'ko',
  ar: 'ar-SA',
  tr: 'tr',
  hi: 'hi',
  vi: 'vi',
  ga: 'ga',
};

const GROK_VOICES = new Set(['eve', 'ara', 'rex', 'sal', 'leo']);

export function normalizeLanguageForGrok(lang: string): string {
  return GROK_LANGUAGE_MAP[lang] ?? 'auto';
}

export function resolveGrokVoice(requestedVoice: string | undefined, defaultVoice: string): string {
  if (requestedVoice !== undefined && GROK_VOICES.has(requestedVoice)) {
    return requestedVoice;
  }
  return defaultVoice;
}
