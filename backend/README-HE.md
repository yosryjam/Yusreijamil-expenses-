# YJ Finance — Backend (FastAPI) — מיושן, לא בשימוש ב-Version 2

> **שים לב:** קוד זה מיושן ואינו בשימוש. החל מ-Version 2, פענוח דפי החיוב מתבצע
> מקומית בדפדפן (`pdfjs-dist`), ללא שרת וללא מפתח Claude API. אין צורך להגדיר
> `ANTHROPIC_API_KEY` או להריץ שרת זה כדי להשתמש באפליקציה.

## התקנה חד-פעמית
```
cd backend
pip install -r requirements.txt
```

## מפתח API (חובה)
הפענוח משתמש ב-Claude API. צריך מפתח מ- https://console.anthropic.com
(Settings → API Keys → Create Key)

Windows (PowerShell):
```
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

## הרצה
```
uvicorn main:app --reload --port 8000
```

## בדיקה שהכול תקין
פתחו בדפדפן: http://localhost:8000/api/health
צריך להחזיר: {"status":"ok","api_key_set":true}
אם api_key_set=false — המפתח לא הוגדר בסביבה.

## מה השרת עושה
- POST /api/upload-statements — מקבל PDF-ים, מפענח, מסווג, שומר
- GET  /api/transactions — כל העסקאות השמורות
- PATCH /api/transactions/{id}/category — תיקון קטגוריה + לימוד חוק
- כפילויות: גם ברמת הקובץ (checksum) וגם ברמת העסקה (מפתח ייחודי)
- הנתונים נשמרים ב-yj_finance.db (SQLite) — קובץ אחד, גיבוי = העתקה שלו
