import type { Type } from '@arktype/type';

export interface ActionContext {
  userId: bigint;
  userIdStr: string;
  langLearning: string;
  targetUuid: string | undefined;
}

export interface ActionResult {
  success: boolean;
  /** Text returned to the LLM as the tool result */
  message: string;
  data?: unknown;
}

export interface ToolDef {
  description: string;
  /** Plain JSON Schema with field descriptions — passed to jsonSchema() from 'ai' */
  parametersSchema: Record<string, unknown>;
}

export interface ToolCallHandler {
  tools: Record<string, ToolDef>;
  onCall(toolName: string, params: unknown): Promise<string>;
}

export interface ActionDefinition<TParams = unknown> {
  name: string;
  description: string;
  /** ArkType Type — used for runtime validation in execute() */
  parameters: Type<TParams>;
  /** JSON Schema with descriptions for the AI SDK. If omitted, generated from parameters.toJsonSchema() */
  parametersSchema?: Record<string, unknown>;
  execute(params: TParams, ctx: ActionContext): Promise<ActionResult>;
}
