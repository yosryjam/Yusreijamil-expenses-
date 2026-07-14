import { useRef, useState } from "react";
import { T } from "../constants/theme";

export default function Settings({ income, budgets, transactions = [], customRules = [], onSave, onRestore }) {
  const [inc, setInc] = useState(income || "");
  const [message, setMessage] = useState("");
  const restoreRef = useRef(null);

  function downloadBackup() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      transactions,
      customRules,
      income: Number(inc) || 0,
      budgets: budgets || {},
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `yj-finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("הגיבוי הורד בהצלחה.");
  }

  async function restoreBackup(file) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.transactions)) throw new Error("קובץ הגיבוי אינו תקין — חסר מערך עסקאות.");
      onRestore?.(parsed);
      setInc(parsed.income || "");
      setMessage(`שוחזרו ${parsed.transactions.length} עסקאות.`);
    } catch (error) {
      const reason = error instanceof SyntaxError ? "הקובץ אינו JSON תקין." : error.message;
      setMessage(`השחזור נכשל: ${reason}`);
    }
  }

  function exportCsv() {
    const header = "date,merchant,amount,card,category,confidence,source\n";
    const rows = transactions.map(t => [
      t.date,
      `"${String(t.merchant || "").replace(/"/g, '""')}"`,
      t.amount,
      t.card,
      t.category,
      t.confidence ?? "",
      t.source ?? "",
    ].join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `yj-finance-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4" style={{ maxWidth: 650 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>הגדרות</h1>

      <div className="p-4 md:p-5" style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 800 }} className="mb-1">הכנסה חודשית</div>
        <div style={{ fontSize: 12, color: T.sub }} className="mb-2">
          משמש לחישוב חיסכון חודשי משוער. הערך נשמר רק בדפדפן זה.
        </div>
        <input type="number" inputMode="numeric" value={inc} onChange={e => setInc(e.target.value)} placeholder="לדוגמה: 40000" dir="ltr" style={inputStyle} />
      </div>

      <div className="p-4 md:p-5" style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 800 }} className="mb-1">גיבוי וניידות נתונים</div>
        <div style={{ fontSize: 12, color: T.sub }} className="mb-3">
          הנתונים שלך נשמרים מקומית בדפדפן זה. הורידו גיבוי באופן קבוע ולפני ניקוי נתוני דפדפן או מעבר למחשב אחר.
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadBackup} style={secondaryButton}>הורדת גיבוי מלא</button>
          <button onClick={() => restoreRef.current?.click()} style={secondaryButton}>שחזור גיבוי</button>
          <button onClick={exportCsv} style={secondaryButton}>ייצוא עסקאות ל-CSV</button>
        </div>
        <input ref={restoreRef} type="file" accept="application/json,.json" style={{ display: "none" }}
          onChange={e => { const file = e.target.files?.[0]; if (file) restoreBackup(file); e.target.value = ""; }} />
        {message && <div className="mt-3" style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>{message}</div>}
      </div>

      <button onClick={() => onSave(Number(inc) || 0)}
        style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        שמירת הגדרות
      </button>
    </div>
  );
}

const cardStyle = { background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 };
const inputStyle = { border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, width: "100%", background: "#fff", fontVariantNumeric: "tabular-nums", textAlign: "right" };
const secondaryButton = { background: "#fff", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 9, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
