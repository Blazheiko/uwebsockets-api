import type { HttpContext, WsContext } from "#vendor/types/types.js";

type AnyContext = HttpContext | WsContext;
type PayloadFromContext<TContext extends AnyContext> =
  TContext extends HttpContext<infer TPayload>
    ? TPayload
    : TContext extends WsContext<infer TPayload>
      ? TPayload
      : never;

/**
 * Извлекает типизированный payload из контекста.
 * Тип payload выводится автоматически из generic параметра контекста.
 * Предполагает что валидация уже выполнена в server.ts
 */
export function getTypedPayload<TContext extends AnyContext>(
  context: TContext
): PayloadFromContext<TContext> {
  const payload = "httpData" in context
    ? context.httpData.payload
    : context.wsData.payload;

  if (payload === null) {
    throw new Error("Payload is missing");
  }

  // Runtime validation happens before this helper is called.
  return payload as PayloadFromContext<TContext>;
}

/**
 * Type guard для проверки что контекст является HttpContext
 */
export function isHttpContext<TPayload>(
  context: HttpContext<TPayload> | WsContext<TPayload>
): context is HttpContext<TPayload> {
  return "httpData" in context;
}

/**
 * Type guard для проверки что контекст является WsContext
 */
export function isWsContext<TPayload>(
  context: HttpContext<TPayload> | WsContext<TPayload>
): context is WsContext<TPayload> {
  return "wsData" in context;
}
