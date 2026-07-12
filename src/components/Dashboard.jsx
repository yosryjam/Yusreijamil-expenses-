// src/components/Dashboard.jsx — לוח בקרה 1:1 לפי המוקאפ:
// שורת 5 KPI עם ספארקליינים · טבעת תקציב · דונאט קטגוריות עם אחוזים ·
// פסי כרטיסים · סיכום AI · מגמת הוצאות · עסקאות אחרונות ·
// סקירת תקציב · בתי עסק מובילים

import { useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { T, CATEGORY_COLORS, fmt, fmt2, monthOf } from "../constants/theme";

/* ============ רכיבי עזר ============ */

function Card({ title, action, children, className = "" }) {
  return (
    <div className={`p-4 md:p-5 ${className}`}
      style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
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

function Kpi({ label, value, deltaPct, goodWhenDown = true, spark, color, soft, icon }) {
  const good = deltaPct == null ? null : (goodWhenDown ? deltaPct <= 0 : deltaPct >= 0);
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
      <div className="p-4 pb-1">
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{label}</div>
          <div className="flex items-center justify-center"
            style={{ width: 30, height: 30, borderRadius: 999, background: soft, color, fontSize: 14 }}>
            {icon}
          </div>
        </div>
        <div style={{ fontSize: 23, fontWeight: 800, fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right" }}>
          {value}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, minHeight: 16, color: good == null ? T.sub : good ? T.green : T.red }}>
          {deltaPct != null && `${deltaPct <= 0 ? "↓" : "↑"} ${Math.abs(deltaPct).toFixed(1)}% לעומת חודש קודם`}
        </div>
      </div>
      <div style={{ height: 40, direction: "ltr" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
              fill={`url(#sg-${label})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* טבעת "תקציב מול הוצאה" */
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

/* ============ הרכיב הראשי ============ */

export default function Dashboard({ transactions = [], month, income = 0, budgets = {}, onGoSettings }) {
  const d = useMemo(() => {
    const inMonth = month === "all" ? transactions : transactions.filter(t => monthOf(t.date) === month);
    const total = inMonth.reduce((s, t) => s + t.amount, 0);

    const byCat = {}, byCard = {}, byMonth = {};
    for (const t of transactions) {
      const m = monthOf(t.date);
      byMonth[m] = (byMonth[m] || 0) + t.amount;
    }
    for (const t of inMonth) {
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
      byCard[t.card] = (byCard[t.card] || 0) + t.amount;
    }

    const monthsSorted = Object.keys(byMonth).sort();
    const trend = monthsSorted.slice(-8).map(m => ({ month: m.slice(2), total: Math.round(byMonth[m]) }));
    const spark = trend.map(x => ({ v: x.total }));

    let prevTotal = null, prevByCat = {};
    if (month !== "all") {
      const idx = monthsSorted.indexOf(month);
      if (idx > 0) {
        const pm = monthsSorted[idx - 1];
        prevTotal = byMonth[pm];
        for (const t of transactions.filter(t => monthOf(t.date) === pm))
          prevByCat[t.category] = (prevByCat[t.category] || 0) + t.amount;
      }
    }
    const deltaPct = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;

    // תובנות
    const insights = [];
    if (deltaPct != null) {
      insights.push(deltaPct <= 0
        ? `הוצאת ${Math.abs(deltaPct).toFixed(1)}% פחות מהחודש הקודם.`
        : `הוצאת ${deltaPct.toFixed(1)}% יותר מהחודש הקודם.`);
      Object.entries(byCat)
        .filter(([c]) => c !== "ריבית ועמלות" && (prevByCat[c] || 0) > 100)
        .map(([c, v]) => [c, v - prevByCat[c]])
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 2)
        .forEach(([c, diff]) => insights.push(
          diff > 0 ? `${c}: עלייה של ${fmt(diff)}.` : `${c}: ירידה של ${fmt(Math.abs(diff))}.`));
    }
    const interest = byCat["ריבית ועמלות"] || 0;
    if (interest > 300) insights.push(`שילמת ${fmt(interest)} ריבית ועמלות — יעד החיסכון המרכזי שלך.`);
    // חריגות תקציב
    for (const [c, b] of Object.entries(budgets)) {
      if (b > 0 && (byCat[c] || 0) > b)
        insights.push(`חריגה בתקציב ${c}: ${fmt(byCat[c] - b)} מעל היעד.`);
    }
    if (!insights.length) insights.push("ייבאו עוד חודש נתונים כדי לקבל השוואות ותובנות.");

    const totalBudget = Object.values(budgets).reduce((s, v) => s + Number(v || 0), 0);
    const savings = income > 0 ? income - total : null;
    const savingsRate = income > 0 ? (savings / income) * 100 : null;

    const budgetRows = Object.entries(budgets)
      .filter(([, b]) => b > 0)
      .map(([c, b]) => ({ cat: c, budget: Number(b), spent: byCat[c] || 0 }))
      .sort((a, b) => b.spent / b.budget - a.spent / a.budget)
      .slice(0, 6);

    const topMerchants = Object.entries(
      inMonth.filter(t => t.amount > 0 && t.category !== "ריבית ועמלות")
        .reduce((m, t) => ((m[t.merchant] = (m[t.merchant] || 0) + t.amount), m), {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const recent = [...inMonth].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    const donut = Object.entries(byCat).sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.max(value, 0) }));
    const cardBars = Object.entries(byCard).sort((a, b) => b[1] - a[1]);

    return {
      total, deltaPct, interest, trend, spark, insights,
      savings, savingsRate, totalBudget,
      topMerchants, recent, donut, cardBars, budgetRows,
      count: inMonth.length,
    };
  }, [transactions, month, income, budgets]);

  if (transactions.length === 0) {
    return (
      <Card title="איך מתחילים">
        <div style={{ color: T.sub }}>
          אין עדיין נתונים. לחצו על <b>+ ייבוא דף חיוב</b> למעלה והעלו את דפי ה-PDF —
          המערכת תחלץ ותסווג את כל העסקאות אוטומטית.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== שורת 5 KPI — כמו במוקאפ ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="הוצאות החודש" value={fmt(d.total)} deltaPct={d.deltaPct}
          spark={d.spark} color={T.primary} soft={T.primarySoft} icon="💳" />
        <Kpi label="הכנסה חודשית" value={income > 0 ? fmt(income) : "—"}
          spark={d.spark} color={T.green} soft={T.greenSoft} icon="💰" />
        <Kpi label="חיסכון החודש" value={d.savings != null ? fmt(d.savings) : "—"}
          spark={d.spark} color={T.orange} soft={T.orangeSoft} icon="🏦" />
        <Kpi label="שיעור חיסכון" value={d.savingsRate != null ? `${d.savingsRate.toFixed(0)}%` : "—"}
          spark={d.spark} color={T.blue} soft={T.blueSoft} icon="％" />
        <Kpi label="ריבית ועמלות" value={fmt(d.interest)}
          spark={d.spark} color={d.interest > 300 ? T.red : T.green}
          soft={d.interest > 300 ? T.redSoft : T.greenSoft} icon="⚠️" />
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

      {/* ===== שורה 2: טבעת תקציב · דונאט קטגוריות · לפי כרטיס ===== */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="הוצאה מול תקציב">
          <BudgetRing spent={d.total} budget={d.totalBudget} />
        </Card>

        <Card title="פילוח לפי קטגוריה">
          <div className="flex items-center gap-3">
            <div style={{ width: 140, height: 140, direction: "ltr", flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.donut} dataKey="value" nameKey="name"
                    innerRadius={42} outerRadius={66} paddingAngle={2} strokeWidth={0}>
                    {d.donut.map(x => <Cell key={x.name} fill={CATEGORY_COLORS[x.name] || T.sub} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${T.line}` }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1" style={{ minWidth: 0 }}>
              {d.donut.slice(0, 7).map(x => (
                <div key={x.name} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span className="flex items-center gap-1.5" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: CATEGORY_COLORS[x.name] || T.sub, flexShrink: 0 }} />
                    {x.name}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: T.sub, direction: "ltr", whiteSpace: "nowrap" }}>
                    {fmt(x.value)} · {d.total ? ((x.value / d.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              ))}
            </div>
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

      {/* ===== שורה 3: סיכום AI · מגמה · עסקאות אחרונות ===== */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <div className="mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 800, color: T.primary }}>
            ✦ סיכום פיננסי חכם
          </div>
          <div className="space-y-2">
            {d.insights.map((s, i) => (
              <div key={i} className="flex gap-2" style={{ fontSize: 13 }}>
                <span style={{ color: T.primary }}>•</span><span>{s}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="מגמת הוצאות">
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
                    <div style={{ fontSize: 11, color: T.sub }}>{t.date} · {t.category}</div>
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

      {/* ===== שורה 4: סקירת תקציב · בתי עסק מובילים ===== */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="סקירת תקציב"
          action={<button onClick={onGoSettings} style={{ background: "none", border: "none", color: T.primary, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>עריכה</button>}>
          {d.budgetRows.length === 0 ? (
            <div style={{ color: T.sub, fontSize: 13 }}>לא הוגדרו תקציבים — לחצו "עריכה" כדי להגדיר יעד לכל קטגוריה.</div>
          ) : (
            <div className="space-y-3">
              {d.budgetRows.map(r => {
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
          )}
        </Card>

        <Card title="בתי העסק המובילים">
          <div className="space-y-2.5">
            {d.topMerchants.map(([m, amt], i) => {
              const max = d.topMerchants[0]?.[1] || 1;
              return (
                <div key={m}>
                  <div className="flex justify-between" style={{ fontSize: 13 }}>
                    <span dir="auto" style={{ fontWeight: 600 }}>{i + 1}. {m}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: T.sub, direction: "ltr" }}>{fmt(amt)}</span>
                  </div>
                  <div style={{ background: T.line, borderRadius: 6, height: 6, marginTop: 3 }}>
                    <div style={{ width: `${(amt / max) * 100}%`, background: T.primary, height: 6, borderRadius: 6 }} />
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
