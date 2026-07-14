import { useEffect, useMemo, useRef, useState } from "react";
import { T, monthOf } from "../../constants/theme";
import { PERIOD_PRESETS, periodLabel, latestMonth } from "../../utils/period";

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

export default function PeriodSelector({ period, onChange, transactions = [] }) {
  const [open, setOpen] = useState(false);
  const [subMode, setSubMode] = useState(null); // "months" | "custom" | null
  const [draftMonths, setDraftMonths] = useState(period.months || []);
  const [draftRange, setDraftRange] = useState(period.range || {});
  const wrapRef = useRef(null);
  useOutsideClose(wrapRef, () => { setOpen(false); setSubMode(null); });

  const availableMonths = useMemo(
    () => [...new Set(transactions.map(t => monthOf(t.date)))].filter(Boolean).sort().reverse(),
    [transactions]
  );

  function pickPreset(key) {
    if (key === "months") { setSubMode("months"); return; }
    if (key === "custom") { setSubMode("custom"); return; }
    onChange({ mode: key, anchorMonth: latestMonth(transactions) });
    setOpen(false);
    setSubMode(null);
  }

  function applyMonths() {
    onChange({ mode: "months", months: draftMonths });
    setOpen(false);
    setSubMode(null);
  }

  function applyCustom() {
    onChange({ mode: "custom", range: draftRange });
    setOpen(false);
    setSubMode(null);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 14px", background: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
        📅 {periodLabel(period)}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20,
          background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10, minWidth: 220,
        }}>
          {subMode === null && (
            <div className="flex flex-col gap-0.5">
              {PERIOD_PRESETS.map(p => (
                <button key={p.key} onClick={() => pickPreset(p.key)}
                  style={{
                    textAlign: "right", padding: "8px 10px", borderRadius: 8, border: "none",
                    background: period.mode === p.key ? T.primarySoft : "transparent",
                    color: period.mode === p.key ? T.primary : T.ink,
                    fontWeight: period.mode === p.key ? 700 : 500, fontSize: 13, cursor: "pointer",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {subMode === "months" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>בחירת חודשים</div>
              <div style={{ maxHeight: 220, overflowY: "auto" }} className="space-y-1">
                {availableMonths.map(m => (
                  <label key={m} className="flex items-center gap-2" style={{ fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={draftMonths.includes(m)}
                      onChange={e => setDraftMonths(cur => e.target.checked ? [...cur, m] : cur.filter(x => x !== m))} />
                    {m}
                  </label>
                ))}
              </div>
              <div className="flex justify-between gap-2 mt-2">
                <button onClick={() => setSubMode(null)} style={secondaryBtn}>חזרה</button>
                <button onClick={applyMonths} disabled={!draftMonths.length} style={primaryBtn}>אישור</button>
              </div>
            </div>
          )}

          {subMode === "custom" && (
            <div className="space-y-2">
              <div style={{ fontSize: 12, fontWeight: 700 }}>טווח תאריכים מותאם</div>
              <input type="date" value={draftRange.from || ""} dir="ltr"
                onChange={e => setDraftRange(r => ({ ...r, from: e.target.value }))} style={dateInput} />
              <input type="date" value={draftRange.to || ""} dir="ltr"
                onChange={e => setDraftRange(r => ({ ...r, to: e.target.value }))} style={dateInput} />
              <div className="flex justify-between gap-2 mt-1">
                <button onClick={() => setSubMode(null)} style={secondaryBtn}>חזרה</button>
                <button onClick={applyCustom} disabled={!draftRange.from || !draftRange.to} style={primaryBtn}>אישור</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const primaryBtn = {
  background: T.primary, color: "#fff", border: "none", borderRadius: 8,
  padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
};
const secondaryBtn = {
  background: "none", color: T.sub, border: `1px solid ${T.line}`, borderRadius: 8,
  padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer",
};
const dateInput = {
  border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, width: "100%",
};
