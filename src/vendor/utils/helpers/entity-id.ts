export const ENTITY_ID_REGEX = /^[1-9]\d*$/;
export const SESSION_USER_ID_REGEX = /^(0|[1-9]\d*)$/;

export function isCanonicalEntityId(
  value: string | undefined | null,
): value is string {
  return typeof value === "string" && ENTITY_ID_REGEX.test(value);
}

export function isSessionUserId(
  value: string | undefined | null,
): value is string {
  return typeof value === "string" && SESSION_USER_ID_REGEX.test(value);
}

export function toCanonicalEntityId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return isCanonicalEntityId(trimmed) ? trimmed : null;
  }

  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    Number.isSafeInteger(value)
  ) {
    return String(value);
  }

  if (typeof value === "bigint" && value > 0n) {
    return String(value);
  }

  return null;
}

export function isAuthorizedEntityRequest(
  payloadUserId: string,
  sessionUserId: string | undefined,
): boolean {
  return (
    isCanonicalEntityId(payloadUserId) &&
    isCanonicalEntityId(sessionUserId) &&
    payloadUserId === sessionUserId
  );
}
