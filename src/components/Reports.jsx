// src/components/Reports.jsx — exportable period report: category summary + top merchants + CSV.
import { useMemo, useState } from "react";
import { T, fmt } from "../constants/theme";
import { filterByPeriod, defaultPeriod } from "../utils/period";
import PeriodSelector from "./dashboard/PeriodSelector";

export default function Reports({ transactions = [] }) {
  const [period, setPeriod] = useState(() => defaultPeriod(transactions));

  const report = useMemo(() => {
    const inPeriod = filterByPeriod(transactions, period);
    const total = inPeriod.reduce((s, t) => s + t.amount, 0);
    const byCat = {};
    for (const t of inPeriod) byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    const categoryTable = Object.entries(byCat).sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({ cat, amount, pct: total ? (amount / total) * 100 : 0 }));

    const byMerchant = {}, byMerchantCount = {};
    for (const t of inPeriod) {
      if (t.amount > 0 && t.category !== "ריבית ועמלות") {
        byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount;
        byMerchantCount[t.merchant] = (byMerchantCount[t.merchant] || 0) + 1;
      }
    }
    const topMerchants = Object.entries(byMerchant).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([merchant, amount]) => ({ merchant, amount, count: byMerchantCount[merchant] }));

    return { total, count: inPeriod.length, categoryTable, topMerchants, inPeriod };
  }, [transactions, period]);

  function exportCsv() {
    const header = "category,amount,percent_of_total\n";
    const rows = report.categoryTable.map(r => `${r.cat},${r.amount.toFixed(2)},${r.pct.toFixed(1)}`).join("\n");
    const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `yj-finance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>דוחות</h1>
        <div className="flex items-center gap-2">
          <PeriodSelector period={period} onChange={setPeriod} transactions={transactions} />
          <button onClick={exportCsv}
            style={{ background: T.ink, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            ייצוא דוח ל-CSV
          </button>
        </div>
      </div>

      <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16 }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontSize: 15, fontWeight: 800 }}>סיכום לפי קטגוריה</div>
          <div style={{ fontSize: 12, color: T.sub }}>
            {report.count} עסקאות · <b dir="ltr">{fmt(report.total)}</b>
          </div>
        </div>
        {report.categoryTable.length === 0 ? (
          <div style={{ color: T.sub, fontSize: 13 }}>אין נתונים לתקופה שנבחרה.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ color: T.sub, textAlign: "right" }}>
                  <th className="py-2">קטגוריה</th><th>סכום</th><th>% מההוצאות</th>
                </tr>
              </thead>
              <tbody>
                {report.categoryTable.map(r => (
                  <tr key={r.cat} style={{ borderTop: `1px solid ${T.line}` }}>
                    <td className="py-2" style={{ fontWeight: 600 }}>{r.cat}</td>
                    <td style={{ direction: "ltr", textAlign: "right" }}>{fmt(r.amount)}</td>
                    <td>{r.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-4 md:p-5" style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }} className="mb-3">בתי העסק המובילים</div>
        {report.topMerchants.length === 0 ? (
          <div style={{ color: T.sub, fontSize: 13 }}>אין נתונים לתקופה שנבחרה.</div>
        ) : (
          <div className="space-y-2.5">
            {report.topMerchants.map((m, i) => {
              const max = report.topMerchants[0]?.amount || 1;
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
        )}
      </div>
    </div>
  );
}
