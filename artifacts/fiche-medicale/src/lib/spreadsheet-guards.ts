/** Safety limits for files processed in-browser with SheetJS.
 * Limits reduce accidental resource exhaustion; they do NOT fix vulnerable
 * library code. Replace/upgrade SheetJS as a separate reviewed change.
 */
export const MAX_SPREADSHEET_BYTES = 20 * 1024 * 1024;
export const MAX_SPREADSHEET_ROWS = 20_000;

export function spreadsheetUploadError(file: Pick<File, "name" | "size">): string | null {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return "Format non autorisé : utilisez Excel ou CSV.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "Fichier vide ou taille invalide.";
  }
  if (file.size > MAX_SPREADSHEET_BYTES) {
    return "Fichier trop volumineux (limite 20 Mio).";
  }
  return null;
}
