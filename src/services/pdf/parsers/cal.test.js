import { describe, expect, it } from "vitest";
import parseCalStatement from "./cal";
import parseMileagePlusStatement from "./mileagePlus";
import { CAL_ROWS } from "./__fixtures__/cal.fixture";

describe("parseCalStatement", () => {
  const result = parseCalStatement(CAL_ROWS, "CAL-0003");

  it("excludes the revolving-credit principal row but includes the interest row", () => {
    const revolving = result.filter(t => t.merchant.includes("שירות אשראי מתגלגל"));
    expect(revolving).toHaveLength(1);
    expect(revolving[0]).toMatchObject({ amount: 470.69 });
  });

  it("captures installment number/total from 'N מ - M'", () => {
    const tx = result.find(t => t.merchant.includes("רשות דמו"));
    expect(tx).toMatchObject({ installmentNumber: 5, installmentTotal: 5, amount: 427.39 });
  });

  it("strips Apple Pay / industry-field noise from the merchant name", () => {
    const tx = result.find(t => t.merchant.includes("בית קפה דמו"));
    expect(tx.merchant).toBe("בית קפה דמו");
  });

  it("keeps the already-negative refund amount without double-flipping the sign", () => {
    const tx = result.find(t => t.merchant.includes("ביטוח דמו"));
    expect(tx).toMatchObject({ amount: -206.54 });
  });

  it("excludes the future-charge notice row (two dates on one line)", () => {
    expect(result.some(t => t.merchant.includes("ביטוח בריאות דמו"))).toBe(false);
  });

  it("excludes interest-rate table rows (a date next to a rate percentage)", () => {
    expect(result.some(t => t.amount === 15.75 || t.amount === 14.9)).toBe(false);
  });

  it("tags every row with high confidence and the cal source", () => {
    expect(result.every(t => t.confidence === 0.9 && t.source === "local-pdf-cal")).toBe(true);
  });
});

describe("parseMileagePlusStatement", () => {
  it("delegates to the same parser as plain CAL statements (identical layout)", () => {
    expect(parseMileagePlusStatement).toBe(parseCalStatement);
  });
});
