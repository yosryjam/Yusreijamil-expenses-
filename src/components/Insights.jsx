// src/components/Insights.jsx — full list of local, rule-based financial insights.
import { useState } from "react";
import { T } from "../constants/theme";
import { computeInsights } from "../utils/insights";
import PeriodSelector from "./dashboard/PeriodSelector";

const SEVERITY_LABEL = { critical: "קריטי", warning: "אזהרה", info: "מידע" };

export default function Insights({ transactions = [], period, onPeriodChange, budgets = {}, income = 0 }) {
  const [dismissed, setDismissed] = useState(() => new Set());
  const insights = computeInsights({ transactions, period, budgets, income })
    .filter(x => !dismissed.has(x.id));

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
        {insights.length === 0 ? (
          <div style={{ color: T.sub, fontSize: 13 }}>אין תובנות להצגה כרגע.</div>
        ) : (
          <div className="space-y-3">
            {insights.map(x => {
              const color = x.severity === "critical" ? T.red : x.severity === "warning" ? T.orange : T.primary;
              const soft = x.severity === "critical" ? T.redSoft : x.severity === "warning" ? T.orangeSoft : T.primarySoft;
              return (
                <div key={x.id} className="p-3 flex gap-3 items-start" style={{ background: soft, borderRadius: 12 }}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ background: color, color: "#fff", borderRadius: 999, padding: "1px 8px", fontSize: 10, fontWeight: 800 }}>
                        {SEVERITY_LABEL[x.severity] || "מידע"}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{x.message}</span>
                    </div>
                    {x.explanation && <div style={{ fontSize: 12, color: T.sub }}>{x.explanation}</div>}
                    {x.suggestedAction && (
                      <div style={{ fontSize: 12, color, fontWeight: 700, marginTop: 4 }}>💡 {x.suggestedAction}</div>
                    )}
                  </div>
                  <button onClick={() => setDismissed(prev => new Set(prev).add(x.id))} title="התעלמות מתובנה זו"
                    style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
