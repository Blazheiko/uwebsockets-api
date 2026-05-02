export function normalizeTeacherVocabularyWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'[\]\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
