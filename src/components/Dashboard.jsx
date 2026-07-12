// src/components/Dashboard.jsx — לוח בקרה בסגנון ה-mockup:
// שורת KPI עם ספארקליינים, דונאט קטגוריות, פסי כרטיסים,
// גרף מגמה, סיכום AI (מחושב מקומית), עסקאות אחרונות, בתי עסק מובילים.

import { useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { T, CATEGORY_COLORS, fmt, fmt2, monthOf } from "../constants/theme";

/* ---------- כרטיס KPI עם ספארקליין ---------- */
function Kpi({ label, value, delta, deltaGood, spark, color, soft, icon }) {
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
        <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right" }}>
          {value}
        </div>
        {delta != null && (
          <div style={{ fontSize: 12, fontWeight: 700, color: deltaGood ? T.green : T.red }}>
            {deltaGood ? "↓" : "↑"} {Math.abs(delta).toFixed(1)}% לעומת חודש קודם
          </div>
        )}
      </div>
      <div style={{ height: 44, direction: "ltr" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
              fill={`url(#g-${color})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------- מעטפת ---------- */
function Card({ title, children, className = "" }) {
  return (
    <div className={`p-4 md:p-5 ${className}`}
      style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
      {title && <div className="mb-3" style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>}
      {children}
    </div>
  );
}

export default function Dashboard({ transactions = [], month, onMonthChange, months = [] }) {
  const data = useMemo(() => {
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

    // השוואה לחודש קודם
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

    // תובנות AI (מחושבות מקומית — בלי API)
    const insights = [];
    if (prevTotal != null && prevTotal > 0) {
      const d = ((total - prevTotal) / prevTotal) * 100;
      insights.push(d <= 0
        ? `הוצאת ${Math.abs(d).toFixed(1)}% פחות מהחודש הקודם.`
        : `הוצאת ${d.toFixed(1)}% יותר מהחודש הקודם.`);
      const moves = Object.entries(byCat)
        .filter(([c]) => c !== "ריבית ועמלות" && prevByCat[c] > 100)
        .map(([c, v]) => [c, v - prevByCat[c]])
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 2);
      for (const [c, diff] of moves)
        insights.push(diff > 0
          ? `${c}: עלייה של ${fmt(diff)}.`
          : `${c}: ירידה של ${fmt(Math.abs(diff))}.`);
    }
    const interest = byCat["ריבית ועמלות"] || 0;
    if (interest > 300)
      insights.push(`שילמת ${fmt(interest)} ריבית ועמלות — זה יעד החיסכון המרכזי שלך.`);
    if (insights.length === 0) insights.push("ייבאו עוד חודש כדי לקבל השוואות ותובנות.");

    const days = new Set(inMonth.map(t => t.date)).size || 1;
    const topMerchants = Object.entries(
      inMonth.filter(t => t.amount > 0 && t.category !== "ריבית ועמלות")
        .reduce((m, t) => ((m[t.merchant] = (m[t.merchant] || 0) + t.amount), m), {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const recent = [...inMonth].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
    const donut = Object.entries(byCat).sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.max(value, 0) }));
    const cardBars = Object.entries(byCard).sort((a, b) => b[1] - a[1]);
    const maxCard = cardBars[0]?.[1] || 1;

    return {
      total, prevTotal, interest, trend, spark, insights,
      avgDaily: total / days, count: inMonth.length,
      topMerchants, recent, donut, cardBars, maxCard,
    };
  }, [transactions, month]);

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

  const deltaPct = data.prevTotal ? ((data.total - data.prevTotal) / data.prevTotal) * 100 : null;

  return (
    <div className="space-y-4">
      {/* בורר תקופה */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 13, color: T.sub, fontWeight: 700 }}>תקופה</span>
        <select value={month} onChange={e => onMonthChange(e.target.value)}
          style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: "7px 12px", background: T.card, fontSize: 13, fontWeight: 600 }}>
          <option value="all">כל החודשים</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* ===== שורת KPI ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="סך הוצאות" value={fmt(data.total)} delta={deltaPct} deltaGood={deltaPct != null && deltaPct <= 0}
          spark={data.spark} color={T.primary} soft={T.primarySoft} icon="💳" />
        <Kpi label="ממוצע ליום פעילות" value={fmt(data.avgDaily)}
          spark={data.spark} color={T.blue} soft={T.blueSoft} icon="📅" />
        <Kpi label="ריבית ועמלות" value={fmt(data.interest)}
          spark={data.spark} color={data.interest > 300 ? T.red : T.green}
          soft={data.interest > 300 ? T.redSoft : T.greenSoft} icon="⚠️" />
        <Kpi label="מספר עסקאות" value={String(data.count)}
          spark={data.spark} color={T.green} soft={T.greenSoft} icon="🧾" />
      </div>

      {/* ===== שורה שנייה: דונאט + כרטיסים + מגמה ===== */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* דונאט קטגוריות */}
        <Card title="פילוח לפי קטגוריה">
          <div className="flex items-center gap-3">
            <div style={{ width: 150, height: 150, direction: "ltr", flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.donut} dataKey="value" nameKey="name"
                    innerRadius={45} outerRadius={70} paddingAngle={2} strokeWidth={0}>
                    {data.donut.map((d) => (
                      <Cell key={d.name} fill={CATEGORY_COLORS[d.name] || T.sub} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${T.line}` }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1" style={{ minWidth: 0 }}>
              {data.donut.slice(0, 7).map(d => (
                <div key={d.name} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span className="flex items-center gap-1.5" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: CATEGORY_COLORS[d.name] || T.sub, flexShrink: 0 }} />
                    {d.name}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: T.sub, direction: "ltr" }}>
                    {fmt(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* לפי כרטיס */}
        <Card title="הוצאות לפי כרטיס">
          <div className="space-y-3">
            {data.cardBars.map(([card, amt], i) => {
              const colors = [T.primary, T.blue, T.green, T.orange, T.red];
              const pct = data.total ? (amt / data.total) * 100 : 0;
              return (
                <div key={card}>
                  <div className="flex justify-between" style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 700, direction: "ltr" }}>{card}</span>
                    <span style={{ color: T.sub, fontVariantNumeric: "tabular-nums", direction: "ltr" }}>
                      {fmt(amt)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ background: T.line, borderRadius: 6, height: 8, marginTop: 4 }}>
                    <div style={{ width: `${Math.max((amt / data.maxCard) * 100, 2)}%`, background: colors[i % colors.length], height: 8, borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* סיכום AI */}
        <Card>
          <div className="mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 800, color: T.primary }}>
            ✦ סיכום פיננסי חכם
          </div>
          <div className="space-y-2">
            {data.insights.map((s, i) => (
              <div key={i} className="flex gap-2" style={{ fontSize: 13 }}>
                <span style={{ color: T.primary }}>•</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== שורה שלישית: מגמה + עסקאות אחרונות + בתי עסק ===== */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="מגמת הוצאות" className="lg:col-span-1">
          <div style={{ height: 200, direction: "ltr" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={T.line} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: T.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.sub }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${T.line}` }} />
                <Line type="monotone" dataKey="total" stroke={T.primary} strokeWidth={2.5}
                  dot={{ r: 3, fill: T.primary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="עסקאות אחרונות">
          <div className="space-y-2">
            {data.recent.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-1"
                style={{ borderBottom: `1px solid ${T.line}`, fontSize: 13 }}>
                <div style={{ minWidth: 0 }}>
                  <div dir="auto" style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.merchant}
                  </div>
                  <div style={{ fontSize: 11, color: T.sub }}>{t.date} · {t.category}</div>
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, direction: "ltr", flexShrink: 0, color: t.amount < 0 ? T.green : T.ink }}>
                  {fmt2(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="בתי העסק המובילים">
          <div className="space-y-2">
            {data.topMerchants.map(([m, amt], i) => {
              const max = data.topMerchants[0]?.[1] || 1;
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
