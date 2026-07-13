import { describe, expect, it } from "vitest";
import parseAmexStatement from "./amex";
import { AMEX_ROWS } from "./__fixtures__/amex.fixture";

describe("parseAmexStatement", () => {
  const result = parseAmexStatement(AMEX_ROWS, "AMEX-0004");

  it("flags the foreign-currency row for manual review instead of guessing", () => {
    const tx = result.find(t => t.source === "local-pdf-amex-fx");
    expect(tx).toMatchObject({ amount: 32.3, needsReview: true, confidence: 0.55 });
  });

  it("excludes the foreign-purchases subtotal and 'for info' footnote rows", () => {
    expect(result.some(t => t.merchant.includes("קניות מחו"))).toBe(false);
    expect(result.some(t => t.merchant.includes("לידיעה"))).toBe(false);
  });

  it("includes ordinary domestic purchases at high confidence, not flagged", () => {
    const tx = result.find(t => t.merchant.includes("פאסט דמו"));
    expect(tx).toMatchObject({ amount: 46, needsReview: false, confidence: 0.9 });
  });

  it("flags a 'פרעון' settlement row for manual review and strips the marker word", () => {
    const tx = result.find(t => t.merchant.includes("אופנה דמו"));
    expect(tx).toMatchObject({ amount: 604.9, needsReview: true });
    expect(tx.merchant).not.toMatch(/פרעון/);
  });

  it("does not fabricate a transaction for the dateless card-fee line", () => {
    expect(result.some(t => t.amount === 73.51)).toBe(false);
  });
});
