import type { SheetType } from "./sheetClassification";

export type Row = Record<string, unknown>;
export type SheetValidation = {
  totalRows: number;
  missingMatricule: number;
  missingVisitDate: number;
  invalidVisitDate: number;
  duplicateVisits: number;
  duplicateMatricules: number;
};

const MATRICULE_HEADERS = ["mle", "matricule", "n mle", "n matricule", "mat", "badge"];
const VISIT_DATE_HEADERS = ["date vm", "dates", "date visite", "date de visite", "date_visite", "d v", "dv", "date"];

function normalizeHeader(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findColumnValue(row: Row, names: string[]): string {
  const keys = Object.keys(row);
  const normalized = new Map(keys.map((key) => [normalizeHeader(key), key]));
  for (const alias of names) {
    const actual = normalized.get(normalizeHeader(alias));
    if (actual) {
      const value = String(row[actual] ?? "").trim();
      if (value) return value;
    }
  }
  return "";
}

/** Strictly accept unambiguous French or ISO calendar dates; never guess MM/DD. */
export function canonicalVisitDate(value: string): string | null {
  const text = value.trim();
  let day = 0, month = 0, year = 0;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (iso) { year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]); }
  else if (fr) { day = Number(fr[1]); month = Number(fr[2]); year = Number(fr[3]); }
  else return null;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function validateSheetRows(type: SheetType, rows: Row[]): SheetValidation {
  const stats: SheetValidation = {
    totalRows: rows.length,
    missingMatricule: 0,
    missingVisitDate: 0,
    invalidVisitDate: 0,
    duplicateVisits: 0,
    duplicateMatricules: 0,
  };
  const seenMatricules = new Set<string>();
  const seenVisits = new Set<string>();
  for (const row of rows) {
    const matricule = findColumnValue(row, MATRICULE_HEADERS);
    if (!matricule) stats.missingMatricule++;
    if (type === "personnel" && matricule) {
      if (seenMatricules.has(matricule)) stats.duplicateMatricules++;
      seenMatricules.add(matricule);
    }
    if (type !== "visites") continue;
    const rawDate = findColumnValue(row, VISIT_DATE_HEADERS);
    if (!rawDate) { stats.missingVisitDate++; continue; }
    const date = canonicalVisitDate(rawDate);
    if (!date) { stats.invalidVisitDate++; continue; }
    if (!matricule) continue;
    const key = `${matricule}\u0000${date}`;
    if (seenVisits.has(key)) stats.duplicateVisits++;
    seenVisits.add(key);
  }
  return stats;
}
