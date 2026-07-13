import { describe, expect, it } from "vitest";
import { computeDashboard } from "./dashboardStats";

const TX = [
  { date: "2024-01-05", amount: 100, category: "סופרמרקט", card: "CAL-1", merchant: "שופרסל" },
  { date: "2024-01-20", amount: 50, category: "דלק", card: "MAX-1", merchant: "פז" },
  { date: "2024-02-10", amount: 200, category: "סופרמרקט", card: "CAL-1", merchant: "שופרסל" },
  { date: "2024-02-15", amount: 30, category: "ריבית ועמלות", card: "CAL-1", merchant: "עמלה" },
];

describe("computeDashboard", () => {
  const period = { mode: "current", anchorMonth: "2024-02" };

  it("totals only the transactions within the selected period", () => {
    const d = computeDashboard(TX, period, "all");
    expect(d.total).toBe(230);
    expect(d.count).toBe(2);
  });

  it("computes the delta against the previous period", () => {
    const d = computeDashboard(TX, period, "all");
    // Jan total was 150, Feb total is 230 -> +53.33%
    expect(d.deltaPct).toBeCloseTo(53.33, 1);
  });

  it("groups category totals correctly, sorted by amount descending", () => {
    const d = computeDashboard(TX, period, "all");
    expect(d.categoryTable).toEqual([
      expect.objectContaining({ cat: "סופרמרקט", amount: 200, count: 1, deltaPct: 100 }),
      expect.objectContaining({ cat: "ריבית ועמלות", amount: 30, count: 1, deltaPct: null }),
    ]);
  });

  it("computes each category's percentage of the period total", () => {
    const d = computeDashboard(TX, period, "all");
    const supermarket = d.categoryTable.find(r => r.cat === "סופרמרקט");
    expect(supermarket.pct).toBeCloseTo((200 / 230) * 100, 5);
  });

  it("identifies the top category by spend", () => {
    const d = computeDashboard(TX, period, "all");
    expect(d.topCategory).toBe("סופרמרקט");
  });

  it("excludes the fees category from top merchants", () => {
    const d = computeDashboard(TX, period, "all");
    expect(d.topMerchants).toEqual([{ merchant: "שופרסל", amount: 200, count: 1 }]);
  });

  it("groups spend by card within the period", () => {
    const d = computeDashboard(TX, period, "all");
    expect(d.cardBars).toEqual([["CAL-1", 230]]);
  });

  it("returns zeros/empties gracefully for a period with no matching transactions", () => {
    const d = computeDashboard(TX, { mode: "current", anchorMonth: "2099-01" }, "all");
    expect(d.total).toBe(0);
    expect(d.count).toBe(0);
    expect(d.categoryTable).toEqual([]);
    expect(d.topCategory).toBe("—");
  });
});
