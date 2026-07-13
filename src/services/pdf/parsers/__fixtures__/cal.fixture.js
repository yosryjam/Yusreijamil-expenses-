// Sanitized fixture rows mirroring a real CAL statement's structure (also
// shared by the CAL/Leumi MileagePlus card — confirmed identical layout) with
// fake merchants/amounts. Mirrors: an installment purchase, a revolving-credit
// principal+interest pair, an Apple-Pay-tokenized purchase, a refund, and a
// future-charge notice row (two dates on one line).
export const CAL_ROWS = [
  "19/07/2025 רשות דמו לרישוי כלי רכב ותחבור קרדיט 5 מ - 5 לא 2,057.00 ₪ 427.39 ₪",
  "08/08/2025 שירות אשראי מתגלגל שונות קרן לא 39,637.25 ₪ 39,637.25 ₪",
  "08/08/2025 שירות אשראי מתגלגל שונות ריבית לא 39,637.25 ₪ 470.69 ₪",
  "10/12/2025 בית קפה דמו מסעדות מזהה כרטיס Pay Apple 9999 7.00 ₪ 7.00 ₪",
  "03/12/2025 ביטוח דמו רכב רכוש ביטוח ופינ זיכוי הוראת קבע לא -206.54 ₪ -206.54 ₪",
  "26/12/2025 תחנת דלק דמו . אחזקות ב אנרגיה 299.00 ₪ 299.00 ₪",
  "04/01/2026 ביטוח בריאות דמו ביטוח ופינ הוראת קבע לא 36.11 ₪ 10/02/26 36.11 ₪",
  "08/01/2026 15.75% 14.90% (פ+9.40%) קרדיט",
];
