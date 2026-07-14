import { describe, expect, it } from "vitest";
import { computeInsights } from "./insights";

const period = { mode: "current", anchorMonth: "2024-02" };

describe("computeInsights", () => {
  it("returns structured objects with id, message, severity, explanation and suggestedAction", () => {
    const transactions = [
      { date: "2024-02-01", amount: 100, category: "סופרמרקט" },
    ];
    const [first] = computeInsights({ transactions, period });
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("message");
    expect(["info", "warning", "critical"]).toContain(first.severity);
    expect(typeof first.explanation).toBe("string");
    expect(typeof first.suggestedAction).toBe("string");
  });

  it("flags transactions needing review with a dedicated, correctly-counted insight", () => {
    const transactions = [
      { date: "2024-02-01", amount: 100, category: "סופרמרקט", needsReview: true, reviewed: false },
      { date: "2024-02-02", amount: 50, category: "סופרמרקט", needsReview: true, reviewed: true },
      { date: "2024-02-03", amount: 30, category: "סופרמרקט", needsReview: false },
    ];
    const insights = computeInsights({ transactions, period });
    const reviewInsight = insights.find(x => x.message.includes("הדורשות בדיקה"));
    expect(reviewInsight).toBeTruthy();
    expect(reviewInsight.message).toContain("1"); // only the un-reviewed needsReview row counts
    expect(reviewInsight.severity).toBe("warning");
  });

  it("does not raise a review insight when nothing needs review", () => {
    const transactions = [{ date: "2024-02-01", amount: 100, category: "סופרמרקט", needsReview: false }];
    const insights = computeInsights({ transactions, period });
    expect(insights.some(x => x.message.includes("הדורשות בדיקה"))).toBe(false);
  });

  it("flags overspending income as critical", () => {
    const transactions = [{ date: "2024-02-01", amount: 6000, category: "סופרמרקט" }];
    const insights = computeInsights({ transactions, period, income: 5000 });
    const overspend = insights.find(x => x.message.includes("עולות על ההכנסה"));
    expect(overspend).toBeTruthy();
    expect(overspend.severity).toBe("critical");
  });

  it("falls back to a single info insight when there is nothing else to report", () => {
    const insights = computeInsights({ transactions: [], period: { mode: "all" } });
    expect(insights).toHaveLength(1);
    expect(insights[0].severity).toBe("info");
  });
});
