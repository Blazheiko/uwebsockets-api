import type {
  RouteItem,
  RouteConfig,
  InferPayload,
  HttpHandler,
} from "#vendor/types/types.js";
import type { BaseType } from "@arktype/type";

/**
 * Типизированный handler с payload выведенным из validator
 */
type TypedHandler<TValidator extends BaseType | undefined> = TValidator extends BaseType
  ? HttpHandler<InferPayload<TValidator>>
  : HttpHandler;

/**
 * Конфигурация роута с типизированным handler
 */
interface TypedRouteConfig<TValidator extends BaseType | undefined>
  extends RouteConfig<TValidator> {
  handler: TypedHandler<TValidator>;
}

/**
 * Создаёт типизированный роут.
 * Тип payload в handler автоматически выводится из validator.
 *
 * @example
 * defineRoute({
 *   url: "/contact",
 *   method: "post",
 *   validator: CreateContactAsInputSchema,
 *   handler: (context) => {
 *     // context.httpData.payload типизирован как CreateContactAsInput
 *     const payload = getTypedPayload(context);
 *     return Promise.resolve({ status: true });
 *   },
 *   description: "Create contact",
 * })
 */
export function defineRoute(
  config: TypedRouteConfig<undefined>,
): RouteItem<undefined>;
export function defineRoute<TValidator extends BaseType>(
  config: TypedRouteConfig<TValidator> & { validator: TValidator },
): RouteItem<TValidator>;
export function defineRoute<TValidator extends BaseType | undefined = undefined>(
  config: TypedRouteConfig<TValidator>,
): RouteItem<TValidator> {
  return config as RouteItem<TValidator>;
}
