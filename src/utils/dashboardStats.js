// src/utils/dashboardStats.js — pure aggregation logic behind the dashboard, extracted
// so it can be unit-tested without rendering React/Recharts.
import { monthOf } from "../constants/theme";
import { filterByPeriod, periodToMonths, previousPeriodMonths } from "./period";

const FEES_CATEGORY = "ריבית ועמלות";

export function computeDashboard(transactions, period, trendCategory = "all") {
  const inPeriod = filterByPeriod(transactions, period);
  const total = inPeriod.reduce((s, t) => s + t.amount, 0);

  const byCat = {}, byCard = {}, byMerchant = {}, byMerchantCount = {};
  for (const t of inPeriod) {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    byCard[t.card] = (byCard[t.card] || 0) + t.amount;
    if (t.amount > 0 && t.category !== FEES_CATEGORY) {
      byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount;
      byMerchantCount[t.merchant] = (byMerchantCount[t.merchant] || 0) + 1;
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
    .map(([merchant, amount]) => ({ merchant, amount, count: byMerchantCount[merchant] }));

  const recent = [...inPeriod].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const cardBars = Object.entries(byCard).sort((a, b) => b[1] - a[1]);
  const count = inPeriod.length;

  return {
    total, deltaPct, monthlyAverage, topCategory, count,
    trend, spark, donut, categoryTable, topMerchants, recent, cardBars,
  };
}
