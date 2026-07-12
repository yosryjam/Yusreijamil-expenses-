// netlify/functions/parse-statement.mjs
// פונקציית שרת של Netlify: מקבלת PDF (base64), שולחת ל-Claude, מחזירה עסקאות.
// המפתח נלקח מ-ANTHROPIC_API_KEY שמוגדר בהגדרות האתר ב-Netlify —
// לא בקוד, לא ב-GitHub.

const EXTRACTION_PROMPT = `You are parsing an Israeli credit card monthly statement (Hebrew, from Cal, Max, or American Express / Isracard) or a Bank Leumi statement.

Extract ONLY real spending transactions and interest/fee lines. Return ONLY a JSON array (no markdown, no explanation) of arrays:
[["YYYY-MM-DD","merchant name",amount,"CARD"], ...]

Rules:
- amount = the CHARGE amount in ILS (סכום חיוב / סכום לחיוב). Credits/refunds (זיכוי) are NEGATIVE numbers.
- CARD = issuer + last 4 digits, e.g. "CAL-2461", "CAL-9676", "MAX-7995", "MAX-1119", "AMEX-7067", "LEUMI". Read from the statement header (הכרטיס המסתיים ב-XXXX / כרטיס שמסתיים בספרות).
- Keep merchant names in Hebrew exactly as written.
- INCLUDE: purchases, standing orders (הוראת קבע), installment charges (תשלום X מ-Y, only the charged installment amount), card fees (דמי כרטיס), FX fees, and interest lines (ריבית) — for revolving-credit interest lines use merchant "ריבית אשראי מתגלגל".
- EXCLUDE entirely: "יתרת עסקות מצטברת" / accumulated balance rollover lines, "שירות אשראי מתגלגל" PRINCIPAL (קרן) lines, "העברה לסל מצטבר", balance summaries, totals rows, future-charge duplicates of transactions already listed as charged.
- If a transaction appears twice (charged + future notice), include it once.
- Dates: convert DD/MM/YY or DD/MM/YYYY to YYYY-MM-DD.
Return ONLY the JSON array.`;

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY לא מוגדר בהגדרות האתר ב-Netlify" }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "גוף בקשה לא תקין" }, 400);
  }
  const { pdf_base64 } = body || {};
  if (!pdf_base64) return json({ error: "חסר קובץ PDF" }, 400);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf_base64 } },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    });

    const data = await res.json();
    if (data.error) {
      const msg = data.error.message || "שגיאת API";
      return json({ error: /rate/i.test(msg) ? "עומס זמני — נסו שוב" : msg }, 502);
    }

    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    const start = text.indexOf("[");
    if (start === -1) return json({ error: "לא זוהו עסקאות בקובץ" }, 422);
    const raw = text.slice(start);

    let rows;
    try {
      rows = JSON.parse(raw.slice(0, raw.lastIndexOf("]") + 1));
    } catch {
      // תשובה קטועה — חילוץ השורות השלמות בלבד
      const cut = raw.lastIndexOf("],");
      if (cut === -1) return json({ error: "לא זוהו עסקאות בקובץ" }, 422);
      rows = JSON.parse(raw.slice(0, cut + 1) + "]");
    }

    const transactions = rows
      .filter(r => Array.isArray(r) && r.length >= 4 && r[0] && !isNaN(Number(r[2])))
      .map(r => ({
        date: String(r[0]),
        merchant: String(r[1]),
        amount: Number(r[2]),
        card: String(r[3]),
      }));

    return json({ transactions });
  } catch (e) {
    return json({ error: e.message || "שגיאה לא צפויה" }, 500);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
