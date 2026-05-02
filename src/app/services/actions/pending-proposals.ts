const TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface VocabularyProposal {
  userId: bigint;
  userIdStr: string;
  langLearning: string;
  topic: string;
  description: string;
  levelCode: string | undefined;
  expiresAt: number;
}

export interface VocabularyIntentDraft {
  topic: string;
  description: string;
  levelCode?: string;
  expiresAt: number;
}

const proposals = new Map<string, VocabularyProposal>();
const vocabularyIntents = new Map<string, VocabularyIntentDraft>();

/** Store a proposal and return its ID. */
export function createProposal(proposal: Omit<VocabularyProposal, 'expiresAt'>): string {
  const id = crypto.randomUUID();
  proposals.set(id, { ...proposal, expiresAt: Date.now() + TTL_MS });
  return id;
}

/** Read a proposal without removing it. Returns undefined if not found or expired. */
export function peekProposal(id: string): VocabularyProposal | undefined {
  const proposal = proposals.get(id);
  if (proposal === undefined) return undefined;
  if (Date.now() > proposal.expiresAt) {
    proposals.delete(id);
    return undefined;
  }
  return proposal;
}

/** Remove a proposal by ID (call after successful ownership check and action dispatch). */
export function deleteProposal(id: string): void {
  proposals.delete(id);
}

export function saveVocabularyIntent(
  userIdStr: string,
  draft: Omit<VocabularyIntentDraft, 'expiresAt'>,
): void {
  vocabularyIntents.set(userIdStr, {
    ...draft,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function peekVocabularyIntent(userIdStr: string): VocabularyIntentDraft | undefined {
  const draft = vocabularyIntents.get(userIdStr);
  if (draft === undefined) return undefined;
  if (Date.now() > draft.expiresAt) {
    vocabularyIntents.delete(userIdStr);
    return undefined;
  }
  return draft;
}

export function clearVocabularyIntent(userIdStr: string): void {
  vocabularyIntents.delete(userIdStr);
}

/** Periodically remove expired proposals (call once at startup). */
export function startProposalCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [id, proposal] of proposals) {
      if (now > proposal.expiresAt) proposals.delete(id);
    }
    for (const [userIdStr, draft] of vocabularyIntents) {
      if (now > draft.expiresAt) vocabularyIntents.delete(userIdStr);
    }
  }, TTL_MS);
}
