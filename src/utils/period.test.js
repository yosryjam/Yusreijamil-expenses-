import { describe, expect, it } from "vitest";
import {
  filterByPeriod,
  periodLabel,
  periodToMonths,
  previousPeriodMonths,
  shiftMonth,
} from "./period";

const TX = [
  { date: "2024-01-05", amount: 100 },
  { date: "2024-01-20", amount: 50 },
  { date: "2024-02-10", amount: 200 },
  { date: "2024-03-01", amount: 300 },
  { date: "2024-11-15", amount: 10 },
  { date: "2023-12-15", amount: 20 },
];

describe("shiftMonth", () => {
  it("moves forward within a year", () => {
    expect(shiftMonth("2024-01", 1)).toBe("2024-02");
  });
  it("rolls over to the next year", () => {
    expect(shiftMonth("2024-12", 1)).toBe("2025-01");
  });
  it("rolls back to the previous year", () => {
    expect(shiftMonth("2024-01", -1)).toBe("2023-12");
  });
});

describe("periodToMonths", () => {
  it("current mode returns just the anchor month", () => {
    expect(periodToMonths({ mode: "current", anchorMonth: "2024-03" }, TX)).toEqual(["2024-03"]);
  });

  it("previous mode returns the month before the anchor", () => {
    expect(periodToMonths({ mode: "previous", anchorMonth: "2024-03" }, TX)).toEqual(["2024-02"]);
  });

  it("last3 mode returns the anchor and 2 prior months, newest first", () => {
    expect(periodToMonths({ mode: "last3", anchorMonth: "2024-03" }, TX))
      .toEqual(["2024-03", "2024-02", "2024-01"]);
  });

  it("ytd mode returns January through the anchor month", () => {
    expect(periodToMonths({ mode: "ytd", anchorMonth: "2024-03" }, TX))
      .toEqual(["2024-01", "2024-02", "2024-03"]);
  });

  it("year mode returns all 12 months of the anchor's year", () => {
    expect(periodToMonths({ mode: "year", anchorMonth: "2024-03" }, TX)).toHaveLength(12);
  });

  it("months mode returns the explicit selection", () => {
    expect(periodToMonths({ mode: "months", months: ["2024-01", "2024-11"] }, TX))
      .toEqual(["2024-01", "2024-11"]);
  });

  it("returns null for custom/all modes (handled by filterByPeriod directly)", () => {
    expect(periodToMonths({ mode: "custom" }, TX)).toBeNull();
    expect(periodToMonths({ mode: "all" }, TX)).toBeNull();
  });

  it("months mode doesn't require a resolvable anchor (no transactions, no anchorMonth)", () => {
    expect(periodToMonths({ mode: "months", months: ["2024-01", "2024-11"] }, []))
      .toEqual(["2024-01", "2024-11"]);
  });
});

describe("filterByPeriod", () => {
  it("returns everything for 'all'", () => {
    expect(filterByPeriod(TX, { mode: "all" })).toHaveLength(TX.length);
  });

  it("filters to a single month for 'current'", () => {
    const result = filterByPeriod(TX, { mode: "current", anchorMonth: "2024-01" });
    expect(result).toHaveLength(2);
    expect(result.every(t => t.date.startsWith("2024-01"))).toBe(true);
  });

  it("filters an inclusive custom date range", () => {
    const result = filterByPeriod(TX, { mode: "custom", range: { from: "2024-01-10", to: "2024-02-28" } });
    expect(result.map(t => t.date)).toEqual(["2024-01-20", "2024-02-10"]);
  });
});

describe("previousPeriodMonths", () => {
  it("returns the prior month for 'current'", () => {
    expect(previousPeriodMonths({ mode: "current", anchorMonth: "2024-03" }, TX)).toEqual(["2024-02"]);
  });

  it("returns the 3 months preceding a last3 window", () => {
    expect(previousPeriodMonths({ mode: "last3", anchorMonth: "2024-03" }, TX))
      .toEqual(["2023-12", "2023-11", "2023-10"]);
  });

  it("returns null for 'all', 'custom' and 'months' modes", () => {
    expect(previousPeriodMonths({ mode: "all" }, TX)).toBeNull();
    expect(previousPeriodMonths({ mode: "custom" }, TX)).toBeNull();
    expect(previousPeriodMonths({ mode: "months", months: ["2024-01"] }, TX)).toBeNull();
  });
});

describe("periodLabel", () => {
  it("labels a preset", () => {
    expect(periodLabel({ mode: "current" })).toBe("החודש הנוכחי");
  });

  it("labels a custom range with the actual dates", () => {
    expect(periodLabel({ mode: "custom", range: { from: "2024-01-01", to: "2024-01-31" } }))
      .toBe("2024-01-01 – 2024-01-31");
  });
});
