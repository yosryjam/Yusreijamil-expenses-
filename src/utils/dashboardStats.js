// src/utils/dashboardStats.js — pure aggregation logic behind the dashboard, extracted
// so it can be unit-tested without rendering React/Recharts.
import { monthOf } from "../constants/theme";
import { filterByPeriod, periodToMonths, previousPeriodMonths } from "./period";

const FEES_CATEGORY = "ריבית ועמלות";

// Groups "obvious variants" of a merchant name for aggregation (case,
// punctuation and whitespace differences only) without altering the original
// transaction's merchant text — the first-seen raw spelling is kept for display.
function normalizeMerchantKey(name) {
  return (name || "").toLowerCase().replace(/["'.,\-()]/g, "").replace(/\s+/g, " ").trim();
}

function daysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function computeDashboard(transactions, period, trendCategory = "all") {
  const inPeriod = filterByPeriod(transactions, period);
  const total = inPeriod.reduce((s, t) => s + t.amount, 0);

  const byCat = {}, byCard = {}, byMerchant = {}, byMerchantCount = {}, byMerchantDisplay = {};
  for (const t of inPeriod) {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    byCard[t.card] = (byCard[t.card] || 0) + t.amount;
    if (t.amount > 0 && t.category !== FEES_CATEGORY) {
      const key = normalizeMerchantKey(t.merchant);
      byMerchant[key] = (byMerchant[key] || 0) + t.amount;
      byMerchantCount[key] = (byMerchantCount[key] || 0) + 1;
      if (!byMerchantDisplay[key]) byMerchantDisplay[key] = t.merchant;
    }
  }

  const monthsInPeriod = periodToMonths(period, transactions)
    || [...new Set(inPeriod.map(t => monthOf(t.date)))];
  const monthCount = Math.max(monthsInPeriod?.length || 1, 1);
  const monthlyAverage = total / monthCount;

  const prevMonths = previousPeriodMonths(period, transactions);
  let prevTotal = null, prevByCat = {};
  if (prevMonths?.length) {
    const prevSet = new Set(prevMonths);
    const prevTx = transactions.filter(t => prevSet.has(monthOf(t.date)));
    prevTotal = prevTx.reduce((s, t) => s + t.amount, 0);
    for (const t of prevTx) prevByCat[t.category] = (prevByCat[t.category] || 0) + t.amount;
  }
  const deltaPct = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;

  const topCategory = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const trendSource = trendCategory === "all" ? transactions : transactions.filter(t => t.category === trendCategory);
  const byMonthTrend = {};
  for (const t of trendSource) byMonthTrend[monthOf(t.date)] = (byMonthTrend[monthOf(t.date)] || 0) + t.amount;
  const monthsSorted = Object.keys(byMonthTrend).filter(Boolean).sort();
  const trend = monthsSorted.slice(-8).map(m => ({ month: m.slice(2), total: Math.round(byMonthTrend[m]) }));
  const spark = trend.map(x => ({ v: x.total }));

  const donut = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: Math.max(value, 0) }));

  const categoryTable = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
    const prevAmount = prevByCat[cat] || 0;
    const catDeltaPct = prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : null;
    const count = inPeriod.filter(t => t.category === cat).length;
    return {
      cat, amount,
      pct: total ? (amount / total) * 100 : 0,
      monthlyAvg: amount / monthCount,
      count,
      deltaPct: catDeltaPct,
    };
  });

  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([key, amount]) => ({
      merchant: byMerchantDisplay[key], amount, count: byMerchantCount[key],
      pct: total ? (amount / total) * 100 : 0,
    }));

  const recent = [...inPeriod].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const cardBars = Object.entries(byCard).sort((a, b) => b[1] - a[1]);
  const count = inPeriod.length;

  // The current, still-in-progress calendar month gets a "partial month" flag
  // so the dashboard can label it instead of implying a full month of data.
  const isPartialMonth = period.mode === "current" && !!period.anchorMonth &&
    monthOf(new Date().toISOString()) === period.anchorMonth &&
    new Date().getDate() < daysInMonth(period.anchorMonth);

  return {
    total, deltaPct, monthlyAverage, topCategory, count, isPartialMonth,
    trend, spark, donut, categoryTable, topMerchants, recent, cardBars,
  };
}
