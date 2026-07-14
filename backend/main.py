# backend/main.py
# YJ Finance — Backend
# FastAPI server: מקבל דפי חיוב PDF, מפענח עסקאות עם Claude AI,
# מסווג לקטגוריות בעברית, מסנן כפילויות ושומר ב-SQLite.
#
# הרצה:
#   pip install -r requirements.txt
#   set ANTHROPIC_API_KEY=sk-ant-...   (Windows)
#   uvicorn main:app --reload --port 8000

import base64
import hashlib
import json
import os
import sqlite3
from contextlib import contextmanager

import anthropic
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# ==========================================================
# הגדרות
# ==========================================================

DB_PATH = os.path.join(os.path.dirname(__file__), "yj_finance.db")
MODEL = "claude-sonnet-4-6"

client = anthropic.Anthropic()  # קורא ANTHROPIC_API_KEY מהסביבה

app = FastAPI(title="YJ Finance API")

# CORS — חובה כדי שהדפדפן (localhost:5173) יוכל לדבר עם השרת
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# מסד נתונים (SQLite)
# ==========================================================

@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS statements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            checksum TEXT UNIQUE,
            transactions_count INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            txn_key TEXT UNIQUE,
            date TEXT,
            merchant TEXT,
            card TEXT,
            amount REAL,
            category TEXT,
            statement_id INTEGER,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS merchant_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pattern TEXT UNIQUE,
            category TEXT
        );
        """)


init_db()

# ==========================================================
# חוקי סיווג (בית עסק ← קטגוריה)
# ==========================================================

DEFAULT_RULES = [
    # ריבית ועמלות — קודם
    ("ריבית", "ריבית ועמלות"), ("דמי כרטיס", "ריבית ועמלות"),
    ("עמלה", "ריבית ועמלות"), ("עמלת", "ריבית ועמלות"),
    ("פרעון מוקדם", "ריבית ועמלות"),
    # חשבונות
    ("חברת החשמל", "חשמל"), ("חשמל", "חשמל"),
    ("מיי עירון", "מים"), ("מי עירון", "מים"),
    # ביטוח
    ("הראל", "ביטוח"), ("מנורה", "ביטוח"), ("הפניקס", "ביטוח"),
    ("כלל ביטוח", "ביטוח"), ("AIG", "ביטוח"), ("ביטוח", "ביטוח"), ("כללית", "ביטוח"),
    # דלק
    ("פז", "דלק"), ("דלק", "דלק"), ("YELLOW", "דלק"),
    ("אלון חוצה", "דלק"), ("ניר אליהו", "דלק"), ("וואן דלקים", "דלק"), ("סונול", "דלק"),
    # פארם
    ("סופר-פארם", "פארם"), ("סופר פארם", "פארם"), ("פארם", "פארם"),
    # סופרמרקט
    ("בראון מרקט", "סופרמרקט"), ("ספאר", "סופרמרקט"), ("BE טייבה", "סופרמרקט"),
    ("מגה", "סופרמרקט"), ("ביג סטור", "סופרמרקט"), ("שופרסל", "סופרמרקט"),
    ("ריבר", "סופרמרקט"), ("מכולת", "סופרמרקט"),
    # ביגוד והנעלה
    ("זארה", "ביגוד והנעלה"), ("H/M", "ביגוד והנעלה"), ("H&M", "ביגוד והנעלה"),
    ("קסטרו", "ביגוד והנעלה"), ("Tommy", "ביגוד והנעלה"), ("KOTON", "ביגוד והנעלה"),
    ("NEXT", "ביגוד והנעלה"), ("RESERVED", "ביגוד והנעלה"),
    ("סטרדיווריוס", "ביגוד והנעלה"), ("מייקל קורס", "ביגוד והנעלה"),
    ("טופ טן", "ביגוד והנעלה"), ("פמינה", "ביגוד והנעלה"),
    ("מיננה", "ביגוד והנעלה"), ("פוטלוקר", "ביגוד והנעלה"),
    ("נימרוד", "ביגוד והנעלה"), ("אוריגינלס", "ביגוד והנעלה"), ("SOHO", "ביגוד והנעלה"),
    # מסעדות ובתי קפה
    ("WOLT", "מסעדות ובתי קפה"), ("קפה", "מסעדות ובתי קפה"),
    ("מסעד", "מסעדות ובתי קפה"), ("ארומה", "מסעדות ובתי קפה"),
    ("מאפ", "מסעדות ובתי קפה"), ("BAKERY", "מסעדות ובתי קפה"),
    ("פיצה", "מסעדות ובתי קפה"), ("בורגר", "מסעדות ובתי קפה"),
    ("BURGER", "מסעדות ובתי קפה"), ("שווארמה", "מסעדות ובתי קפה"),
    ("TOMO", "מסעדות ובתי קפה"), ("ארקפה", "מסעדות ובתי קפה"),
    ("דלי קרים", "מסעדות ובתי קפה"), ("האאט", "מסעדות ובתי קפה"),
    ("גלידוש", "מסעדות ובתי קפה"), ("ג'ילאטו", "מסעדות ובתי קפה"),
    # נסיעות
    ("wizzair", "נסיעות"), ("WIZZ", "נסיעות"), ("FLYDUBAI", "נסיעות"),
    ("HOTEL", "נסיעות"), ("PRIORITY PASS", "נסיעות"), ("booking", "נסיעות"),
    ("אל על", "נסיעות"),
    # חו"ל ומנויים
    ("NETFLIX", 'חיובי חו"ל ומנויים'), ("ALIEXPRESS", 'חיובי חו"ל ומנויים'),
    ("aliexpress", 'חיובי חו"ל ומנויים'), ("SHEIN", 'חיובי חו"ל ומנויים'),
    ("hbomax", 'חיובי חו"ל ומנויים'), ("FCBARCELONA", 'חיובי חו"ל ומנויים'),
    ("MBC", 'חיובי חו"ל ומנויים'), ("פרי טיוי", 'חיובי חו"ל ומנויים'),
    ("יונייטד סיב", 'חיובי חו"ל ומנויים'),
]


def get_rules():
    """חוקים מהמסד (תיקונים ידניים) קודמים, ואז ברירות המחדל."""
    with db() as conn:
        custom = [(r["pattern"], r["category"]) for r in
                  conn.execute("SELECT pattern, category FROM merchant_rules ORDER BY id DESC")]
    return custom + DEFAULT_RULES


def categorize(merchant: str, rules) -> str:
    m = (merchant or "").lower()
    for pattern, category in rules:
        if pattern.lower() in m:
            return category
    return "שונות"

# ==========================================================
# פענוח PDF עם Claude
# ==========================================================

EXTRACTION_PROMPT = """You are parsing an Israeli credit card monthly statement (Hebrew, from Cal, Max, or American Express / Isracard) or a Bank Leumi statement.

Extract ONLY real spending transactions and interest/fee lines. Return ONLY a JSON array (no markdown, no explanation) of arrays:
[["YYYY-MM-DD","merchant name",amount,"CARD"], ...]

Rules:
- amount = the CHARGE amount in ILS (סכום חיוב / סכום לחיוב). Credits/refunds (זיכוי) are NEGATIVE numbers.
- CARD = issuer + last 4 digits, e.g. "CAL-1234", "MAX-5678", "AMEX-9012", "LEUMI". Read from the statement header (הכרטיס המסתיים ב-XXXX / כרטיס שמסתיים בספרות).
- Keep merchant names in Hebrew exactly as written.
- INCLUDE: purchases, standing orders (הוראת קבע), installment charges (תשלום X מ-Y, only the charged installment amount), card fees (דמי כרטיס), FX fees, and interest lines (ריבית) — for revolving-credit interest lines use merchant "ריבית אשראי מתגלגל".
- EXCLUDE entirely: "יתרת עסקות מצטברת" / accumulated balance rollover lines, "שירות אשראי מתגלגל" PRINCIPAL (קרן) lines, "העברה לסל מצטבר", balance summaries, totals rows, future-charge duplicates of transactions already listed as charged.
- If a transaction appears twice (charged + future notice), include it once.
- Dates: convert DD/MM/YY or DD/MM/YYYY to YYYY-MM-DD.
Return ONLY the JSON array."""


def parse_pdf(pdf_bytes: bytes):
    """שולח PDF ל-Claude ומחזיר רשימת עסקאות."""
    b64 = base64.standard_b64encode(pdf_bytes).decode()
    msg = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "document",
                 "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
                {"type": "text", "text": EXTRACTION_PROMPT},
            ],
        }],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    text = text.replace("```json", "").replace("```", "").strip()

    start = text.find("[")
    if start == -1:
        raise ValueError("לא זוהו עסקאות בקובץ")
    body = text[start:]
    try:
        rows = json.loads(body[: body.rfind("]") + 1])
    except json.JSONDecodeError:
        # תשובה קטועה — חילוץ השורות השלמות בלבד
        cut = body.rfind("],")
        if cut == -1:
            raise ValueError("לא זוהו עסקאות בקובץ")
        rows = json.loads(body[: cut + 1] + "]")

    out = []
    for r in rows:
        if isinstance(r, list) and len(r) >= 4 and r[0]:
            try:
                out.append({
                    "date": str(r[0]),
                    "merchant": str(r[1]),
                    "amount": float(r[2]),
                    "card": str(r[3]),
                })
            except (ValueError, TypeError):
                continue
    return out

# ==========================================================
# Endpoints
# ==========================================================

@app.post("/api/upload-statements")
async def upload_statements(files: list[UploadFile] = File(...)):
    rules = get_rules()
    all_new = []
    skipped_duplicates = 0
    failed_files = []

    for f in files:
        pdf_bytes = await f.read()
        checksum = hashlib.sha256(pdf_bytes).hexdigest()

        # כפילות ברמת הקובץ — אותו PDF הועלה בעבר
        with db() as conn:
            exists = conn.execute(
                "SELECT id FROM statements WHERE checksum = ?", (checksum,)
            ).fetchone()
        if exists:
            skipped_duplicates += 1
            continue

        # פענוח עם ניסיון חוזר אחד
        try:
            try:
                rows = parse_pdf(pdf_bytes)
            except Exception:
                rows = parse_pdf(pdf_bytes)  # retry once
        except Exception as e:
            failed_files.append({"filename": f.filename, "error": str(e)})
            continue

        with db() as conn:
            cur = conn.execute(
                "INSERT INTO statements (filename, checksum, transactions_count) VALUES (?, ?, ?)",
                (f.filename, checksum, len(rows)),
            )
            statement_id = cur.lastrowid

            for r in rows:
                key = f"{r['date']}|{r['merchant']}|{r['amount']}|{r['card']}"
                category = categorize(r["merchant"], rules)
                try:
                    conn.execute(
                        """INSERT INTO transactions
                           (txn_key, date, merchant, card, amount, category, statement_id)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (key, r["date"], r["merchant"], r["card"], r["amount"], category, statement_id),
                    )
                    all_new.append({**r, "category": category})
                except sqlite3.IntegrityError:
                    # כפילות ברמת העסקה
                    skipped_duplicates += 1

    return {
        "transactions": all_new,
        "skipped_duplicates": skipped_duplicates,
        "failed_files": failed_files,
    }


@app.get("/api/transactions")
def list_transactions():
    """כל העסקאות השמורות — לטעינת האפליקציה."""
    with db() as conn:
        rows = conn.execute(
            "SELECT id, date, merchant, card, amount, category FROM transactions ORDER BY date DESC"
        ).fetchall()
    return {"transactions": [dict(r) for r in rows]}


@app.patch("/api/transactions/{txn_id}/category")
def update_category(txn_id: int, payload: dict):
    """עדכון קטגוריה ידני + לימוד חוק חדש לאותו בית עסק."""
    category = payload.get("category", "שונות")
    with db() as conn:
        row = conn.execute("SELECT merchant FROM transactions WHERE id = ?", (txn_id,)).fetchone()
        if not row:
            return {"ok": False, "error": "עסקה לא נמצאה"}
        conn.execute("UPDATE transactions SET category = ? WHERE id = ?", (category, txn_id))
        conn.execute(
            "INSERT OR REPLACE INTO merchant_rules (pattern, category) VALUES (?, ?)",
            (row["merchant"], category),
        )
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"status": "ok", "api_key_set": bool(os.environ.get("ANTHROPIC_API_KEY"))}
