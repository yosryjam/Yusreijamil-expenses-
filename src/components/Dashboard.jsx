// src/components/Dashboard.jsx — Premium fintech-style dashboard: KPI row, period-aware
// category donut (click to filter transactions), monthly trend, spending by card,
// category summary table, top merchants, recent transactions, local rule-based insights.

import { useMemo, useState } from "react";
import {
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { T, CATEGORIES, CATEGORY_COLORS, fmt, fmt2 } from "../constants/theme";
import { computeInsights } from "../utils/insights";
import { computeDashboard } from "../utils/dashboardStats";
import KpiCard from "./dashboard/KpiCard";
import CategoryDonut from "./dashboard/CategoryDonut";

function Card({ title, action, children }) {
  return (
    <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16 }}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export default function Dashboard({ transactions = [], period, income = 0, budgets = {}, onGoSettings, onCategorySelect }) {
  const [trendCategory, setTrendCategory] = useState("all");

  const { data, error } = useMemo(() => {
    try {
      return { data: computeDashboard(transactions, period, trendCategory), error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }, [transactions, period, trendCategory]);

  const insights = useMemo(() => {
    try {
      return computeInsights({ transactions, period, budgets, income });
    } catch {
      return [];
    }
  }, [transactions, period, budgets, income]);

  if (transactions.length === 0) {
    return (
      <Card title="איך מתחילים">
        <div style={{ color: T.sub }}>
          אין עדיין נתונים. לחצו על <b>+ העלאת דוח</b> למעלה והעלו את דפי ה-PDF —
          המערכת תחלץ ותסווג את כל העסקאות אוטומטית.
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="שגיאה בטעינת לוח הבקרה">
        <div style={{ color: T.red, fontSize: 13 }}>
          אירעה שגיאה בעיבוד הנתונים. נסו לבחור תקופה אחרת או לרענן את הדף.
        </div>
      </Card>
    );
  }

  const d = data;

  return (
    <div className="space-y-4">
      {/* ===== KPI row ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="סך הוצאות" value={fmt(d.total)} deltaPct={d.deltaPct}
          spark={d.spark} color={T.primary} soft={T.primarySoft} icon="💳" />
        <KpiCard label="ממוצע חודשי" value={fmt(d.monthlyAverage)}
          spark={d.spark} color={T.blue} soft={T.blueSoft} icon="📊" />
        <KpiCard label="מספר עסקאות" value={String(d.count)}
          spark={d.spark} color={T.orange} soft={T.orangeSoft} icon="🧾" />
        <KpiCard label="קטגוריה מובילה" value={d.topCategory}
          color={T.green} soft={T.greenSoft} icon="🏷" />
        <KpiCard label="שינוי לעומת קודם" value={d.deltaPct != null ? `${d.deltaPct > 0 ? "+" : ""}${d.deltaPct.toFixed(0)}%` : "—"}
          deltaPct={d.deltaPct} color={d.deltaPct > 0 ? T.red : T.green}
          soft={d.deltaPct > 0 ? T.redSoft : T.greenSoft} icon="↕" />
      </div>

      {income === 0 && (
        <div className="p-3 flex items-center justify-between flex-wrap gap-2"
          style={{ background: T.primarySoft, borderRadius: 12, fontSize: 13 }}>
          <span>הגדירו הכנסה חודשית ותקציב לכל קטגוריה — וכל הכרטיסים והטבעת יתמלאו.</span>
          <button onClick={onGoSettings}
            style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            להגדרות ←
          </button>
        </div>
      )}

      {/* ===== category donut · trend · spending by card ===== */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="פילוח לפי קטגוריה">
          <CategoryDonut data={d.donut} total={d.total} onSelectCategory={onCategorySelect} />
        </Card>

        <Card title="מגמת הוצאות"
          action={
            <select value={trendCategory} onChange={e => setTrendCategory(e.target.value)}
              style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, background: "#fff" }}>
              <option value="all">כל הקטגוריות</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          }>
          <div style={{ height: 190, direction: "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.trend} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={T.line} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.sub }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${T.line}` }} />
                <Line type="monotone" dataKey="total" stroke={T.primary} strokeWidth={2.5} dot={{ r: 3, fill: T.primary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="הוצאות לפי כרטיס">
          <div className="space-y-3">
            {d.cardBars.map(([card, amt], i) => {
              const colors = [T.primary, T.blue, T.green, T.orange, T.red];
              const max = d.cardBars[0]?.[1] || 1;
              const pct = d.total ? (amt / d.total) * 100 : 0;
              return (
                <div key={card}>
                  <div className="flex justify-between" style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 700, direction: "ltr" }}>{card}</span>
                    <span style={{ color: T.sub, fontVariantNumeric: "tabular-nums", direction: "ltr" }}>
                      {fmt(amt)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ background: T.line, borderRadius: 6, height: 8, marginTop: 4 }}>
                    <div style={{ width: `${Math.max((amt / max) * 100, 2)}%`, background: colors[i % colors.length], height: 8, borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ===== insights · recent transactions ===== */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="תובנות פיננסיות">
          <div className="space-y-2">
            {insights.map((s, i) => (
              <div key={i} className="flex gap-2" style={{ fontSize: 13 }}>
                <span style={{ color: T.primary }}>•</span><span>{s}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="עסקאות אחרונות">
          <div className="space-y-2">
            {d.recent.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1"
                style={{ borderBottom: `1px solid ${T.line}`, fontSize: 13 }}>
                <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <div className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 30, height: 30, borderRadius: 8, fontSize: 13, fontWeight: 800, color: "#fff",
                      background: CATEGORY_COLORS[t.category] || T.sub,
                    }}>
                    {(t.merchant || "?").trim()[0]}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div dir="auto" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.merchant}
                    </div>
                    <div style={{ fontSize: 11, color: T.sub }}>{t.date} · {t.card} · {t.category}</div>
                  </div>
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, direction: "ltr", flexShrink: 0, color: t.amount < 0 ? T.green : T.ink }}>
                  {fmt2(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== category summary table · top merchants ===== */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="סיכום לפי קטגוריה">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: T.sub, textAlign: "right" }}>
                  <th className="py-1.5">קטגוריה</th><th>סכום</th><th>%</th><th>ממוצע חודשי</th><th>עסקאות</th><th>שינוי</th>
                </tr>
              </thead>
              <tbody>
                {d.categoryTable.map(r => (
                  <tr key={r.cat} style={{ borderTop: `1px solid ${T.line}` }}>
                    <td className="py-1.5" style={{ fontWeight: 600 }}>{r.cat}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{fmt(r.amount)}</td>
                    <td>{r.pct.toFixed(0)}%</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{fmt(r.monthlyAvg)}</td>
                    <td>{r.count}</td>
                    <td style={{ color: r.deltaPct == null ? T.sub : r.deltaPct > 0 ? T.red : T.green }}>
                      {r.deltaPct == null ? "—" : `${r.deltaPct > 0 ? "+" : ""}${r.deltaPct.toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="בתי העסק המובילים">
          <div className="space-y-2.5">
            {d.topMerchants.map((m, i) => {
              const max = d.topMerchants[0]?.amount || 1;
              return (
                <div key={m.merchant}>
                  <div className="flex justify-between" style={{ fontSize: 13 }}>
                    <span dir="auto" style={{ fontWeight: 600 }}>{i + 1}. {m.merchant}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: T.sub, direction: "ltr" }}>
                      {fmt(m.amount)} · {m.count} עסקאות
                    </span>
                  </div>
                  <div style={{ background: T.line, borderRadius: 6, height: 6, marginTop: 3 }}>
                    <div style={{ width: `${(m.amount / max) * 100}%`, background: T.primary, height: 6, borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
