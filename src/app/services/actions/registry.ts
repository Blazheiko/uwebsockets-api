import type { ActionDefinition, ActionContext, ToolCallHandler, ToolDef } from './types.js';

class ActionRegistry {
  private readonly actions = new Map<string, ActionDefinition>();

  register<T>(action: ActionDefinition<T>): void {
    this.actions.set(action.name, action as ActionDefinition);
  }

  /**
   * Builds a ToolCallHandler for use in TextStreamOptions.
   * The adapter wraps each ToolDef with an execute() that delegates to onCall.
   */
  buildToolCallHandler(ctx: ActionContext): ToolCallHandler {
    const tools: Record<string, ToolDef> = {};

    for (const [name, action] of this.actions) {
      const schema =
        action.parametersSchema ??
        (action.parameters.toJsonSchema() as Record<string, unknown>);

      tools[name] = {
        description: action.description,
        parametersSchema: schema,
      };
    }

    return {
      tools,
      onCall: async (toolName: string, params: unknown): Promise<string> => {
        const action = this.actions.get(toolName);
        if (action === undefined) {
          return `Unknown action: ${toolName}`;
        }
        try {
          const result = await action.execute(params, ctx);
          return result.message;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return `Action ${toolName} failed: ${msg}`;
        }
      },
    };
  }

  has(toolName: string): boolean {
    return this.actions.has(toolName);
  }

  /** Returns a list of "toolName — description" lines for embedding in system prompts. */
  describeTools(): string[] {
    const lines: string[] = [];
    for (const [name, action] of this.actions) {
      lines.push(`${name} — ${action.description}`);
    }
    return lines;
  }
}

export const actionRegistry = new ActionRegistry();
