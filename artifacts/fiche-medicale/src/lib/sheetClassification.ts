/**
 * Original Replit multi-sheet classification, moved to an independently tested
 * helper. Names only: no health records are processed by this module.
 */
export type SheetType = "visites" | "personnel" | "restrictions" | "campagne" | "inconnu";

export function detectSheetType(name: string): SheetType {
  const n = name.toLowerCase().trim();
  if (n.startsWith("vms") || n.includes("visite") || n === "vm") return "visites";
  if (n.includes("personnel") || (n.includes("global") && !n.includes("rm"))) return "personnel";
  if (n.includes(" rm") || n.startsWith("rm") || n.includes("restriction") || n.includes("etat rm")) return "restrictions";
  if (
    n.includes("psa") || n.includes("métabo") || n.includes("metabo") ||
    n.includes("check") || n.startsWith("hc ") || n.startsWith("par ") ||
    n.includes("camp") || n.includes("bilan annexe")
  ) return "campagne";
  return "inconnu";
}

export const SHEET_TYPE_LABELS: Record<SheetType, string> = {
  visites: "Visites médicales",
  personnel: "Personnel",
  restrictions: "Restrictions médicales",
  campagne: "Campagne / Annexe",
  inconnu: "Non reconnu",
};
