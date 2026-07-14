// src/utils/period.js — period selection model shared by Dashboard, Reports and Insights.
import { monthOf } from "../constants/theme";

export const PERIOD_PRESETS = [
  { key: "current", label: "החודש הנוכחי" },
  { key: "previous", label: "חודש קודם" },
  { key: "last3", label: "3 חודשים אחרונים" },
  { key: "last6", label: "6 חודשים אחרונים" },
  { key: "ytd", label: "מתחילת השנה" },
  { key: "year", label: "שנה מלאה" },
  { key: "months", label: "בחירת חודשים" },
  { key: "custom", label: "טווח תאריכים מותאם" },
  { key: "all", label: "כל התקופות" },
];

export function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const idx = m - 1 + delta;
  const yy = y + Math.floor(idx / 12);
  const mm = ((idx % 12) + 12) % 12 + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

function monthsBack(anchorMonth, count) {
  return Array.from({ length: count }, (_, i) => shiftMonth(anchorMonth, -i));
}

export function latestMonth(transactions) {
  const months = [...new Set(transactions.map(t => monthOf(t.date)))].filter(Boolean).sort();
  return months.at(-1) || null;
}

export function defaultPeriod(transactions) {
  const anchor = latestMonth(transactions);
  return { mode: "current", anchorMonth: anchor };
}

/** Resolves a period to a list of "YYYY-MM" months. Returns null for modes
 * that aren't month-based (custom, all) — use filterByPeriod for those. */
export function periodToMonths(period, transactions) {
  if (period.mode === "months") return period.months || [];
  const anchor = period.anchorMonth || latestMonth(transactions);
  if (!anchor) return [];
  switch (period.mode) {
    case "current": return [anchor];
    case "previous": return [shiftMonth(anchor, -1)];
    case "last3": return monthsBack(anchor, 3);
    case "last6": return monthsBack(anchor, 6);
    case "ytd": {
      const year = anchor.slice(0, 4);
      const m = Number(anchor.slice(5, 7));
      return Array.from({ length: m }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    }
    case "year": {
      const year = anchor.slice(0, 4);
      return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    }
    default: return null;
  }
}

export function filterByPeriod(transactions, period) {
  if (!period || period.mode === "all") return transactions;
  if (period.mode === "custom") {
    const { from, to } = period.range || {};
    return transactions.filter(t => (!from || t.date >= from) && (!to || t.date <= to));
  }
  const months = periodToMonths(period, transactions);
  if (!months || !months.length) return [];
  const set = new Set(months);
  return transactions.filter(t => set.has(monthOf(t.date)));
}

/** Comparable "previous period" of the same length, used for delta KPIs and
 * insight comparisons. Returns null when the concept doesn't apply (custom
 * ranges, "all periods", or arbitrary month picks). */
export function previousPeriodMonths(period, transactions) {
  if (!period || ["all", "custom", "months"].includes(period.mode)) return null;
  const months = periodToMonths(period, transactions);
  if (!months || !months.length) return null;
  const oldest = months[months.length - 1];
  const newestOfPrev = shiftMonth(oldest, -1);
  return monthsBack(newestOfPrev, months.length);
}

export function periodLabel(period) {
  const preset = PERIOD_PRESETS.find(p => p.key === period?.mode);
  if (period?.mode === "custom" && period.range?.from && period.range?.to) {
    return `${period.range.from} – ${period.range.to}`;
  }
  if (period?.mode === "months" && period.months?.length) {
    return period.months.slice().sort().join(", ");
  }
  return preset?.label || "כל התקופות";
}

/** Human-readable date range covered by the resolved period, for the dashboard header. */
export function periodDateRange(period, transactions) {
  if (period?.mode === "custom") return period.range || {};
  const months = periodToMonths(period, transactions);
  if (!months || !months.length) return {};
  const sorted = [...months].sort();
  return { from: `${sorted[0]}-01`, to: sorted.at(-1) };
}
