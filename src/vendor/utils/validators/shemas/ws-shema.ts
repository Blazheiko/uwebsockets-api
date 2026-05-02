import { type } from "@arktype/type";

export const WsMessageSchema = type({
  payload: type("Record<string, unknown>").or("null"),
  event: "string",
  timestamp: "number",
});
