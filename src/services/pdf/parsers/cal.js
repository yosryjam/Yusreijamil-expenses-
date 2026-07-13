// src/services/pdf/parsers/cal.js — dedicated parser shared by CAL and the CAL/Bank
// Leumi "MileagePlus" card (confirmed identical table layout across both real samples;
// MileagePlus is issued and operated by Cal for a Leumi-branded United MileagePlus card,
// not a Bank Leumi checking-account statement).
//
// Confirmed from real (redacted) samples:
// - "שירות אשראי מתגלגל" (revolving credit) rows split into a קרן (principal) row and
//   a ריבית (interest) row with the same merchant/date/amount — the principal row must
//   be excluded (it's a re-bill of existing debt, not a new charge) while the interest
//   row is a real cost and must be included.
// - Installments show as "N מ - M" (with spaces around the dash).
// - A trailing "פירוט עסקות לחיוב עתידי" (future-charge) section repeats a standing
//   order that will actually charge next cycle — its rows carry both the transaction
//   date and the next charge date on the same line, which is used as the exclusion signal.
// - The "ענף" (industry) column uses a small fixed vocabulary, stripped from the
//   merchant text below since it isn't part of the merchant name.
// - A later page's "ריביות אשראי לכרטיס" (interest rate table) and disclosure
//   notices mix real-looking dates with real-looking decimals (rate percentages,
//   fee totals), which the date+amount heuristic alone can't tell apart from a
//   real transaction. No genuine transaction row contains a percent sign, so its
//   presence is used as the exclusion signal instead (same fix as the Amex parser).
import { cleanText, isExcluded, parseAmount, parseInstallment, baseTransaction } from "./genericParser";

const DATE_RE = /\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-](\d{2}|\d{4})\b/;
const AMOUNT_RE = /(?:₪\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|-?\d+(?:\.\d{1,2}))/g;
const PERCENT_RE = /%/;

const INDUSTRY_NOISE = [
  "רכב ותחבור", "מוסדות", "תיירות", "ביטוח ופינ", "מסעדות", "מזון ומשקא",
  "אופנה", "פיננסים", "שונות", "אנרגיה", "חלקי חילוף", "ריהוט ובית",
  "משחקי מזל", "תקשורת",
];
const NOISE_PHRASES = [
  "מזהה כרטיס Pay Apple", "הוראת קבע חדשה בכרטיס", "הוראת קבע", "זיכוי הוראת קבע",
  ...INDUSTRY_NOISE,
];
const NOISE_TOKENS = new Set(["תשלום", "קרדיט", "עמלה", "לא", "ב", "זיכוי"]);

function toIsoDate(raw) {
  const match = raw.match(DATE_RE);
  if (!match) return null;
  let [, day, month, year] = match;
  year = Number(year) < 100 ? `20${String(year).padStart(2, "0")}` : year;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function chooseAmount(line, dateRaw) {
  const withoutDate = line.replace(dateRaw, " ");
  const matches = [...withoutDate.matchAll(AMOUNT_RE)]
    .map(m => ({ raw: m[0], value: parseAmount(m[0]) }))
    .filter(m => m.value !== null && Math.abs(m.value) < 10_000_000);
  if (!matches.length) return null;
  const decimals = matches.filter(m => /\.\d{1,2}\b/.test(m.raw));
  return decimals.at(-1) || matches.at(-1);
}

function deriveMerchant(line, dateRaw) {
  let merchant = line.replaceAll(dateRaw, " ").replace(AMOUNT_RE, " ");
  for (const phrase of NOISE_PHRASES) merchant = merchant.replaceAll(phrase, " ");
  merchant = merchant
    .replace(/\d+\s*מ\s*-\s*\d+/g, " ") // installment marker, captured separately
    .replace(/\d{4,}/g, " ") // displayed-card / reference numbers
    .replace(/₪/g, " ");
  const tokens = merchant.split(/\s+/).filter(tok => tok && !NOISE_TOKENS.has(tok) && !/^\d+$/.test(tok));
  return cleanText(tokens.join(" ")).replace(/^[-–—:]+|[-–—:]+$/g, "").trim();
}

function countDates(line) {
  return (line.match(new RegExp(DATE_RE, "g")) || []).length;
}

function isRevolvingPrincipal(line) {
  return /מתגלגל/.test(line) && /קרן/.test(line) && !/ריבית/.test(line);
}

export default function parseCalStatement(rows, card) {
  const parsed = [];
  const seen = new Set();

  for (const line of rows) {
    if (!line || isExcluded(line) || PERCENT_RE.test(line)) continue;
    if (countDates(line) >= 2) continue; // future-charge notice row
    if (isRevolvingPrincipal(line)) continue;

    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    const amountMatch = chooseAmount(line, dateMatch[0]);
    if (!amountMatch) continue;

    let amount = amountMatch.value;
    if (/זיכוי|refund|credit/i.test(line) && amount > 0) amount *= -1;
    const merchant = deriveMerchant(line, dateMatch[0]);
    if (merchant.length < 2 || merchant.length > 140) continue;

    const transaction = baseTransaction({
      date: toIsoDate(dateMatch[0]),
      merchant,
      amount,
      card,
      confidence: 0.9,
      source: "local-pdf-cal",
      installment: parseInstallment(line.replaceAll(dateMatch[0], " ")),
    });
    const key = `${transaction.date}|${transaction.merchant}|${transaction.amount}|${transaction.card}`;
    if (!seen.has(key)) {
      seen.add(key);
      parsed.push(transaction);
    }
  }
  return parsed;
}
