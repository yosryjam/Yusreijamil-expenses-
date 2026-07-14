// src/services/pdf/parsers/max.js — dedicated parser for MAX statements.
//
// Confirmed from a real (redacted) sample:
// - A single MAX statement can list TWO physical cards, each introduced by its
//   own "לכרטיס שמסתיים ב-XXXX" header row. Transactions must be attributed to
//   whichever card section they fall under, not one global card id.
// - Loyalty/points tables ("פירוט נקודות", SKYMAX) use integer point values with
//   no decimal point, so they're already immune to the amount regex — this
//   list is defense-in-depth, not load-bearing.
// - A trailing "עסקות בארץ - חיוב עתידי (לידיעה)" section repeats the rolling
//   balance "for information only" — already caught by the shared EXCLUDE list,
//   reinforced here by rejecting any row with 2+ date-like tokens (that section's
//   signature: transaction date + next charge date on the same line).
import { cleanText, isExcluded, parseAmount, parseInstallment, baseTransaction } from "./genericParser";

const DATE_RE = /\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-](\d{2}|\d{4})\b/;
const AMOUNT_RE = /(?:₪\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|-?\d+(?:\.\d{1,2}))/g;
const CARD_HEADER_RE = /לכרטיס שמסתיים ב-?\s*(\d{4})/;
const POINTS_NOISE = ["נקודות", "לנוסע מתמיד", "skymax", "נק' מדיווח", "מועדוני תעופה"];
// Hebrew letters aren't \w in JS regex, so \b word-boundaries never match around
// them — token-based filtering (exact whole-token match) is used instead.
const NOISE_TOKENS = new Set(["תשלום", "עסקה", "חיוב", "זיכוי", "רגילה", "דחוי", "חודש"]);
const NOISE_PHRASES = ["הוראת קבע"];

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
    .replace(/\d+\s*(?:מתוך|מ\s*-|\/|of)\s*\d+/gi, " ") // installment marker, already captured separately
    .replace(/\d{4,}/g, " ") // long numeric noise (account/reference numbers)
    .replace(/₪/g, " ");
  const tokens = merchant.split(/\s+/).filter(tok => tok && !NOISE_TOKENS.has(tok) && !/^\d+$/.test(tok));
  return cleanText(tokens.join(" ")).replace(/^[-–—:]+|[-–—:]+$/g, "").trim();
}

function isPointsNoise(line) {
  const lower = line.toLowerCase();
  return POINTS_NOISE.some(term => lower.includes(term.toLowerCase()));
}

function countDates(line) {
  return (line.match(new RegExp(DATE_RE, "g")) || []).length;
}

export default function parseMaxStatement(rows, fallbackCard) {
  const parsed = [];
  const seen = new Set();
  let currentCard = fallbackCard;

  for (const line of rows) {
    if (!line) continue;

    const headerMatch = line.match(CARD_HEADER_RE);
    if (headerMatch) {
      currentCard = `MAX-${headerMatch[1]}`;
      continue;
    }

    if (isExcluded(line) || isPointsNoise(line)) continue;
    if (countDates(line) >= 2) continue; // future-charge notice row (this + next charge date)

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
      card: currentCard,
      confidence: 0.9,
      source: "local-pdf-max",
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
