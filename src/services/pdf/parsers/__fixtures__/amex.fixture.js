// Sanitized fixture rows mirroring a real Amex (Israel) statement's structure
// with fake merchants/amounts. Mirrors: a foreign-currency purchase (ambiguous
// currency-sign placement -> needsReview), its section subtotal, the "for
// information" footnote row, two ordinary domestic purchases, a "פרעון"
// settlement row (ambiguous -> needsReview), and a dateless card-fee line.
export const AMEX_ROWS = [
  "FakeForeignMerchant SCH א 11/03/26 SPATA 119.17 2.91 3.5995 13/03/26 32.30 €",
  "סך קניות מחול 130.98 130.98 נצבר להכל בקרדיט חול",
  "לידיעה למועד נוכחי",
  "12/03/26 תש.נייד פיס דמו -לשם המזל טוטו/פיס 114.00 114.00 קרדיט",
  "19/03/26 תש.נייד פאסט דמו מסעדות/קפה 46.00 46.00 קרדיט",
  "13/03/26 תש.נייד פרעון אופנה דמו הלבשה 604.90 604.90",
  "דמי כרטיס /הנפקה 73.51 ₪",
];
