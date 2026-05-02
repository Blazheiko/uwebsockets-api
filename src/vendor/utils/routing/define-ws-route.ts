import type {
  RouteItem,
  RouteConfig,
  InferPayload,
  WsHandler,
} from "#vendor/types/types.js";
import type { BaseType } from "@arktype/type";

/**
 * Типизированный WS handler с payload выведенным из validator
 */
type TypedWsHandler<TValidator extends BaseType | undefined> =
  TValidator extends BaseType
    ? WsHandler<InferPayload<TValidator>>
    : WsHandler;

/**
 * Конфигурация WS роута с типизированным handler.
 * method задаётся автоматически как "ws".
 */
type WsRouteConfig<TValidator extends BaseType | undefined = undefined> = Omit<
  RouteConfig<TValidator>,
  "method"
> & {
  handler: TypedWsHandler<TValidator>;
};

/**
 * Создаёт типизированный WS роут.
 * Тип payload в handler автоматически выводится из validator.
 */
export function defineWsRoute<TValidator extends BaseType | undefined = undefined>(
  config: WsRouteConfig<TValidator>,
): RouteItem<TValidator> {
  return {
    method: "ws",
    ...config,
  } as RouteItem<TValidator>;
}
