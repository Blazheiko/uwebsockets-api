import { describe, expect, it } from "vitest";

import {
  resolveBrowserLanguageFromHeader,
} from "./browser-language.js";

describe("resolveBrowserLanguageFromHeader", () => {
  it("falls back to en for missing or unknown values", () => {
    expect(resolveBrowserLanguageFromHeader(undefined)).toBe("en");
    expect(resolveBrowserLanguageFromHeader(null)).toBe("en");
    expect(resolveBrowserLanguageFromHeader("xx")).toBe("en");
  });

  it("uses the first Accept-Language item", () => {
    expect(resolveBrowserLanguageFromHeader("en-US,en;q=0.9,de;q=0.8")).toBe("en");
    expect(resolveBrowserLanguageFromHeader("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
  });

  it("normalizes underscores and case", () => {
    expect(resolveBrowserLanguageFromHeader("de_DE")).toBe("de");
    expect(resolveBrowserLanguageFromHeader("PT-br")).toBe("pt");
  });
});
