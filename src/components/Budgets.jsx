// src/components/Budgets.jsx — monthly budget by category, extracted from Settings.
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { T, CATEGORIES, fmt } from "../constants/theme";
import { filterByPeriod } from "../utils/period";

function BudgetRing({ spent, budget }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 999) : 0;
  const over = budget > 0 && spent > budget;
  const ring = [
    { v: Math.min(spent, budget) },
    { v: Math.max(budget - spent, 0) },
  ];
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div style={{ position: "relative", width: 160, height: 160, direction: "ltr", flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={ring} dataKey="v" innerRadius={58} outerRadius={76}
              startAngle={90} endAngle={-270} strokeWidth={0}>
              <Cell fill={over ? T.red : T.green} />
              <Cell fill={T.line} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(spent)}</div>
          <div style={{ fontSize: 11, color: T.sub }}>הוצאה</div>
        </div>
      </div>
      <div className="space-y-1">
        <div style={{ fontSize: 26, fontWeight: 800, color: over ? T.red : T.ink }}>
          {budget > 0 ? `${pct.toFixed(0)}%` : "—"}
        </div>
        <div style={{ fontSize: 12, color: T.sub }}>מהתקציב נוצל</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: over ? T.red : T.green, fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right" }}>
          {budget > 0 ? fmt(Math.abs(budget - spent)) : fmt(0)}
        </div>
        <div style={{ fontSize: 12, color: T.sub }}>{over ? "חריגה מהתקציב" : "נותר"}</div>
        <div style={{ fontSize: 12, color: T.sub }}>תקציב: <b style={{ direction: "ltr" }}>{budget > 0 ? fmt(budget) : "לא הוגדר"}</b></div>
      </div>
    </div>
  );
}

export default function Budgets({ budgets, transactions = [], period, onSave }) {
  const [b, setB] = useState({ ...budgets });
  const inPeriod = period ? filterByPeriod(transactions, period) : transactions;
  const byCat = {};
  for (const t of inPeriod) byCat[t.category] = (byCat[t.category] || 0) + t.amount;

  const totalBudget = Object.values(b).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalSpent = Object.keys(b).reduce((sum, cat) => sum + (b[cat] > 0 ? (byCat[cat] || 0) : 0), 0);

  const rows = CATEGORIES.filter(c => c !== "ריבית ועמלות")
    .map(cat => ({ cat, budget: Number(b[cat] || 0), spent: byCat[cat] || 0 }))
    .filter(r => r.budget > 0)
    .sort((a, b2) => b2.spent / b2.budget - a.spent / a.budget);

  return (
    <div className="space-y-4">
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>תקציבים</h1>

      <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }} className="mb-3">הוצאה מול תקציב כולל</div>
        <BudgetRing spent={totalSpent} budget={totalBudget} />
      </div>

      {rows.length > 0 && (
        <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }} className="mb-3">סקירת תקציב לפי קטגוריה</div>
          <div className="space-y-3">
            {rows.map(r => {
              const pct = Math.min((r.spent / r.budget) * 100, 100);
              const over = r.spent > r.budget;
              const color = over ? T.red : pct > 85 ? T.orange : T.green;
              return (
                <div key={r.cat}>
                  <div className="flex justify-between" style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 700 }}>{r.cat}</span>
                    <span style={{ color: T.sub, fontVariantNumeric: "tabular-nums", direction: "ltr" }}>
                      {fmt(r.spent)} / {fmt(r.budget)} · {((r.spent / r.budget) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ background: T.line, borderRadius: 6, height: 8, marginTop: 4 }}>
                    <div style={{ width: `${Math.max(pct, 2)}%`, background: color, height: 8, borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, maxWidth: 650 }}>
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontSize: 15, fontWeight: 800 }}>תקציב חודשי לפי קטגוריה</div>
          <div style={{ fontSize: 12, color: T.sub }}>סה"כ: <b dir="ltr">{fmt(totalBudget)}</b></div>
        </div>
        <div className="space-y-2">
          {CATEGORIES.filter(category => category !== "ריבית ועמלות").map(category => (
            <div key={category} className="flex items-center justify-between gap-3">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{category}</span>
              <input type="number" inputMode="numeric" value={b[category] ?? ""}
                onChange={e => setB(previous => ({ ...previous, [category]: e.target.value }))}
                placeholder="₪" dir="ltr"
                style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: "7px 10px", width: 130, fontSize: 14, background: "#fff", textAlign: "right" }} />
            </div>
          ))}
        </div>
        <button
          onClick={() => onSave(Object.fromEntries(Object.entries(b).map(([key, value]) => [key, Number(value) || 0])))}
          className="mt-4"
          style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          שמירת תקציבים
        </button>
      </div>
    </div>
  );
}
