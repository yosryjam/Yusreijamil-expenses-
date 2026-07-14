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

let nextId = 0;
function insight({ message, severity = "info", explanation = "", suggestedAction = "" }) {
  return { id: `insight-${nextId++}`, message, severity, explanation, suggestedAction };
}

/** Rule-based insights for the given period. Pass `budgets`/`income` to
 * unlock budget-overrun and savings-rate insights. Used by both the
 * dashboard's summary panel and the dedicated Insights page. Each insight has
 * a severity ("info" | "warning" | "critical"), a short explanation of why it
 * fired, and a suggested action — no external AI service is used, everything
 * here is computed from the user's own local data. */
export function computeInsights({ transactions, period, budgets = {}, income = 0 }) {
  nextId = 0;
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
      insights.push(insight({
        message: deltaPct <= 0
          ? `הוצאת ${Math.abs(deltaPct).toFixed(0)}% פחות מהתקופה הקודמת.`
          : `הוצאת ${deltaPct.toFixed(0)}% יותר מהתקופה הקודמת.`,
        severity: deltaPct > 20 ? "warning" : "info",
        explanation: `סך ההוצאות בתקופה זו הוא ${fmt(total)}, לעומת ${fmt(prevTotal)} בתקופה המקבילה הקודמת.`,
        suggestedAction: deltaPct > 20 ? "בדקו את העסקאות הגדולות בתקופה זו כדי להבין מה גרם לעלייה." : "",
      }));

      const prevByCat = sumByCategory(prevTx);
      Object.entries(byCat)
        .filter(([c]) => c !== FEES_CATEGORY && (prevByCat[c] || 0) > 100)
        .map(([c, v]) => [c, v - prevByCat[c], (v - prevByCat[c]) / prevByCat[c] * 100])
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .forEach(([c, diff, pct]) => insights.push(insight({
          message: diff > 0
            ? `הוצאות ${c} עלו ב-${Math.abs(pct).toFixed(0)}%.`
            : `הוצאות ${c} ירדו ב-${Math.abs(pct).toFixed(0)}%.`,
          severity: diff > 0 && Math.abs(pct) > 25 ? "warning" : "info",
          explanation: `הקטגוריה ${c} עמדה על ${fmt(byCat[c])} בתקופה זו, לעומת ${fmt(prevByCat[c])} בתקופה הקודמת.`,
          suggestedAction: diff > 0 ? `שקלו לעיין בעסקאות ${c} ולהגדיר תקציב לקטגוריה זו.` : "",
        })));
    }
  }

  const fees = byCat[FEES_CATEGORY] || 0;
  if (fees > 300) {
    insights.push(insight({
      message: `הוצאות ${FEES_CATEGORY} עלו לעומת התקופה הקודמת.`,
      severity: "warning",
      explanation: `שילמתם ${fmt(fees)} בריבית ועמלות בתקופה זו — לרוב ניתן לצמצם עלות זו.`,
      suggestedAction: "בדקו אפשרות לפרוע חוב מתגלגל מוקדם יותר או לעבור למסלול אשראי רגיל כדי לצמצם ריבית.",
    }));
  }

  for (const [cat, budget] of Object.entries(budgets)) {
    if (budget > 0 && (byCat[cat] || 0) > budget) {
      insights.push(insight({
        message: `חריגה בתקציב ${cat}: ${fmt(byCat[cat] - budget)} מעל היעד.`,
        severity: "warning",
        explanation: `התקציב שהוגדר לקטגוריית ${cat} הוא ${fmt(budget)}, וההוצאה בפועל הייתה ${fmt(byCat[cat])}.`,
        suggestedAction: `שקלו להעלות את התקציב ל-${cat} או לצמצם הוצאות בקטגוריה זו.`,
      }));
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
        insights.push(insight({
          message: "ההוצאה החודשית צפויה לעבור את הממוצע.",
          severity: "warning",
          explanation: `בקצב הנוכחי, ההוצאה החודשית צפויה להגיע לכ-${fmt(projected)}, לעומת ממוצע של ${fmt(avg)} בחודשים האחרונים.`,
          suggestedAction: "עקבו אחר ההוצאות בימים הקרובים כדי להישאר קרובים לממוצע הרגיל.",
        }));
      }
    }
  }

  const misc = byCat[MISC_CATEGORY] || 0;
  if (misc > 300) {
    insights.push(insight({
      message: `קטגוריית ${MISC_CATEGORY} גבוהה מהרגיל.`,
      severity: "info",
      explanation: `הוצאתם ${fmt(misc)} בקטגוריית ${MISC_CATEGORY} בתקופה זו.`,
      suggestedAction: `ניתן לחסוך כ-${fmt(misc * 0.3)} על ידי סיווג מחדש של חלק מהעסקאות לקטגוריה מדויקת יותר.`,
    }));
  }

  const reviewCount = inPeriod.filter(t => t.needsReview && !t.reviewed).length;
  if (reviewCount > 0) {
    insights.push(insight({
      message: `נמצאו ${reviewCount} עסקאות הדורשות בדיקה.`,
      severity: reviewCount >= 5 ? "critical" : "warning",
      explanation: "עסקאות אלה חולצו מדף החיוב באופן לא חד-משמעי (למשל עסקת חוץ או שורת התאמה).",
      suggestedAction: "עברו לעמוד העסקאות, סננו לפי 'דורש בדיקה בלבד', ואשרו או תקנו כל עסקה.",
    }));
  }

  if (income > 0) {
    const savingsRate = ((income - total) / income) * 100;
    if (savingsRate < 0) {
      insights.push(insight({
        message: "ההוצאות בתקופה זו עולות על ההכנסה שהוגדרה.",
        severity: "critical",
        explanation: `ההכנסה החודשית שהוגדרה היא ${fmt(income)}, וההוצאות בתקופה זו הן ${fmt(total)}.`,
        suggestedAction: "בדקו את הקטגוריות המובילות בהוצאות ושקלו לצמצם בהן החודש.",
      }));
    }
  }

  if (!insights.length) {
    insights.push(insight({ message: "ייבאו עוד נתונים כדי לקבל השוואות ותובנות.", severity: "info" }));
  }
  return insights;
}
