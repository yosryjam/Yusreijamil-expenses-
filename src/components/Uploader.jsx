import { useMemo, useRef, useState } from "react";
import { T, CATEGORIES, categorize, fmt2, txnKey } from "../constants/theme";
import { parseStatementLocally } from "../services/pdf";

function needsAttention(transaction) {
  return transaction.needsReview || (transaction.confidence ?? 1) < 0.75;
}

export default function Uploader({ existingTransactions = [], customRules = [], onImported }) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileStatus, setFileStatus] = useState([]);
  const [failedFiles, setFailedFiles] = useState([]);
  const [summary, setSummary] = useState("");
  const [pending, setPending] = useState([]);
  const inputRef = useRef(null);

  const totalPending = useMemo(() => pending.reduce((sum, t) => sum + Number(t.amount || 0), 0), [pending]);
  const reviewCount = useMemo(() => pending.filter(needsAttention).length, [pending]);

  async function handleFiles(fileList) {
    const files = [...fileList].filter(
      file => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    if (!files.length) return;

    setBusy(true);
    setSummary("");
    setPending([]);
    setFileStatus(files.map(file => ({ name: file.name, state: "Waiting…" })));
    const setStat = (index, state, err = false) =>
      setFileStatus(current => current.map((item, i) => i === index ? { ...item, state, err } : item));

    const results = [];
    const failed = [];
    for (let index = 0; index < files.length; index += 1) {
      setStat(index, "Reading locally…");
      try {
        const result = await parseStatementLocally(files[index]);
        results.push(...result.transactions);
        setStat(index, `✓ ${result.transactions.length} transactions · ${result.metadata.card}`);
      } catch (error) {
        failed.push(files[index]);
        setStat(index, `✕ ${error.message}`, true);
      }
    }
    setFailedFiles(failed);

    const existing = new Set(existingTransactions.map(txnKey));
    const seen = new Set();
    const fresh = [];
    let duplicates = 0;
    for (const row of results) {
      const key = txnKey(row);
      if (existing.has(key) || seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      fresh.push({
        ...row,
        id: key,
        category: categorize(row.merchant, customRules),
      });
    }

    setPending(fresh);
    setSummary(
      `${fresh.length} new transactions ready for review` +
      (duplicates ? ` · ${duplicates} duplicates skipped` : "") +
      (failed.length ? ` · ${failed.length} files need attention` : "")
    );
    setBusy(false);
  }

  function updatePending(id, field, value) {
    setPending(current => current.map(t => t.id === id ? { ...t, [field]: field === "amount" ? Number(value) : value } : t));
  }

  function removePending(id) {
    setPending(current => current.filter(t => t.id !== id));
  }

  function commitPending() {
    if (!pending.length) return;
    onImported?.(pending);
    setPending([]);
    setSummary("Transactions saved successfully.");
  }

  return (
    <div className="space-y-4">
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Import Statements</h1>

      <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
        <div className="mb-3" style={{ color: T.sub, fontSize: 13 }}>
          Upload one or several PDF statements from MAX, CAL, AMEX, Mileage Plus, or Bank Leumi. Files are read locally in your browser and are not sent to a paid AI service.
        </div>

        <div role="button" tabIndex={0}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !busy) inputRef.current?.click(); }}
          onDragOver={event => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={event => { event.preventDefault(); setDragOver(false); if (!busy) handleFiles(event.dataTransfer.files); }}
          style={{
            border: `2px dashed ${T.primary}`, borderRadius: 12,
            background: dragOver ? "#E0E3FD" : T.primarySoft,
            padding: "36px 16px", textAlign: "center",
            cursor: busy ? "wait" : "pointer", fontWeight: 700, color: T.primary,
          }}>
          {busy ? "Reading PDF files locally…" : "Click to choose PDF files — or drag several files here"}
          <div style={{ fontSize: 11, fontWeight: 400, color: T.sub, marginTop: 6 }}>
            Free processing · No Claude API · No statement upload to an external server
          </div>
        </div>

        <input ref={inputRef} type="file" accept="application/pdf" multiple style={{ display: "none" }} disabled={busy}
          onChange={event => { if (event.target.files?.length) handleFiles(event.target.files); event.target.value = ""; }} />

        {fileStatus.length > 0 && (
          <div className="mt-3 space-y-1">
            {fileStatus.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex justify-between items-center py-1.5 px-3"
                style={{ fontSize: 12, borderRadius: 8, background: file.err ? T.redSoft : "#F3F4F6", color: file.err ? T.red : T.ink }}>
                <span dir="ltr" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "48%" }}>{file.name}</span>
                <span style={{ fontWeight: 700, textAlign: "right" }}>{file.state}</span>
              </div>
            ))}
          </div>
        )}

        {summary && <div className="mt-3 p-2.5" style={{ fontSize: 13, fontWeight: 700, borderRadius: 10, background: T.greenSoft, color: T.green }}>{summary}</div>}

        {failedFiles.length > 0 && !busy && (
          <div className="mt-3" style={{ fontSize: 12, color: T.red }}>
            Scanned PDFs are not supported yet. Download the original digital statement from the card issuer, or retry after confirming the PDF contains selectable text.
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <div style={{ fontWeight: 800 }}>Review before saving</div>
              <div style={{ color: T.sub, fontSize: 12 }}>
                {pending.length} transactions · {fmt2(totalPending)}
                {reviewCount > 0 && <span style={{ color: T.orange, fontWeight: 700 }}> · ⚠ {reviewCount} need review</span>}
              </div>
            </div>
            <button onClick={commitPending} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 800, cursor: "pointer" }}>
              Save all transactions
            </button>
          </div>

          <div style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
            <table className="w-full" style={{ fontSize: 12.5, minWidth: 760 }}>
              <thead><tr style={{ color: T.sub, textAlign: "left" }}>
                <th className="py-2"></th><th>Date</th><th>Merchant</th><th>Card</th><th>Amount</th><th>Category</th><th></th>
              </tr></thead>
              <tbody>
                {pending.map(transaction => {
                  const flagged = needsAttention(transaction);
                  return (
                    <tr key={transaction.id} style={{ borderTop: `1px solid ${T.line}`, background: flagged ? T.orangeSoft : "transparent" }}>
                      <td className="py-2 pl-1" style={{ textAlign: "center" }}>
                        {flagged && <span title="Low-confidence or ambiguous — please verify before saving" style={{ cursor: "help" }}>⚠</span>}
                      </td>
                      <td className="pr-2"><input value={transaction.date} onChange={e => updatePending(transaction.id, "date", e.target.value)} style={cellInput} /></td>
                      <td className="pr-2"><input value={transaction.merchant} onChange={e => updatePending(transaction.id, "merchant", e.target.value)} style={{ ...cellInput, minWidth: 220 }} /></td>
                      <td className="pr-2"><input value={transaction.card} onChange={e => updatePending(transaction.id, "card", e.target.value)} style={cellInput} /></td>
                      <td className="pr-2"><input type="number" step="0.01" value={transaction.amount} onChange={e => updatePending(transaction.id, "amount", e.target.value)} style={{ ...cellInput, width: 110 }} /></td>
                      <td className="pr-2"><select value={transaction.category} onChange={e => updatePending(transaction.id, "category", e.target.value)} style={cellInput}>{CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></td>
                      <td><button onClick={() => removePending(transaction.id)} title="Remove" style={{ border: "none", background: "none", color: T.red, cursor: "pointer", fontWeight: 800 }}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2" style={{ color: T.sub, fontSize: 11 }}>
            Local parsing is format-based. Review dates, merchant names, and amounts before saving, especially after a card issuer changes its PDF layout.
          </div>
        </div>
      )}
    </div>
  );
}

const cellInput = {
  border: `1px solid ${T.line}`,
  borderRadius: 7,
  padding: "5px 7px",
  background: "#fff",
  fontSize: 12,
  width: "100%",
};
