import type { Type } from "@arktype/type";
import {
  serializeArkSchema,
  type SerializedArkSchema,
} from "#vendor/utils/tooling/serialize-ark-schema.js";

function isArkType(value: unknown): value is Type {
  if (value === null || value === undefined) return false;
  const t = typeof value;
  if (t !== "object" && t !== "function") return false;
  return (
    "expression" in (value as object) &&
    "json" in (value as object) &&
    typeof (value as Record<string, unknown>)["expression"] === "string"
  );
}

type SerializedRouteItem = Record<string, unknown> & {
  handler: null;
  validator: undefined;
  ResponseSchema: undefined;
  inputSchema?: SerializedArkSchema;
  outputSchema?: SerializedArkSchema;
};

/**
 * Serializes routes for the doc endpoint:
 * - Removes handler function references
 * - Extracts ArkType validator → inputSchema { expression, fields[] }
 * - Extracts ArkType ResponseSchema → outputSchema { expression, fields[] }
 * - Supports unlimited nesting of groups
 */
export function serializeRoutes(routes: unknown[]): unknown[] {
  return routes.map((item: unknown) => {
    if (typeof item !== "object" || item === null) return item;
    const obj = item as Record<string, unknown>;

    // Group container — recurse into nested routes
    if (Array.isArray(obj["group"])) {
      return {
        ...obj,
        validator: undefined,
        ResponseSchema: undefined,
        group: serializeRoutes(obj["group"] as unknown[]),
      };
    }

    // Route item — extract schema info and null out non-serializable fields
    const result: SerializedRouteItem = {
      ...obj,
      handler: null,
      validator: undefined,
      ResponseSchema: undefined,
    };

    if (isArkType(obj["validator"])) {
      result.inputSchema = serializeArkSchema(obj["validator"]);
    }

    if (isArkType(obj["ResponseSchema"])) {
      result.outputSchema = serializeArkSchema(obj["ResponseSchema"]);
    }

    return result;
  });
}
