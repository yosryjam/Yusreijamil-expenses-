// src/components/Transactions.jsx — טבלת עסקאות עם סינון, עריכה, הערות וסימון כנבדק

import { useState, useMemo } from "react";
import { T, CATEGORIES, fmt2, monthOf } from "../constants/theme";

const emptyFilters = { month: "all", cat: "all", card: "all", q: "", from: "", to: "", min: "", max: "", reviewOnly: false };

export default function Transactions({ transactions = [], months = [], initialCategory, onCategoryChange, onUpdateTransaction, onDelete }) {
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, cat: initialCategory || "all" }));
  const [confirmingId, setConfirmingId] = useState(null);

  const cards = useMemo(() => [...new Set(transactions.map(t => t.card))].sort(), [transactions]);

  function setFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters({ ...emptyFilters });
  }

  const view = useMemo(() => {
    const min = filters.min === "" ? null : Number(filters.min);
    const max = filters.max === "" ? null : Number(filters.max);
    return transactions.filter(t =>
      (filters.month === "all" || monthOf(t.date) === filters.month) &&
      (filters.cat === "all" || t.category === filters.cat) &&
      (filters.card === "all" || t.card === filters.card) &&
      (!filters.q || (t.merchant || "").toLowerCase().includes(filters.q.toLowerCase())) &&
      (!filters.from || t.date >= filters.from) &&
      (!filters.to || t.date <= filters.to) &&
      (min === null || t.amount >= min) &&
      (max === null || t.amount <= max) &&
      (!filters.reviewOnly || (t.needsReview && !t.reviewed))
    );
  }, [transactions, filters]);

  const total = view.reduce((s, t) => s + t.amount, 0);
  const hasActiveFilters = Object.keys(emptyFilters).some(k => filters[k] !== emptyFilters[k]);

  function exportCsv() {
    const csv = "date,merchant,amount,card,category,note,reviewed\n" +
      view.map(t => `${t.date},"${(t.merchant || "").replace(/"/g, '""')}",${t.amount},${t.card},${t.category},"${(t.note || "").replace(/"/g, '""')}",${t.reviewed ? "1" : "0"}`).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "expenses.csv";
    a.click();
  }

  function requestDelete(id) {
    if (confirmingId === id) {
      onDelete(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
    }
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
      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.month} onChange={e => setFilter("month", e.target.value)} style={sel}>
          <option value="all">כל החודשים</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.cat} onChange={e => setFilter("cat", e.target.value)} style={sel}>
          <option value="all">כל הקטגוריות</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filters.card} onChange={e => setFilter("card", e.target.value)} style={{ ...sel, direction: "ltr" }}>
          <option value="all">כל הכרטיסים</option>
          {cards.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={filters.q} onChange={e => setFilter("q", e.target.value)} placeholder="חיפוש בית עסק…" style={{ ...sel, minWidth: 160 }} />
        <input type="date" value={filters.from} onChange={e => setFilter("from", e.target.value)} dir="ltr" style={{ ...sel, width: 140 }} title="מתאריך" />
        <input type="date" value={filters.to} onChange={e => setFilter("to", e.target.value)} dir="ltr" style={{ ...sel, width: 140 }} title="עד תאריך" />
        <input type="number" value={filters.min} onChange={e => setFilter("min", e.target.value)} placeholder="סכום מינימום" dir="ltr" style={{ ...sel, width: 110 }} />
        <input type="number" value={filters.max} onChange={e => setFilter("max", e.target.value)} placeholder="סכום מקסימום" dir="ltr" style={{ ...sel, width: 110 }} />
        <label className="flex items-center gap-1.5" style={{ ...sel, cursor: "pointer" }}>
          <input type="checkbox" checked={filters.reviewOnly} onChange={e => setFilter("reviewOnly", e.target.checked)} />
          דורש בדיקה בלבד
        </label>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, color: T.primary, cursor: "pointer" }}>
            נקה סינון
          </button>
        )}
        <div className="flex items-center px-3" style={{ fontSize: 13, color: T.sub }}>
          {view.length} עסקאות · <span style={{ fontVariantNumeric: "tabular-nums", direction: "ltr", marginRight: 4, fontWeight: 700, color: T.ink }}>{fmt2(total)}</span>
        </div>
      </div>

      {/* טבלה */}
      <div className="p-4 md:p-5"
        style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
        {view.length === 0 ? (
          <div style={{ color: T.sub }}>
            {transactions.length === 0 ? "אין עדיין עסקאות. העלו דף חיוב כדי להתחיל." : "אין עסקאות התואמות את הסינון שנבחר."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              <table className="w-full" style={{ fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr style={{ color: T.sub, textAlign: "right", position: "sticky", top: 0, background: T.card, zIndex: 1 }}>
                    <th className="py-2 pl-2 font-bold">תאריך</th>
                    <th className="py-2 pl-2 font-bold">בית עסק</th>
                    <th className="py-2 pl-2 font-bold">כרטיס</th>
                    <th className="py-2 pl-2 font-bold">סכום</th>
                    <th className="py-2 pl-2 font-bold">קטגוריה</th>
                    <th className="py-2 pl-2 font-bold">הערות</th>
                    <th className="py-2 pl-2 font-bold" style={{ textAlign: "center" }}>נבדק</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {view.map(t => (
                    <tr key={t.id} style={{ borderTop: `1px solid ${T.line}`, background: t.needsReview && !t.reviewed ? T.orangeSoft : "transparent" }}>
                      <td className="py-2 pl-2" style={{ whiteSpace: "nowrap", direction: "ltr", textAlign: "right" }}>{t.date}</td>
                      <td className="py-2 pl-2">
                        <input dir="auto" value={t.merchant} style={editableCell}
                          onChange={e => onUpdateTransaction(t.id, { merchant: e.target.value })} />
                      </td>
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
                      <td className="py-2 pl-2">
                        <input value={t.note || ""} placeholder="הוספת הערה…" style={{ ...editableCell, minWidth: 140 }}
                          onChange={e => onUpdateTransaction(t.id, { note: e.target.value })} />
                      </td>
                      <td className="py-2 text-center">
                        <input type="checkbox" checked={!!t.reviewed} title="סמן כנבדק"
                          onChange={e => onUpdateTransaction(t.id, { reviewed: e.target.checked })} />
                      </td>
                      <td className="py-2 text-left" style={{ whiteSpace: "nowrap" }}>
                        {confirmingId === t.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => requestDelete(t.id)} title="אישור מחיקה"
                              style={{ border: "none", background: T.red, color: "#fff", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                              למחוק
                            </button>
                            <button onClick={() => setConfirmingId(null)} title="ביטול"
                              style={{ border: "none", background: "none", color: T.sub, cursor: "pointer", fontSize: 11 }}>
                              ביטול
                            </button>
                          </span>
                        ) : (
                          <button onClick={() => requestDelete(t.id)} title="מחיקה"
                            style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontSize: 14 }}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

const editableCell = {
  border: "1px solid transparent",
  borderRadius: 6,
  padding: "3px 5px",
  background: "transparent",
  fontSize: 13,
  width: "100%",
};
