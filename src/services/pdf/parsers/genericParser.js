const DATE_RE = /\b(0?[1-9]|[12]\d|3[01])[./-](0?[1-9]|1[0-2])[./-](\d{2}|\d{4})\b/;
const AMOUNT_RE = /(?:₪\s*)?(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|-?\d+(?:\.\d{1,2}))/g;
const EXCLUDE = [
  "סה\"כ", "סהכ", "יתרת עסקאות", "יתרת עסקות", "סכום לתשלום", "סך הכל",
  "מועד חיוב", "מסגרת אשראי", "עמוד", "דף", "פירוט חיובים", "עסקאות עתידיות",
  "העברה לסל", "קרן אשראי", "accumulated", "total", "balance",
];

export function cleanText(value = "") {
  return value.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

export function toIsoDate(raw) {
  const match = raw.match(DATE_RE);
  if (!match) return null;
  let [, day, month, year] = match;
  year = Number(year) < 100 ? `20${String(year).padStart(2, "0")}` : year;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseAmount(raw) {
  const normalized = raw.replace(/₪|\s/g, "").replace(/,/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function detectIssuer(text, filename = "") {
  const haystack = `${filename} ${text}`.toLowerCase();
  if (/mileage|מיילג|mileageplus|united/.test(haystack)) return "MILEAGE PLUS";
  if (/american express|amex|אמריקן אקספרס|אמקס/.test(haystack)) return "AMEX";
  if (/max|לאומי קארד/.test(haystack)) return "MAX";
  if (/כאל|cal|visa cal|דיינרס/.test(haystack)) return "CAL";
  if (/בנק לאומי|bank leumi|לאומי/.test(haystack)) return "LEUMI";
  return "UNKNOWN";
}

export function detectLast4(text) {
  const patterns = [
    /(?:מסתיים|בספרות|ending|last\s*4)[^\d]{0,20}(\d{4})/i,
    /(?:כרטיס|card)[^\d]{0,20}(\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function rowToStrings(items) {
  const asc = [...items].sort((a, b) => a.x - b.x).map(i => i.text);
  const desc = [...asc].reverse();
  return [cleanText(asc.join(" ")), cleanText(desc.join(" "))];
}

export function groupRows(items) {
  const rows = [];
  const tolerance = 2.5;
  for (const item of items) {
    let row = rows.find(r => Math.abs(r.y - item.y) <= tolerance);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  return rows.sort((a, b) => b.y - a.y).flatMap(rowToStrings);
}

export function chooseAmount(line, dateRaw) {
  const withoutDate = line.replace(dateRaw, " ");
  const matches = [...withoutDate.matchAll(AMOUNT_RE)]
    .map(m => ({ raw: m[0], index: m.index, value: parseAmount(m[0]) }))
    .filter(m => m.value !== null && Math.abs(m.value) < 10_000_000);
  if (!matches.length) return null;

  // In Israeli statements the charged amount is usually the rightmost/last numeric field.
  // Prefer a decimal amount, otherwise use the final plausible number.
  const decimals = matches.filter(m => /\.\d{1,2}\b/.test(m.raw));
  return (decimals.at(-1) || matches.at(-1));
}

export function deriveMerchant(line, dateRaw, amountRaw) {
  let merchant = line.replace(dateRaw, " ").replace(amountRaw, " ");
  merchant = merchant
    .replace(/\b(?:תשלום|עסקה|חיוב|זיכוי|רגיל|הוראת קבע)\b/gi, " ")
    .replace(/\b\d+\s*(?:מתוך|מ-|\/|of)\s*\d+\b/gi, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/[|]+/g, " ");
  return cleanText(merchant).replace(/^[-–—:]+|[-–—:]+$/g, "").trim();
}

export function isExcluded(line) {
  const lower = line.toLowerCase();
  return EXCLUDE.some(term => lower.includes(term.toLowerCase()));
}

const INSTALLMENT_RE = /(\d+)\s*(?:מ\s*-|מתוך|\/|of)\s*(\d+)/i;

/** Extracts "N of M" installment info (e.g. "7 מ - 10", "3 מתוך 5") when present.
 * Returns { number, total } or null — shared by every parser so the unified
 * transaction shape carries this consistently. */
export function parseInstallment(line) {
  const match = line.match(INSTALLMENT_RE);
  if (!match) return null;
  const number = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(number) || !Number.isFinite(total) || number < 1 || total < number) return null;
  return { number, total };
}

/** Base shape every parser (generic and dedicated) returns, so the app never
 * has to special-case fields by issuer. */
export function baseTransaction({ date, merchant, amount, card, confidence, source, installment = null, needsReview = false }) {
  return {
    date, merchant, amount, card, confidence, source,
    installmentNumber: installment?.number ?? null,
    installmentTotal: installment?.total ?? null,
    needsReview,
  };
}

export function parseRows(rows, card) {
  const parsed = [];
  const seen = new Set();

  for (const line of rows) {
    if (!line || isExcluded(line)) continue;
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    const amountMatch = chooseAmount(line, dateMatch[0]);
    if (!amountMatch) continue;

    let amount = amountMatch.value;
    if (/זיכוי|refund|credit/i.test(line) && amount > 0) amount *= -1;
    const merchant = deriveMerchant(line, dateMatch[0], amountMatch.raw);
    if (merchant.length < 2 || merchant.length > 140) continue;

    const transaction = baseTransaction({
      date: toIsoDate(dateMatch[0]),
      merchant,
      amount,
      card,
      confidence: 0.72,
      source: "local-pdf",
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
