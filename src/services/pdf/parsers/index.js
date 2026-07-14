// Registry of dedicated per-issuer parsers. Each entry is a function
// (rows, card) -> transaction[] with the same shape as genericParser.parseRows.
// An issuer with no dedicated parser yet falls back to the generic parser
// in ../index.js — that fallback is what keeps every issuer working today.
import parseMaxStatement from "./max";
import parseCalStatement from "./cal";
import parseMileagePlusStatement from "./mileagePlus";
import parseAmexStatement from "./amex";

const REGISTRY = {
  MAX: parseMaxStatement,
  CAL: parseCalStatement,
  "MILEAGE PLUS": parseMileagePlusStatement,
  AMEX: parseAmexStatement,
};

export function registerParser(issuer, parseFn) {
  REGISTRY[issuer] = parseFn;
}

export function getParser(issuer) {
  return REGISTRY[issuer];
}
