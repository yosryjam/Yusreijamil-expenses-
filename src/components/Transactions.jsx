// src/components/Transactions.jsx — טבלת עסקאות עם עריכת קטגוריה, סינון וייצוא CSV

import { useState, useMemo } from "react";
import { T, CATEGORIES, fmt2, monthOf } from "../constants/theme";

export default function Transactions({ transactions = [], months = [], onCategoryChange, onDelete }) {
  const [month, setMonth] = useState("all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const view = useMemo(() => {
    return transactions.filter(t =>
      (month === "all" || monthOf(t.date) === month) &&
      (cat === "all" || t.category === cat) &&
      (!q || (t.merchant || "").toLowerCase().includes(q.toLowerCase()))
    );
  }, [transactions, month, cat, q]);

  const total = view.reduce((s, t) => s + t.amount, 0);

  function exportCsv() {
    const csv = "date,merchant,amount,card,category\n" +
      view.map(t => `${t.date},"${(t.merchant || "").replace(/"/g, '""')}",${t.amount},${t.card},${t.category}`).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>עסקאות</h1>
        <button onClick={exportCsv}
          style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ייצוא CSV לאקסל
        </button>
      </div>

      {/* מסננים */}
      <div className="flex flex-wrap gap-2">
        <select value={month} onChange={e => setMonth(e.target.value)}
          style={sel}>
          <option value="all">כל החודשים</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={cat} onChange={e => setCat(e.target.value)} style={sel}>
          <option value="all">כל הקטגוריות</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש בית עסק…"
          style={{ ...sel, minWidth: 180 }} />
        <div className="flex items-center px-3" style={{ fontSize: 13, color: T.sub }}>
          {view.length} עסקאות · <span style={{ fontVariantNumeric: "tabular-nums", direction: "ltr", marginRight: 4, fontWeight: 700, color: T.ink }}>{fmt2(total)}</span>
        </div>
      </div>

      {/* טבלה */}
      <div className="p-4 md:p-5"
        style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
        {view.length === 0 ? (
          <div style={{ color: T.sub }}>אין עסקאות תואמות.</div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ color: T.sub, textAlign: "right", position: "sticky", top: 0, background: T.card, zIndex: 1 }}>
                  <th className="py-2 pl-2 font-bold">תאריך</th>
                  <th className="py-2 pl-2 font-bold">בית עסק</th>
                  <th className="py-2 pl-2 font-bold">כרטיס</th>
                  <th className="py-2 pl-2 font-bold">סכום</th>
                  <th className="py-2 pl-2 font-bold">קטגוריה</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {view.map(t => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${T.line}` }}>
                    <td className="py-2 pl-2" style={{ whiteSpace: "nowrap", direction: "ltr", textAlign: "right" }}>{t.date}</td>
                    <td className="py-2 pl-2" dir="auto">{t.merchant}</td>
                    <td className="py-2 pl-2" style={{ direction: "ltr", textAlign: "right", whiteSpace: "nowrap" }}>{t.card}</td>
                    <td className="py-2 pl-2" style={{ fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right", whiteSpace: "nowrap", fontWeight: 700, color: t.amount < 0 ? T.green : T.ink }}>
                      {fmt2(t.amount)}
                    </td>
                    <td className="py-2 pl-2">
                      <select value={t.category}
                        onChange={e => onCategoryChange(t.id, e.target.value, t.merchant)}
                        style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, background: "#fff" }}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-2 text-left">
                      <button onClick={() => onDelete(t.id)} title="מחיקה"
                        style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 14 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const sel = {
  border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 12px",
  background: T.card, fontSize: 13, fontWeight: 600,
};
