// src/constants/theme.js — פלטה לפי ה-mockup: רקע אפור-כחלחל, סיידבר כהה, סגול-אינדיגו ראשי

export const T = {
  bg: "#F5F6FA",
  card: "#FFFFFF",
  ink: "#111827",
  sub: "#6B7280",
  line: "#E5E7EB",
  sidebar: "#0F172A",
  sidebarActive: "#1E293B",
  primary: "#6366F1",
  primarySoft: "#EEF0FE",
  green: "#10B981",
  greenSoft: "#E7F7F1",
  orange: "#F59E0B",
  orangeSoft: "#FDF3E3",
  red: "#EF4444",
  redSoft: "#FDECEC",
  blue: "#3B82F6",
  blueSoft: "#EBF2FE",
};

export const CATEGORY_COLORS = {
  "חשמל": "#EF4444",
  "מים": "#06B6D4",
  "ביטוח": "#3B82F6",
  "דלק": "#8B5CF6",
  "סופרמרקט": "#10B981",
  "פארם ובריאות": "#EC4899",
  "ביגוד והנעלה": "#F97316",
  "נסיעות": "#14B8A6",
  "חיובים בחו\"ל": "#84CC16",
  "מסעדות ובתי קפה": "#F59E0B",
  "שונות": "#9CA3AF",
  "ריבית ועמלות": "#DC2626",
};

// Phase 3 renamed two categories to match the exact spec list. Old category
// strings already saved in a user's localStorage (transactions + budget keys)
// must keep resolving correctly, so both directions are remapped on load.
export const CATEGORY_MIGRATIONS = {
  "פארם": "פארם ובריאות",
  'חיובי חו"ל ומנויים': "חיובים בחו\"ל",
};

export function migrateCategory(category) {
  return CATEGORY_MIGRATIONS[category] || category;
}

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

export const DEFAULT_RULES = [
  ["ריבית", "ריבית ועמלות"], ["דמי כרטיס", "ריבית ועמלות"], ["עמלה", "ריבית ועמלות"],
  ["עמלת", "ריבית ועמלות"], ["פרעון מוקדם", "ריבית ועמלות"],
  ["חברת החשמל", "חשמל"], ["חשמל", "חשמל"],
  ["מיי עירון", "מים"], ["מי עירון", "מים"],
  ["הראל", "ביטוח"], ["מנורה", "ביטוח"], ["הפניקס", "ביטוח"], ["כלל ביטוח", "ביטוח"],
  ["AIG", "ביטוח"], ["ביטוח", "ביטוח"], ["כללית", "ביטוח"],
  ["פז", "דלק"], ["דלק", "דלק"], ["YELLOW", "דלק"], ["אלון חוצה", "דלק"],
  ["ניר אליהו", "דלק"], ["וואן דלקים", "דלק"], ["סונול", "דלק"],
  ["סופר-פארם", "פארם ובריאות"], ["סופר פארם", "פארם ובריאות"], ["פארם", "פארם ובריאות"],
  ["בראון מרקט", "סופרמרקט"], ["ספאר", "סופרמרקט"], ["BE טייבה", "סופרמרקט"],
  ["מגה", "סופרמרקט"], ["ביג סטור", "סופרמרקט"], ["שופרסל", "סופרמרקט"],
  ["ריבר", "סופרמרקט"], ["מכולת", "סופרמרקט"],
  ["זארה", "ביגוד והנעלה"], ["H/M", "ביגוד והנעלה"], ["H&M", "ביגוד והנעלה"],
  ["קסטרו", "ביגוד והנעלה"], ["Tommy", "ביגוד והנעלה"], ["KOTON", "ביגוד והנעלה"],
  ["NEXT", "ביגוד והנעלה"], ["RESERVED", "ביגוד והנעלה"], ["סטרדיווריוס", "ביגוד והנעלה"],
  ["מייקל קורס", "ביגוד והנעלה"], ["טופ טן", "ביגוד והנעלה"], ["פמינה", "ביגוד והנעלה"],
  ["מיננה", "ביגוד והנעלה"], ["פוטלוקר", "ביגוד והנעלה"], ["נימרוד", "ביגוד והנעלה"],
  ["אוריגינלס", "ביגוד והנעלה"], ["SOHO", "ביגוד והנעלה"],
  ["WOLT", "מסעדות ובתי קפה"], ["קפה", "מסעדות ובתי קפה"], ["מסעד", "מסעדות ובתי קפה"],
  ["ארומה", "מסעדות ובתי קפה"], ["מאפ", "מסעדות ובתי קפה"], ["BAKERY", "מסעדות ובתי קפה"],
  ["פיצה", "מסעדות ובתי קפה"], ["בורגר", "מסעדות ובתי קפה"], ["BURGER", "מסעדות ובתי קפה"],
  ["שווארמה", "מסעדות ובתי קפה"], ["TOMO", "מסעדות ובתי קפה"], ["ארקפה", "מסעדות ובתי קפה"],
  ["דלי קרים", "מסעדות ובתי קפה"], ["האאט", "מסעדות ובתי קפה"],
  ["גלידוש", "מסעדות ובתי קפה"], ["ג'ילאטו", "מסעדות ובתי קפה"],
  ["wizzair", "נסיעות"], ["WIZZ", "נסיעות"], ["FLYDUBAI", "נסיעות"], ["HOTEL", "נסיעות"],
  ["PRIORITY PASS", "נסיעות"], ["booking", "נסיעות"], ["אל על", "נסיעות"],
  ["NETFLIX", "חיובים בחו\"ל"], ["ALIEXPRESS", "חיובים בחו\"ל"],
  ["aliexpress", "חיובים בחו\"ל"], ["SHEIN", "חיובים בחו\"ל"],
  ["hbomax", "חיובים בחו\"ל"], ["FCBARCELONA", "חיובים בחו\"ל"],
  ["MBC", "חיובים בחו\"ל"], ["פרי טיוי", "חיובים בחו\"ל"],
  ["יונייטד סיב", "חיובים בחו\"ל"],
];

export function categorize(merchant, customRules = []) {
  const m = (merchant || "").toLowerCase();
  for (const [pat, cat] of [...customRules, ...DEFAULT_RULES]) {
    if (m.includes(pat.toLowerCase())) return cat;
  }
  return "שונות";
}

export const fmt = (n) =>
  "₪" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
export const fmt2 = (n) =>
  "₪" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const txnKey = (t) => `${t.date}|${t.merchant}|${t.amount}|${t.card}`;
export const monthOf = (d) => (d || "").slice(0, 7);

/* localStorage */
export const store = {
  load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error(e); }
  },
};
