import type { HttpContext } from "#vendor/types/types.js";
import { resolveLanguageCode } from "shared/enums";

export function resolveBrowserLanguageFromHeader(
  acceptLanguageHeader: string | null | undefined,
): string {
  return resolveLanguageCode(acceptLanguageHeader ?? "en");
}

export function resolveBrowserLanguageFromContext(context: HttpContext): string {
  return resolveBrowserLanguageFromHeader(
    context.httpData.headers.get("accept-language"),
  );
}
