// src/utils/insights.js — local, rule-based financial insights (no paid AI API).
import { fmt, monthOf } from "../constants/theme";
import { filterByPeriod, previousPeriodMonths, shiftMonth } from "./period";

const MISC_CATEGORY = "שונות";
const FEES_CATEGORY = "ריבית ועמלות";

function sumByCategory(transactions) {
  const byCat = {};
  for (const t of transactions) byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  return byCat;
}

function daysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** Rule-based insights for the given period. Pass `budgets`/`income` to
 * unlock budget-overrun and savings-rate insights. Used by both the
 * dashboard's summary panel and the dedicated Insights page. */
export function computeInsights({ transactions, period, budgets = {}, income = 0 }) {
  const insights = [];
  const inPeriod = filterByPeriod(transactions, period);
  const total = inPeriod.reduce((s, t) => s + t.amount, 0);
  const byCat = sumByCategory(inPeriod);

  const prevMonths = previousPeriodMonths(period, transactions);
  if (prevMonths?.length) {
    const prevSet = new Set(prevMonths);
    const prevTx = transactions.filter(t => prevSet.has(monthOf(t.date)));
    const prevTotal = prevTx.reduce((s, t) => s + t.amount, 0);
    if (prevTotal > 0) {
      const deltaPct = ((total - prevTotal) / prevTotal) * 100;
      insights.push(deltaPct <= 0
        ? `הוצאת ${Math.abs(deltaPct).toFixed(0)}% פחות מהתקופה הקודמת.`
        : `הוצאת ${deltaPct.toFixed(0)}% יותר מהתקופה הקודמת.`);

      const prevByCat = sumByCategory(prevTx);
      Object.entries(byCat)
        .filter(([c]) => c !== FEES_CATEGORY && (prevByCat[c] || 0) > 100)
        .map(([c, v]) => [c, v - prevByCat[c], (v - prevByCat[c]) / prevByCat[c] * 100])
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .forEach(([c, diff, pct]) => insights.push(
          diff > 0
            ? `הוצאות ${c} עלו ב-${Math.abs(pct).toFixed(0)}%.`
            : `הוצאות ${c} ירדו ב-${Math.abs(pct).toFixed(0)}%.`));
    }
  }

  const fees = byCat[FEES_CATEGORY] || 0;
  if (fees > 300) insights.push(`שילמת ${fmt(fees)} ריבית ועמלות — יעד החיסכון המרכזי שלך.`);

  for (const [cat, budget] of Object.entries(budgets)) {
    if (budget > 0 && (byCat[cat] || 0) > budget) {
      insights.push(`חריגה בתקציב ${cat}: ${fmt(byCat[cat] - budget)} מעל היעד.`);
    }
  }

  // Pace projection: only meaningful while viewing the current, in-progress month.
  if (period.mode === "current" && period.anchorMonth) {
    const priorMonths = Array.from({ length: 3 }, (_, i) => shiftMonth(period.anchorMonth, -(i + 1)));
    const priorSet = new Set(priorMonths);
    const priorTx = transactions.filter(t => priorSet.has(monthOf(t.date)));
    const priorTotals = priorMonths
      .map(m => priorTx.filter(t => monthOf(t.date) === m).reduce((s, t) => s + t.amount, 0))
      .filter(v => v > 0);
    if (priorTotals.length) {
      const avg = priorTotals.reduce((s, v) => s + v, 0) / priorTotals.length;
      const today = new Date();
      const isCurrentCalendarMonth = monthOf(today.toISOString()) === period.anchorMonth;
      const dayOfMonth = isCurrentCalendarMonth ? today.getDate() : daysInMonth(period.anchorMonth);
      const projected = (total / dayOfMonth) * daysInMonth(period.anchorMonth);
      if (projected > avg * 1.05) {
        insights.push("החודש אתה צפוי לסיים מעל הממוצע.");
      }
    }
  }

  const misc = byCat[MISC_CATEGORY] || 0;
  if (misc > 300) {
    insights.push(`ניתן לחסוך כ-${fmt(misc * 0.3)} בקטגוריית ${MISC_CATEGORY}.`);
  }

  if (income > 0) {
    const savingsRate = ((income - total) / income) * 100;
    if (savingsRate < 0) insights.push("ההוצאות בתקופה זו עולות על ההכנסה שהוגדרה.");
  }

  if (!insights.length) insights.push("ייבאו עוד נתונים כדי לקבל השוואות ותובנות.");
  return insights;
}
