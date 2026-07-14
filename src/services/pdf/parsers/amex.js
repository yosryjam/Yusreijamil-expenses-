// src/services/pdf/parsers/amex.js — dedicated parser for American Express (Israel)
// statements.
//
// Confirmed from a real (redacted) sample:
// - The main "עסקות באשראי - בארץ" (domestic credit transactions) table is one
//   real transaction per row; its "לידיעה למועד נוכחי" footnote renders as its
//   own dateless row and is already excluded by the date requirement.
// - A "רכישות בחו\"ל" (foreign purchases) section shows the ILS charge amount
//   suffixed with a foreign-currency sign (e.g. "32.30 €") that reads as a
//   text-extraction artifact rather than a genuine currency mismatch — this is
//   ambiguous from one sample, so these rows are imported flagged needsReview
//   rather than guessed at confidently.
// - An "עסקות שחויבו / זוכו" (charged/credited) section contains "פרעון"
//   (settlement)-prefixed rows that may duplicate an interim mid-cycle charge
//   already billed earlier — also flagged needsReview rather than silently
//   included or excluded.
import { cleanText, isExcluded, parseAmount, parseInstallment, baseTransaction } from "./genericParser";

const DATE_RE = /\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-](\d{2}|\d{4})\b/;
const AMOUNT_RE = /(?:₪\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|-?\d+(?:\.\d{1,2}))/g;

const INDUSTRY_NOISE = [
  "טוטו/פיס", "צעצועים", "דלק", "מעדניות", "פארמה", "מסעדות/קפה",
  "מכולת/סופר", "הנעלה", "הלבשה",
];
const NOISE_TOKENS = new Set(["קרדיט"]);
const NOISE_PHRASES = ["תש.נייד", ...INDUSTRY_NOISE];
const EXTRA_EXCLUDE = ["לידיעה למועד נוכחי", "סך קניות מחו", "עסקות ממסגרת האשראי", "נצבר ל"];
const FX_SIGN_RE = /[€$£]/;
// The "מסגרת הכרטיס ותנאי האשראי" (credit terms/rate) table on a later page
// mixes a real-looking date with a real-looking decimal balance on one line
// (e.g. a "יתרה שטרם נפרעה" balance next to a rate-effective date), which the
// date+amount heuristic alone can't tell apart from a real transaction. No
// genuine transaction row in this statement's domestic table contains a
// percent sign, so its presence is used as the exclusion signal instead.
const PERCENT_RE = /%/;

function toIsoDate(raw) {
  const match = raw.match(DATE_RE);
  if (!match) return null;
  let [, day, month, year] = match;
  year = Number(year) < 100 ? `20${String(year).padStart(2, "0")}` : year;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isExtraExcluded(line) {
  const lower = line.toLowerCase();
  return EXTRA_EXCLUDE.some(term => lower.includes(term.toLowerCase()));
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
    .replace(/\d{4,}/g, " ")
    .replace(/[₪€$£]/g, " ");
  const tokens = merchant.split(/\s+/).filter(tok => tok && !NOISE_TOKENS.has(tok) && !/^\d+$/.test(tok));
  return cleanText(tokens.join(" ")).replace(/^[-–—:]+|[-–—:]+$/g, "").trim();
}

export default function parseAmexStatement(rows, card) {
  const parsed = [];
  const seen = new Set();

  for (const line of rows) {
    if (!line || isExcluded(line) || isExtraExcluded(line) || PERCENT_RE.test(line)) continue;

    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    const amountMatch = chooseAmount(line, dateMatch[0]);
    if (!amountMatch) continue;

    let amount = amountMatch.value;
    if (/זיכוי|refund|credit/i.test(line) && amount > 0) amount *= -1;

    const isSettlement = /פרעון/.test(line);
    const isForeign = FX_SIGN_RE.test(line);

    let merchant = deriveMerchant(line, dateMatch[0]);
    if (isSettlement) merchant = merchant.split(/\s+/).filter(tok => tok !== "פרעון").join(" ").trim();
    if (merchant.length < 2 || merchant.length > 140) continue;

    const transaction = baseTransaction({
      date: toIsoDate(dateMatch[0]),
      merchant,
      amount,
      card,
      confidence: (isSettlement || isForeign) ? 0.55 : 0.9,
      source: isForeign ? "local-pdf-amex-fx" : "local-pdf-amex",
      installment: parseInstallment(line.replaceAll(dateMatch[0], " ")),
      needsReview: isSettlement || isForeign,
    });
    const key = `${transaction.date}|${transaction.merchant}|${transaction.amount}|${transaction.card}`;
    if (!seen.has(key)) {
      seen.add(key);
      parsed.push(transaction);
    }
  }
  return parsed;
}
