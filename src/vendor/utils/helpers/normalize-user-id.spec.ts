import { describe, expect, it } from "vitest";
import { normalizeUserId } from "./normalize-user-id.js";

describe("normalizeUserId", () => {
  it("keeps the internal unauthenticated sentinel", () => {
    expect(normalizeUserId(null)).toBe("0");
    expect(normalizeUserId("")).toBe("0");
  });

  it("canonicalizes numeric string user IDs", () => {
    expect(normalizeUserId("00123")).toBe("123");
    expect(normalizeUserId("000")).toBe("0");
  });

  it("preserves canonical positive IDs", () => {
    expect(normalizeUserId("10")).toBe("10");
    expect(normalizeUserId(10)).toBe("10");
    expect(normalizeUserId(10n)).toBe("10");
  });
});
