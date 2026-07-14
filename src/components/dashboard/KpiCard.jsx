import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { T } from "../../constants/theme";

export default function KpiCard({ label, value, deltaPct, goodWhenDown = true, spark, color, soft, icon }) {
  const good = deltaPct == null ? null : (goodWhenDown ? deltaPct <= 0 : deltaPct >= 0);
  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
      <div className="p-4 pb-1">
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{label}</div>
          {icon && (
            <div className="flex items-center justify-center"
              style={{ width: 30, height: 30, borderRadius: 999, background: soft, color, fontSize: 14 }}>
              {icon}
            </div>
          )}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right" }}>
          {value}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, minHeight: 16, color: good == null ? T.sub : good ? T.green : T.red }}>
          {deltaPct != null && `${deltaPct <= 0 ? "↓" : "↑"} ${Math.abs(deltaPct).toFixed(1)}% לעומת התקופה הקודמת`}
        </div>
      </div>
      {spark && (
        <div style={{ height: 40, direction: "ltr" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
                fill={`url(#sg-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
