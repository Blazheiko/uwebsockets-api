import { describe, expect, it } from "vitest";
import {
  isAuthorizedEntityRequest,
  isCanonicalEntityId,
  isSessionUserId,
  toCanonicalEntityId,
} from "./entity-id.js";

describe("entity-id helpers", () => {
  it("accepts only canonical positive entity IDs", () => {
    expect(isCanonicalEntityId("1")).toBe(true);
    expect(isCanonicalEntityId("10")).toBe(true);
    expect(isCanonicalEntityId("0")).toBe(false);
    expect(isCanonicalEntityId("00123")).toBe(false);
  });

  it("accepts session sentinel 0 separately from entity IDs", () => {
    expect(isSessionUserId("0")).toBe(true);
    expect(isSessionUserId("10")).toBe(true);
    expect(isSessionUserId("00123")).toBe(false);
  });

  it("normalizes unknown values only when they are canonical entity IDs", () => {
    expect(toCanonicalEntityId("10")).toBe("10");
    expect(toCanonicalEntityId(10)).toBe("10");
    expect(toCanonicalEntityId(10n)).toBe("10");
    expect(toCanonicalEntityId("0010")).toBeNull();
    expect(toCanonicalEntityId("0")).toBeNull();
  });

  it("authorizes only canonical matching IDs", () => {
    expect(isAuthorizedEntityRequest("123", "123")).toBe(true);
    expect(isAuthorizedEntityRequest("00123", "123")).toBe(false);
    expect(isAuthorizedEntityRequest("123", "0")).toBe(false);
  });
});
