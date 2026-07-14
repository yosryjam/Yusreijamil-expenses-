import { describe, expect, it } from "vitest";
import parseMaxStatement from "./max";
import { MAX_ROWS } from "./__fixtures__/max.fixture";

describe("parseMaxStatement", () => {
  const result = parseMaxStatement(MAX_ROWS, "MAX-0000");

  it("attributes transactions to the correct card from per-section headers", () => {
    const cards = new Set(result.map(t => t.card));
    expect(cards).toEqual(new Set(["MAX-0001", "MAX-0002"]));
  });

  it("excludes the rolling-balance rollover line", () => {
    expect(result.some(t => t.merchant.includes("יתרת עסקות מצטברת"))).toBe(false);
  });

  it("excludes the loyalty-points table (no decimal amounts)", () => {
    expect(result.some(t => t.merchant.includes("נוסע מתמיד") || t.merchant.includes("נקודות"))).toBe(false);
  });

  it("excludes the future-charge (for-info) notice row", () => {
    expect(result.some(t => t.amount === 55659.31)).toBe(false);
  });

  it("includes a deferred-charge subscription row", () => {
    const tx = result.find(t => t.merchant.includes("FakeStream.com"));
    expect(tx).toMatchObject({ date: "2026-02-21", amount: 49.9, card: "MAX-0001" });
  });

  it("includes a standing order with a clean merchant name", () => {
    const tx = result.find(t => t.merchant.includes("חברת חשמל"));
    expect(tx).toMatchObject({ amount: 1177.44 });
    expect(tx.merchant).not.toMatch(/רגילה|הוראת קבע/);
  });

  it("includes the card fee under the second card", () => {
    const tx = result.find(t => t.merchant.includes("דמי כרטיס"));
    expect(tx).toMatchObject({ card: "MAX-0002", amount: 19.89 });
  });

  it("captures installment number/total when present", () => {
    const tx = result.find(t => t.merchant.includes("פיצה פצץ"));
    expect(tx).toMatchObject({ installmentNumber: 3, installmentTotal: 6, card: "MAX-0002" });
  });

  it("tags every row with high confidence and the max source", () => {
    expect(result.every(t => t.confidence === 0.9 && t.source === "local-pdf-max")).toBe(true);
  });
});
