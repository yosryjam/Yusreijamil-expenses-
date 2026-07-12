// src/components/Uploader.jsx — העלאת PDF ל-Netlify Function (בלי backend נפרד).
// המפתח נשמר ב-Netlify (Environment Variables) — לא בקוד ולא ב-GitHub.

import { useState, useRef } from "react";
import { T, categorize, txnKey } from "../constants/theme";

const FN_URL = "/.netlify/functions/parse-statement";

async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("קריאת הקובץ נכשלה"));
    r.readAsDataURL(file);
  });
}

async function parseOne(file) {
  const pdf_base64 = await fileToBase64(file);
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf_base64, filename: file.name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `שגיאת שרת (${res.status})`);
  return data.transactions || [];
}

export default function Uploader({ existingTransactions = [], customRules = [], onImported }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileStatus, setFileStatus] = useState([]);
  const [failedFiles, setFailedFiles] = useState([]);
  const [summary, setSummary] = useState("");
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    const files = [...fileList].filter(
      f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (!files.length) return;

    setBusy(true);
    setSummary("");
    setFileStatus(files.map(f => ({ name: f.name, state: "ממתין…" })));
    const setStat = (i, state, err) =>
      setFileStatus(s => s.map((x, j) => (j === i ? { ...x, state, err } : x)));

    // תור: 2 קבצים במקביל, עד 3 ניסיונות לכל קובץ
    const CONC = 2, RETRIES = 3;
    const results = new Array(files.length);
    const failed = [];
    let next = 0;

    async function worker() {
      while (next < files.length) {
        const i = next++;
        let lastErr = null;
        for (let a = 1; a <= RETRIES; a++) {
          setStat(i, a === 1 ? "מעבד…" : `ניסיון ${a}/${RETRIES}…`);
          try {
            results[i] = await parseOne(files[i]);
            setStat(i, `✓ ${results[i].length} עסקאות`);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            if (a < RETRIES) await new Promise(r => setTimeout(r, 2500 * a));
          }
        }
        if (lastErr) { setStat(i, `✕ ${lastErr.message}`, true); failed.push(files[i]); }
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker));
    setFailedFiles(failed);

    // סיווג + סינון כפילויות
    const existing = new Set(existingTransactions.map(txnKey));
    const seen = new Set();
    const fresh = [];
    let dupes = 0;
    for (const r of results.filter(Boolean).flat()) {
      const k = txnKey(r);
      if (existing.has(k) || seen.has(k)) { dupes++; continue; }
      seen.add(k);
      fresh.push({ ...r, id: k, category: categorize(r.merchant, customRules) });
    }

    setSummary(
      (fresh.length ? `יובאו ${fresh.length} עסקאות חדשות` : "לא נמצאו עסקאות חדשות") +
      (dupes ? ` · ${dupes} כפולות דולגו` : "") +
      (failed.length ? ` · ${failed.length} קבצים נכשלו` : "")
    );
    setBusy(false);
    if (fresh.length) onImported?.(fresh);
  }

  return (
    <div className="space-y-4">
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>ייבוא דפי חיוב</h1>

      <div className="p-4 md:p-5"
        style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
        <div className="mb-3" style={{ color: T.sub, fontSize: 13 }}>
          גררו לכאן דפי חיוב PDF (כאל, מקס, אמקס, לאומי) — או לחצו לבחירה. אפשר כמה קבצים בבת אחת.
        </div>

        <div role="button" tabIndex={0}
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (!busy) handleFiles(e.dataTransfer.files); }}
          style={{
            border: `2px dashed ${T.primary}`, borderRadius: 12,
            background: dragOver ? "#E0E3FD" : T.primarySoft,
            padding: "36px 16px", textAlign: "center",
            cursor: busy ? "wait" : "pointer", fontWeight: 700, color: T.primary,
            transition: "background 0.15s",
          }}>
          {busy ? "מעבד קבצים…" : "לחצו לבחירת קבצי PDF — או גררו לכאן"}
          <div style={{ fontSize: 11, fontWeight: 400, color: T.sub, marginTop: 6 }}>
            הקבצים מעובדים בזוגות עם ניסיון חוזר אוטומטי
          </div>
        </div>

        <input ref={inputRef} type="file" accept="application/pdf" multiple style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />

        {fileStatus.length > 0 && (
          <div className="mt-3 space-y-1">
            {fileStatus.map((f, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 px-3"
                style={{
                  fontSize: 12, borderRadius: 8,
                  background: f.err ? T.redSoft : "#F3F4F6",
                  color: f.err ? T.red : T.ink,
                }}>
                <span dir="ltr" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                  {f.name}
                </span>
                <span style={{ fontWeight: 700 }}>{f.state}</span>
              </div>
            ))}
          </div>
        )}

        {summary && (
          <div className="mt-3 p-2.5" style={{ fontSize: 13, fontWeight: 700, borderRadius: 10, background: T.greenSoft, color: T.green }}>
            {summary}
          </div>
        )}

        {failedFiles.length > 0 && !busy && (
          <button onClick={() => handleFiles(failedFiles)} className="mt-2"
            style={{ background: T.red, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            נסה שוב את {failedFiles.length} הקבצים שנכשלו
          </button>
        )}
      </div>
    </div>
  );
}
