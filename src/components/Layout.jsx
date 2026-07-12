// src/components/Layout.jsx — סיידבר כהה בסגנון ה-mockup, RTL (סיידבר בימין)

import { T } from "../constants/theme";

const NAV = [
  { key: "dashboard", label: "לוח בקרה", icon: "▦" },
  { key: "transactions", label: "עסקאות", icon: "≣" },
  { key: "upload", label: "ייבוא דפי חיוב", icon: "⇪" },
  { key: "settings", label: "תקציב והגדרות", icon: "⚙" },
];

const CARD_DOT = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

export default function Layout({ active, onNavigate, onImportClick, cardTotals = [], month, months = [], onMonthChange, children }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh", background: T.bg, color: T.ink, display: "flex",
        fontFamily: "'Heebo','Segoe UI',system-ui,sans-serif",
      }}
    >
      {/* סיידבר */}
      <aside className="flex flex-col shrink-0"
        style={{ width: 225, background: T.sidebar, color: "#fff", minHeight: "100vh" }}>
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex items-center justify-center"
            style={{ width: 34, height: 34, borderRadius: 9, background: T.primary, fontWeight: 900 }}>
            ₪
          </div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>YJ Finance</div>
        </div>

        <nav className="flex flex-col gap-1 px-3 mt-1">
          {NAV.map((item) => {
            const on = active === item.key;
            return (
              <button key={item.key} onClick={() => onNavigate(item.key)}
                className="flex items-center gap-3 text-right"
                style={{
                  padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: on ? 700 : 500,
                  background: on ? T.sidebarActive : "transparent",
                  color: on ? "#fff" : "#9CA3AF",
                  boxShadow: on ? "inset 3px 0 0 " + T.primary : "none",
                }}>
                <span>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </nav>

        {/* חשבונות — כמו במוקאפ */}
        {cardTotals.length > 0 && (
          <div className="px-4 mt-6">
            <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 800, letterSpacing: "0.08em", marginBottom: 8 }}>
              כרטיסים
            </div>
            <div className="space-y-1">
              {cardTotals.map(([card, amt], i) => (
                <div key={card} className="flex items-center justify-between px-2 py-1.5" style={{ borderRadius: 8 }}>
                  <span className="flex items-center gap-2" style={{ fontSize: 12, color: "#D1D5DB" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: CARD_DOT[i % CARD_DOT.length] }} />
                    <span dir="ltr">{card}</span>
                  </span>
                  <span dir="ltr" style={{ fontSize: 12, color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                    ₪{Math.round(amt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto px-5 py-4" style={{ fontSize: 11, color: "#6B7280" }}>
          כאל · מקס · אמקס · לאומי
        </div>
      </aside>

      {/* תוכן */}
      <main className="flex-1" style={{ minWidth: 0 }}>
        {/* פס עליון */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: T.card, borderBottom: `1px solid ${T.line}` }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {greeting()}, יוסרי 👋
            </div>
            <div style={{ fontSize: 13, color: T.sub }}>הנה התמונה הפיננסית שלך</div>
          </div>
          <div className="flex items-center gap-2">
            {onMonthChange && (
              <select value={month} onChange={e => onMonthChange(e.target.value)}
                style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 12px", background: "#fff", fontSize: 13, fontWeight: 700 }}>
                <option value="all">כל החודשים</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <button onClick={onImportClick}
              style={{
                background: T.primary, color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
              + ייבוא דף חיוב
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 18) return "צהריים טובים";
  return "ערב טוב";
}
