// src/components/Layout.jsx — סיידבר כהה בסגנון ה-mockup, RTL (סיידבר בימין)

import { T } from "../constants/theme";

const NAV = [
  { key: "dashboard", label: "לוח בקרה", icon: "▦" },
  { key: "transactions", label: "עסקאות", icon: "≣" },
  { key: "upload", label: "ייבוא דפי חיוב", icon: "⇪" },
];

export default function Layout({ active, onNavigate, onImportClick, children }) {
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
          <button onClick={onImportClick}
            style={{
              background: T.primary, color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>
            + ייבוא דף חיוב
          </button>
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
