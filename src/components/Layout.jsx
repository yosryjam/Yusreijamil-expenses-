// src/components/Layout.jsx — dark navy sidebar, light content area, RTL (sidebar on the right)

import { T } from "../constants/theme";
import { periodDateRange } from "../utils/period";
import PeriodSelector from "./dashboard/PeriodSelector";

const NAV = [
  { key: "dashboard", label: "לוח בקרה", icon: "▦" },
  { key: "transactions", label: "עסקאות", icon: "≣" },
  { key: "upload", label: "העלאת דוחות", icon: "⇪" },
  { key: "budgets", label: "תקציבים", icon: "◔" },
  { key: "reports", label: "דוחות", icon: "▤" },
  { key: "insights", label: "תובנות", icon: "✦" },
  { key: "settings", label: "הגדרות", icon: "⚙" },
];

const CARD_DOT = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

export default function Layout({ active, onNavigate, onImportClick, cardTotals = [], period, onPeriodChange, transactions = [], children }) {
  const range = period ? periodDateRange(period, transactions) : {};

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh", background: T.bg, color: T.ink, display: "flex",
        fontFamily: "'Heebo','Segoe UI',system-ui,sans-serif",
      }}
    >
      {/* סיידבר כהה — מתכווץ לרצועת אייקונים במסכים קטנים */}
      <aside className="flex flex-col shrink-0 w-16 md:w-[230px] transition-all"
        style={{ background: T.sidebar, color: "#fff", minHeight: "100vh" }}>
        <div className="flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-5 py-5">
          <div className="flex items-center justify-center shrink-0"
            style={{ width: 34, height: 34, borderRadius: 10, background: T.primary, fontWeight: 900 }}>
            ₪
          </div>
          <div className="hidden md:block" style={{ fontWeight: 800, fontSize: 17 }}>YJ Finance</div>
        </div>

        <nav className="flex flex-col gap-1 px-2 md:px-3 mt-1">
          {NAV.map((item) => {
            const on = active === item.key;
            return (
              <button key={item.key} onClick={() => onNavigate(item.key)} title={item.label}
                className="flex items-center justify-center md:justify-start gap-3 text-right"
                style={{
                  padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: on ? 700 : 500,
                  background: on ? T.sidebarActive : "transparent",
                  color: on ? "#fff" : "#94A3B8",
                  boxShadow: on ? "inset 3px 0 0 " + T.primary : "none",
                }}>
                <span>{item.icon}</span><span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {cardTotals.length > 0 && (
          <div className="hidden md:block px-4 mt-6">
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 800, letterSpacing: "0.08em", marginBottom: 8 }}>
              כרטיסים
            </div>
            <div className="space-y-1">
              {cardTotals.map(([card, amt], i) => (
                <div key={card} className="flex items-center justify-between px-2 py-1.5" style={{ borderRadius: 8 }}>
                  <span className="flex items-center gap-2" style={{ fontSize: 12, color: "#CBD5E1" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: CARD_DOT[i % CARD_DOT.length] }} />
                    <span dir="ltr">{card}</span>
                  </span>
                  <span dir="ltr" style={{ fontSize: 12, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>
                    ₪{Math.round(amt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="hidden md:block mt-auto px-5 py-4" style={{ fontSize: 11, color: "#64748B" }}>
          כאל · מקס · אמקס · לאומי
        </div>
      </aside>

      {/* תוכן */}
      <main className="flex-1" style={{ minWidth: 0 }}>
        <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-3"
          style={{ background: T.card, borderBottom: `1px solid ${T.line}` }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>שלום יוסרי 👋</div>
            <div style={{ fontSize: 13, color: T.sub }}>
              {range.from && range.to ? `${range.from} – ${range.to}` : "הנה התמונה הפיננסית שלך"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {period && onPeriodChange && (
              <PeriodSelector period={period} onChange={onPeriodChange} transactions={transactions} />
            )}
            <button onClick={onImportClick}
              style={{
                background: T.primary, color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
              + העלאת דוח
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
