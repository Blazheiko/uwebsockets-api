import { type as arktype } from '@arktype/type';
import type { ActionDefinition, ActionContext, ActionResult } from './types.js';
import {
  createProposal,
  saveVocabularyIntent,
} from '#app/services/actions/pending-proposals.js';
import { broadcastService } from '#app/services/broadcast-service.js';
import logger from '#logger';

const vocabularyParamsType = arktype({
  topic: 'string',
  description: 'string',
  'levelCode?': 'string',
});

type VocabularyParams = typeof vocabularyParamsType.infer;

const vocabularyParamsSchema = {
  type: 'object',
  properties: {
    topic: {
      type: 'string',
      description: 'Topic for the vocabulary, e.g. "hotels", "travel", "food"',
    },
    description: {
      type: 'string',
      description: 'Short purpose description, e.g. "Hotel vocabulary for B1 traveler"',
    },
    levelCode: {
      type: 'string',
      description: 'Student proficiency level: A1, A2, B1, B2, C1, C2',
    },
  },
  required: ['topic', 'description'],
} as const;

export const vocabularyAction: ActionDefinition<VocabularyParams> = {
  name: 'propose_vocabulary',
  description: [
    'Propose creating a vocabulary collection for the student on a specific topic.',
    'Call this as soon as the student clearly wants a vocabulary collection and the topic is known.',
    'This immediately sends an inline card to the teacher chat with Create and Cancel buttons.',
    'Provide a clear topic and optional level code (A1-C2).',
  ].join(' '),
  parameters: vocabularyParamsType,
  parametersSchema: vocabularyParamsSchema as Record<string, unknown>,

  async execute(params: unknown, ctx: ActionContext): Promise<ActionResult> {
    let validated: VocabularyParams;
    try {
      validated = vocabularyParamsType.assert(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Invalid parameters: ${msg}` };
    }

    const draft = {
      topic: validated.topic,
      description: validated.description,
      ...((validated as { levelCode?: string }).levelCode !== undefined
        ? { levelCode: (validated as { levelCode?: string }).levelCode }
        : {}),
    };
    saveVocabularyIntent(ctx.userIdStr, draft);

    const proposalId = createProposal({
      userId: ctx.userId,
      userIdStr: ctx.userIdStr,
      langLearning: ctx.langLearning,
      topic: validated.topic,
      description: validated.description,
      levelCode: (validated as { levelCode?: string }).levelCode,
    });

    const sent = broadcastService.broadcastMessageToUser(ctx.userIdStr, 'teacher_vocabulary_proposal', {
      proposalId,
      topic: validated.topic,
      description: validated.description,
      langLearning: ctx.langLearning,
    });
    logger.info({ proposalId, topic: validated.topic, userIdStr: ctx.userIdStr, sent }, 'propose_vocabulary: proposal created and broadcast sent');

    return {
      success: true,
      message: `OK. Proposal sent. Now tell the student that a Create/Cancel card appeared directly in the teacher chat.`,
      data: { proposalId },
    };
  },
};
