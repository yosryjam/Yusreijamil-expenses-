// src/components/Insights.jsx — full list of local, rule-based financial insights.
import { T } from "../constants/theme";
import { computeInsights } from "../utils/insights";
import PeriodSelector from "./dashboard/PeriodSelector";

export default function Insights({ transactions = [], period, onPeriodChange, budgets = {}, income = 0 }) {
  const insights = computeInsights({ transactions, period, budgets, income });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>תובנות</h1>
        <PeriodSelector period={period} onChange={onPeriodChange} transactions={transactions} />
      </div>

      <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16 }}>
        <div style={{ fontSize: 12, color: T.sub }} className="mb-3">
          כל התובנות מחושבות מקומית מתוך הנתונים שלך — ללא שימוש בשירות AI חיצוני.
        </div>
        <div className="space-y-3">
          {insights.map((s, i) => (
            <div key={i} className="flex gap-2 items-start" style={{ fontSize: 14 }}>
              <span style={{ color: T.primary, fontSize: 16 }}>✦</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
