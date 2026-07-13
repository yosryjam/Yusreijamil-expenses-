import { describe, expect, it } from "vitest";
import {
  cleanText,
  detectIssuer,
  detectLast4,
  groupRows,
  parseAmount,
  parseRows,
  toIsoDate,
} from "./genericParser";

describe("cleanText", () => {
  it("collapses whitespace and strips non-breaking spaces", () => {
    expect(cleanText("A B   C\n D")).toBe("A B C D");
  });
});

describe("toIsoDate", () => {
  it("converts DD/MM/YY to YYYY-MM-DD", () => {
    expect(toIsoDate("05/03/24")).toBe("2024-03-05");
  });

  it("converts DD/MM/YYYY to YYYY-MM-DD", () => {
    expect(toIsoDate("05/03/2024")).toBe("2024-03-05");
  });

  it("returns null when no date is present", () => {
    expect(toIsoDate("no date here")).toBeNull();
  });
});

describe("parseAmount", () => {
  it("parses amounts with a shekel sign and thousands separators", () => {
    expect(parseAmount("₪1,234.56")).toBe(1234.56);
  });

  it("returns null for non-numeric input", () => {
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("detectIssuer", () => {
  it("detects MAX from text", () => {
    expect(detectIssuer("חשבונית MAX חודשית")).toBe("MAX");
  });

  it("detects AMEX from filename", () => {
    expect(detectIssuer("", "amex-statement.pdf")).toBe("AMEX");
  });

  it("falls back to UNKNOWN", () => {
    expect(detectIssuer("nothing recognizable", "file.pdf")).toBe("UNKNOWN");
  });
});

describe("detectLast4", () => {
  it("extracts 4 digits following a card-ending marker", () => {
    expect(detectLast4("הכרטיס המסתיים בספרות 1234")).toBe("1234");
  });

  it("returns null when no marker is present", () => {
    expect(detectLast4("no card info")).toBeNull();
  });
});

describe("groupRows", () => {
  it("groups text items sharing a y-coordinate into exactly one row string, top to bottom", () => {
    const items = [
      { text: "05/03/2024", x: 10, y: 100 },
      { text: "שופרסל", x: 50, y: 100 },
      { text: "123.45", x: 90, y: 100 },
      { text: "second", x: 10, y: 50 },
    ];
    const rows = groupRows(items);
    // one string per visual row (not two) — the duplicate-ordering bug this
    // guards against used to make every transaction get parsed and counted twice.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("05/03/2024");
    expect(rows[0]).toContain("שופרסל");
    expect(rows[1]).toContain("second");
  });

  it("orders items within a row right-to-left (descending x), matching Hebrew reading order", () => {
    const items = [
      { text: "A", x: 0, y: 100 },
      { text: "B", x: 10, y: 101.5 }, // within tolerance of the same row
    ];
    const rows = groupRows(items);
    expect(rows[0]).toBe("B A");
  });
});

describe("parseRows", () => {
  it("extracts a transaction from a well-formed row", () => {
    const rows = ["05/03/2024 שופרסל 123.45"];
    const [tx] = parseRows(rows, "CAL-1234");
    expect(tx).toMatchObject({
      date: "2024-03-05",
      merchant: "שופרסל",
      amount: 123.45,
      card: "CAL-1234",
      confidence: 0.72,
      source: "local-pdf",
    });
  });

  it("negates refund/credit amounts", () => {
    const rows = ["05/03/2024 זיכוי שופרסל 50.00"];
    const [tx] = parseRows(rows, "CAL-1234");
    expect(tx.amount).toBe(-50);
    // \b word boundaries don't match around Hebrew characters in JS regex,
    // so deriveMerchant's Hebrew stop-word stripping never fires here — this
    // locks in that (pre-existing) behavior rather than the ideal outcome.
    expect(tx.merchant).toBe("זיכוי שופרסל");
  });

  it("skips excluded summary lines", () => {
    const rows = ["05/03/2024 סך הכל 999.00"];
    expect(parseRows(rows, "CAL-1234")).toHaveLength(0);
  });

  it("skips rows without a date", () => {
    expect(parseRows(["שופרסל 123.45"], "CAL-1234")).toHaveLength(0);
  });

  it("de-duplicates identical transactions within the same statement", () => {
    const rows = ["05/03/2024 שופרסל 123.45", "05/03/2024 שופרסל 123.45"];
    expect(parseRows(rows, "CAL-1234")).toHaveLength(1);
  });
});
