// src/components/Settings.jsx — הכנסה חודשית + תקציב לכל קטגוריה

import { useState } from "react";
import { T, CATEGORIES, fmt } from "../constants/theme";

export default function Settings({ income, budgets, onSave }) {
  const [inc, setInc] = useState(income || "");
  const [b, setB] = useState({ ...budgets });

  const totalBudget = Object.values(b).reduce((s, v) => s + Number(v || 0), 0);

  return (
    <div className="space-y-4" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>תקציב והגדרות</h1>

      <div className="p-4 md:p-5"
        style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }} className="mb-1">הכנסה חודשית</div>
        <div style={{ fontSize: 12, color: T.sub }} className="mb-2">
          משמש לחישוב חיסכון חודשי ושיעור חיסכון בלוח הבקרה. נשמר רק בדפדפן שלך.
        </div>
        <input type="number" inputMode="numeric" value={inc}
          onChange={e => setInc(e.target.value)}
          placeholder="למשל 40000"
          dir="ltr"
          style={inp} />
      </div>

      <div className="p-4 md:p-5"
        style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
        <div className="flex items-center justify-between mb-2">
          <div style={{ fontSize: 15, fontWeight: 800 }}>תקציב חודשי לפי קטגוריה</div>
          <div style={{ fontSize: 12, color: T.sub }}>
            סה"כ: <b style={{ fontVariantNumeric: "tabular-nums" }} dir="ltr">{fmt(totalBudget)}</b>
          </div>
        </div>
        <div className="space-y-2">
          {CATEGORIES.filter(c => c !== "ריבית ועמלות").map(c => (
            <div key={c} className="flex items-center justify-between gap-3">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{c}</span>
              <input type="number" inputMode="numeric" value={b[c] ?? ""}
                onChange={e => setB(prev => ({ ...prev, [c]: e.target.value }))}
                placeholder="₪" dir="ltr"
                style={{ ...inp, width: 130, padding: "7px 10px" }} />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSave(Number(inc) || 0,
          Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Number(v) || 0])))}
        style={{
          background: T.primary, color: "#fff", border: "none", borderRadius: 10,
          padding: "11px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer",
        }}>
        שמירה
      </button>
    </div>
  );
}

const inp = {
  border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 12px",
  fontSize: 14, width: "100%", background: "#fff",
  fontVariantNumeric: "tabular-nums", textAlign: "right",
};
