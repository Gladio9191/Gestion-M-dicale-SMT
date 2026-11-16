import { Router } from "express";
import { db, employeesTable, visitesTable, restrictionsTable, expertisesManuellesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();
type Kind = "personnel" | "visites" | "restrictions" | "campagne";
type Sheet = { name: string; type: Kind; rows: Record<string, unknown>[] };
type Count = { name: string; type: Kind; created: number; updated: number; skipped: number; errors: number; total: number };
const types = new Set<Kind>(["personnel", "visites", "restrictions", "campagne"]);
const matKeys = ["mle", "matricule", "mat", "n° mle", "numero", "badge"];
function value(row: Record<string, unknown>, keys: string[]): string | null {
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const key of keys) {
    const n = normalize(key);
    for (const [k, v] of Object.entries(row)) {
      const field = normalize(k);
      if (field === n || (n.length > 3 && field.includes(n))) {
        const text = String(v ?? "").trim();
        if (text) return text;
      }
    }
  }
  return null;
}
function aptitude(raw: string | null): "APTE" | "INAPTE" | "APTE_SOUS_RESERVE" | null {
  const v = (raw ?? "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("INAPTE")) return "INAPTE";
  if (v.includes("RESERVE") || v.includes("ASR")) return "APTE_SOUS_RESERVE";
  if (v.includes("APTE")) return "APTE";
  return null;
}
function canonicalDate(raw: string | null): string | null {
  if (!raw) return null;
  const r = raw.trim();
  const m = r.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = m ? m[3] + "-" + m[2] + "-" + m[1] : r;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(iso + "T00:00:00Z");
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/**
 * Replit four-sheet workflow, restored on isolated GitHub branch.
 * Guarded by the single-owner authentication + CSRF middleware in app.ts.
 * Never auto-runs; user must deliberately submit an import request.
 */
router.post("/employees/import-sheets", async (req, res) => {
  const sheets = (req.body as { sheets?: unknown })?.sheets;
  if (!Array.isArray(sheets) || sheets.length === 0 || sheets.length > 100) {
    return res.status(400).json({ error: "Nombre de feuilles invalide" });
  }
  if (sheets.some((s: unknown) => {
    if (!s || typeof s !== "object") return true;
    const a = s as Partial<Sheet>;
    return typeof a.name !== "string" || !types.has(a.type as Kind) ||
      !Array.isArray(a.rows) || a.rows.length > 15000 ||
      a.rows.some((r: unknown) => !r || typeof r !== "object" || Array.isArray(r));
  })) return res.status(400).json({ error: "Format de feuilles invalide" });
  const input = sheets as Sheet[];
  const totalRows = input.reduce((sum, s) => sum + s.rows.length, 0);
  if (totalRows > 50000) return res.status(413).json({ error: "Classeur trop volumineux" });

  const sheetResults: Count[] = [];
  try {
    for (const sheet of input) {
      const count: Count = { name: sheet.name, type: sheet.type, created: 0, updated: 0, skipped: 0, errors: 0, total: sheet.rows.length };
      const indexed = sheet.rows.map(row => ({ row, mat: value(row, matKeys)?.trim() ?? "" }));
      const identified = indexed.filter(x => x.mat);
      count.skipped += indexed.length - identified.length;
      // Validate medical visit dates BEFORE ensuring employee rows exist.
      // Otherwise a malformed VM creates an orphan/ghost employee.
      const valid = sheet.type === "visites"
        ? identified.filter(x => canonicalDate(value(x.row, ["dates", "date vm", "date visite", "date_visite", "d v", "date"])))
        : identified;
      count.errors += identified.length - valid.length;
      const unique = [...new Set(valid.map(x => x.mat))];
      const existing = new Map<string, number>();
      for (let i = 0; i < unique.length; i += 500) {
        const found = await db.select({ id: employeesTable.id, matricule: employeesTable.matricule })
          .from(employeesTable).where(inArray(employeesTable.matricule, unique.slice(i, i + 500)));
        for (const e of found) existing.set(e.matricule, e.id);
      }
      const byMat = new Map(valid.map(x => [x.mat, x.row]));
      for (const mat of unique) {
        const row = byMat.get(mat)!;
        const direction = value(row, ["direction", "dir", "div"]);
        const service = value(row, ["service", "departement"]);
        const posteActuel = value(row, ["designation", "poste actuel", "fonction", "grade", "emploi"]);
        const birthDate = canonicalDate(value(row, ["date naissance", "né le", "nee le", "ddn"]));
        const id = existing.get(mat);
        if (id) {
          if (sheet.type === "personnel") {
            const patch: Record<string, unknown> = {};
            if (direction) patch.direction = direction;
            if (service) patch.service = service;
            if (posteActuel) patch.posteActuel = posteActuel;
            if (birthDate) patch.dateNaissance = birthDate;
            if (Object.keys(patch).length) {
              await db.update(employeesTable).set({ ...patch, updatedAt: new Date() }).where(eq(employeesTable.id, id));
            }
            count.updated++;
          }
        } else {
          const [created] = await db.insert(employeesTable).values({
            matricule: mat, nom: "", prenom: "",
            direction: direction ?? null, service: service ?? null,
            posteActuel: posteActuel ?? null, dateNaissance: birthDate,
          }).returning({ id: employeesTable.id });
          existing.set(mat, created.id);
          // For visits/restrictions/campaigns, count imported clinical rows,
          // not the supporting employee record and the clinical row twice.
          if (sheet.type === "personnel") count.created++;
        }
      }

      if (sheet.type === "visites") {
        const seen = new Set<string>();
        for (const { row, mat } of valid) {
          const rawDate = value(row, ["dates", "date vm", "date visite", "date_visite", "d v"]);
          const dateVisite = canonicalDate(rawDate);
          if (!dateVisite) { count.errors++; continue; }
          const key = mat + "|" + dateVisite;
          if (seen.has(key)) { count.skipped++; continue; }
          seen.add(key);
          const employeeId = existing.get(mat);
          if (!employeeId) { count.errors++; continue; }
          await db.insert(visitesTable).values({
            employeeId, dateVisite,
            typeVisite: value(row, ["type visite", "nature visite", "type vm"]),
            risque: value(row, ["risques", "risque"]),
            examensCliniques: value(row, ["examens cliniques", "ex clinique", "ex cl"]),
            observations: value(row, ["observations", "obs", "remarques"]),
            orientationSoins: value(row, ["cs soins mt", "soins", "orientation soins"]),
            examenRadio: value(row, ["rx pulmo", "radiologie", "radio"]),
            bilan: value(row, ["bilan", "cs expertise ms"]),
            decisionAptitude: aptitude(value(row, ["decision aptitude", "aptitude", "avis"])),
          });
          count.created++;
        }
      } else if (sheet.type === "restrictions") {
        for (const { row, mat } of valid) {
          const employeeId = existing.get(mat);
          if (!employeeId) { count.errors++; continue; }
          const motif = [value(row, ["motif medical", "motif"]), value(row, ["observations", "decision"])].filter(Boolean).join(" — ");
          await db.insert(restrictionsTable).values({
            employeeId,
            typeRestriction: value(row, ["nature rm", "type restriction", "type"])?.toUpperCase().includes("TEMP") ? "TEMPORAIRE" : "DEFINITIVE",
            motifMedical: motif || "Non spécifié",
            dateDebut: canonicalDate(value(row, ["date rm", "date debut"])) ?? null,
            dateFin: canonicalDate(value(row, ["date fin"])) ?? null,
          });
          count.created++;
        }
      } else if (sheet.type === "campagne") {
        for (const { row, mat } of valid) {
          const details = Object.entries(row).filter(([k, v]) => !matKeys.includes(k.toLowerCase()) && String(v ?? "").trim())
            .map(([k, v]) => k + ": " + String(v)).join(" | ");
          await db.insert(expertisesManuellesTable).values({
            matricule: mat, categorie: sheet.name, typeExpertise: sheet.name,
            resultat: details || null, dateExpertise: new Date().toLocaleDateString("fr-FR"),
          });
          count.created++;
        }
      }
      sheetResults.push(count);
    }
  } catch {
    return res.status(500).json({ error: "Import interrompu. Vérifiez les données importées avant nouvelle tentative.", sheets: sheetResults });
  }
  const totals = sheetResults.reduce((a, s) => ({
    created: a.created + s.created, updated: a.updated + s.updated,
    skipped: a.skipped + s.skipped, errors: a.errors + s.errors, total: a.total + s.total,
  }), { created: 0, updated: 0, skipped: 0, errors: 0, total: 0 });
  return res.json({ ...totals, sheets: sheetResults });
});
export default router;
