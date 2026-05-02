import type { Type } from "@arktype/type";

export interface SerializedSchemaField {
  name: string;
  type: string;
  required: boolean;
}

export interface SerializedArkSchema {
  expression: string;
  fields: SerializedSchemaField[];
}

interface ArkPropNode {
  key: string;
  value: { expression: string };
  required: boolean;
  optional: boolean;
}

/**
 * Extracts human-readable schema info from an ArkType Type object.
 *
 * Uses `type.expression` for the full string and `type.props`
 * to enumerate properties with per-field expressions and required/optional flags.
 */
export function serializeArkSchema(schema: Type): SerializedArkSchema {
  const expression = schema.expression;
  const fields: SerializedSchemaField[] = [];

  try {
    const props = (schema as unknown as { props?: ArkPropNode[] }).props;

    if (Array.isArray(props)) {
      for (const prop of props) {
        if (typeof prop.key !== "string") continue;
        // Skip ArkType internal modifier keys like "+" (undeclared handling)
        if (prop.key.startsWith("+") || prop.key.startsWith("-")) continue;

        fields.push({
          name: prop.key,
          type: prop.value.expression,
          required: prop.required,
        });
      }
    }
  } catch {
    // structured extraction failed — return expression-only result
  }

  return { expression, fields };
}
