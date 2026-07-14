// src/services/pdf/parsers/mileagePlus.js — the CAL/Bank Leumi "MileagePlus" card
// (issued and operated by Cal for a Leumi-branded United MileagePlus card, not a
// Bank Leumi checking-account statement) uses the exact same transaction table
// layout as a plain CAL statement — confirmed by comparing two real redacted
// samples line-for-line. No separate logic needed; this just re-exports cal.js
// under the issuer name the orchestrator dispatches on.
export { default } from "./cal";
