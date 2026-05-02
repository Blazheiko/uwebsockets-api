export const makeBroadcastJson = (
  event: string,
  status: number,
  payload: unknown,
): string => makeJson({ event: `broadcast:${event}`, status, payload });

export const makeJson = (value: unknown): string =>
  JSON.stringify(value, (_, v: unknown) =>
    typeof v === "bigint" ? v.toString() : v,
  );
