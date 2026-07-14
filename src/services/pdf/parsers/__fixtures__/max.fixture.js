// Sanitized fixture rows mirroring a real MAX statement's structure with fake
// merchants/amounts — never real statement data. Mirrors: two cards in one
// statement, a deferred-charge section, a standing order, the rolling-balance
// rollover line, a loyalty-points table, and a future-charge (for-info) notice.
export const MAX_ROWS = [
  "לכרטיס שמסתיים ב0001-",
  "7 21/02/26 חודש דחוי FakeStream.com FakeCity 49.90 49.90",
  "7 10/03/26 פיצה פנטזיה רגילה 29.90 29.90",
  "7 10/03/26 יתרת עסקות מצטברת סל מצטבר 58,172.77 58,839.75 כולל ריבית: 666.98 שח",
  "7 17/03/26 חברת חשמל דמו בעמ רגילה 1,177.44 1,177.44 הוראת קבע",
  "27/03/26 27/03/26 המרה לנוסע מתמיד 600 -600 500 נקודות תעופה",
  "10/04/26 10/04/26 צבירת נקודות למועדוני תעופה 99 99",
  "7 10/04/26 יתרת עסקות מצטברת סל מצטבר 55,659.31 10/05/26",
  "לכרטיס שמסתיים ב0002-",
  "7 31/03/26 דמי כרטיס רגילה 19.89 19.89",
  "7 06/04/26 פיצה פצץ דמו רגילה 3 מתוך 6 88.00 88.00",
];
