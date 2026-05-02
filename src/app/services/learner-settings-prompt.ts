export interface LearnerSettingsPromptContext {
  proficiencyLevel?: string;
  learningGoal?: string;
}

function normalizeValue(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized !== undefined && normalized.length > 0 ? normalized : undefined;
}

export function resolveLearnerSettingsPromptContext(input?: {
  proficiencyLevel?: string | null;
  learningGoal?: string | null;
}): LearnerSettingsPromptContext {
  const proficiencyLevel = normalizeValue(input?.proficiencyLevel);
  const learningGoal = normalizeValue(input?.learningGoal);
  return {
    ...(proficiencyLevel !== undefined ? { proficiencyLevel } : {}),
    ...(learningGoal !== undefined ? { learningGoal } : {}),
  };
}

export function buildLearnerSettingsPromptBlock(
  context?: LearnerSettingsPromptContext,
): string {
  const proficiencyLevel = normalizeValue(context?.proficiencyLevel);
  const learningGoal = normalizeValue(context?.learningGoal);
  const lines: string[] = [];

  if (proficiencyLevel !== undefined) {
    lines.push(`- Proficiency level: ${proficiencyLevel}`);
  }
  if (learningGoal !== undefined) {
    lines.push(`- Learning goal: ${learningGoal}`);
  }

  return lines.length > 0 ? `Learner settings:\n${lines.join("\n")}` : "";
}
