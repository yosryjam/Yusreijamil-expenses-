import { describe, expect, it } from "vitest";
import { migrateCategory, categorize, CATEGORIES } from "./theme";

describe("migrateCategory", () => {
  it("remaps the old פארם category to the Phase 3 name", () => {
    expect(migrateCategory("פארם")).toBe("פארם ובריאות");
  });

  it("remaps the old overseas-charges category name", () => {
    expect(migrateCategory('חיובי חו"ל ומנויים')).toBe('חיובים בחו"ל');
  });

  it("leaves already-current category names untouched", () => {
    expect(migrateCategory("סופרמרקט")).toBe("סופרמרקט");
    expect(migrateCategory("מסעדות ובתי קפה")).toBe("מסעדות ובתי קפה");
  });
});

describe("CATEGORIES", () => {
  it("includes both renamed categories and keeps the restaurants category", () => {
    expect(CATEGORIES).toContain("פארם ובריאות");
    expect(CATEGORIES).toContain('חיובים בחו"ל');
    expect(CATEGORIES).toContain("מסעדות ובתי קפה");
    expect(CATEGORIES).not.toContain("פארם");
  });
});

describe("categorize", () => {
  it("maps a pharmacy merchant to the renamed category", () => {
    expect(categorize("סופר-פארם רמת גן", [])).toBe("פארם ובריאות");
  });

  it("maps a known overseas subscription to the renamed category", () => {
    expect(categorize("NETFLIX.COM", [])).toBe('חיובים בחו"ל');
  });
});
