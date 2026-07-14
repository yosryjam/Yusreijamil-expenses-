import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { T, CATEGORY_COLORS, fmt } from "../../constants/theme";

/** Category donut chart. Clicking a slice or legend row calls onSelectCategory
 * with that category name, so the caller can navigate to a filtered transactions view. */
export default function CategoryDonut({ data, total, selectedCategory, onSelectCategory }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div style={{ width: 140, height: 140, direction: "ltr", flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name"
              innerRadius={42} outerRadius={66} paddingAngle={2} strokeWidth={0}
              onClick={(entry) => onSelectCategory?.(entry.name)}
              style={{ cursor: onSelectCategory ? "pointer" : "default" }}>
              {data.map(x => (
                <Cell key={x.name} fill={CATEGORY_COLORS[x.name] || T.sub}
                  opacity={!selectedCategory || selectedCategory === x.name ? 1 : 0.35} />
              ))}
            </Pie>
            <Tooltip formatter={v => fmt(v)} contentStyle={{ borderRadius: 10, fontSize: 12, border: `1px solid ${T.line}` }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1" style={{ minWidth: 0 }}>
        {data.slice(0, 8).map(x => (
          <button key={x.name} onClick={() => onSelectCategory?.(x.name)}
            className="flex items-center justify-between w-full text-right"
            style={{
              fontSize: 12, background: "none", border: "none", cursor: onSelectCategory ? "pointer" : "default",
              padding: "2px 4px", borderRadius: 6,
              opacity: !selectedCategory || selectedCategory === x.name ? 1 : 0.45,
            }}>
            <span className="flex items-center gap-1.5" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: CATEGORY_COLORS[x.name] || T.sub, flexShrink: 0 }} />
              {x.name}
            </span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: T.sub, direction: "ltr", whiteSpace: "nowrap" }}>
              {fmt(x.value)} · {total ? ((x.value / total) * 100).toFixed(1) : 0}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
