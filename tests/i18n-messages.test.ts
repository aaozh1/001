import { describe, it, expect } from "vitest";
import { defaultLocale, isLocale, locales } from "@/lib/i18n/config";
import th from "@/lib/i18n/messages/th.json";
import en from "@/lib/i18n/messages/en.json";

// Flatten nested message objects into dot-path keys, e.g. "auth.loginTitle".
function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object"
      ? keyPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

describe("i18n config", () => {
  it("defaults to Thai", () => {
    expect(defaultLocale).toBe("th");
    expect(locales).toContain("en");
  });

  it("isLocale guards the locale union", () => {
    expect(isLocale("th")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("message dictionaries", () => {
  const thKeys = keyPaths(th).sort();
  const enKeys = keyPaths(en).sort();

  it("TH and EN expose exactly the same keys (no missing translations)", () => {
    expect(enKeys).toEqual(thKeys);
  });

  it("has no empty string values", () => {
    const empties = [
      ...keyPaths(th).filter((p) => resolve(th, p) === ""),
      ...keyPaths(en).filter((p) => resolve(en, p) === ""),
    ];
    expect(empties).toEqual([]);
  });
});

function resolve(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], obj);
}
