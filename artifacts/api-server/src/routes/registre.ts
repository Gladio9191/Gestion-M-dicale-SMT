import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, visitesTable } from "@workspace/db";
import { eq, ilike, or, and, inArray, desc, sql } from "drizzle-orm";

const router = Router();

/* ═══════════════════════════════════════════════════════════════════════════
   BUSINESS LOGIC — Type théorique de visite
   Risque A (Actifs):
     • 1ère visite de l'année → VMA
     • 2ème visite : semestre différent du 1er → VMSle ; même semestre → VMC
     • 3ème+ visite → VMC
   Risque S (Sédentaires):
     • Toujours VMA
═══════════════════════════════════════════════════════════════════════════ */
function computeTypeVisite(
  risque: string | null,
  datesAnneeAsc: string[], // dates de la même année, triées ASC
  currentDate: string
): string {
  const r = (risque ?? "").trim().toUpperCase();

  // Sédentaires → toujours VMA
  if (r === "S") return "VMA";

  const idx = datesAnneeAsc.indexOf(currentDate);
  if (idx <= 0) return "VMA"; // 1ère visite

  if (idx === 1) {
    // 2ème : comparer les semestres
    // S1 = janvier–juin (mois 1–6), S2 = juillet–décembre (mois 7–12)
    const semOf = (d: string) => parseInt(d.slice(5, 7)) <= 6 ? 1 : 2;
    return semOf(datesAnneeAsc[0]) !== semOf(currentDate) ? "VMSle" : "VMC";
  }

  return "VMC"; // 3ème+
}

router.get("/registre-activites", async (req, res) => {
  try {
    const {
      search, direction,
      page: p = "1", limit: l = "25",
    } = req.query as Record<string, string>;
    const page   = Math.max(1, parseInt(p));
    const limit  = Math.min(100, Math.max(1, parseInt(l)));
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (search) {
      conditions.push(
        or(
          ilike(employeesTable.nom,       `%${search}%`),
          ilike(employeesTable.prenom,    `%${search}%`),
          ilike(employeesTable.matricule, `%${search}%`)
        )!
      );
    }
    if (direction) conditions.push(eq(employeesTable.direction, direction));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [employees, [{ cnt }], directionsResult] = await Promise.all([
      db.select().from(employeesTable)
        .where(where)
        .orderBy(employeesTable.nom, employeesTable.prenom)
        .limit(limit).offset(offset),
      db.select({ cnt: sql<string>`count(*)` }).from(employeesTable).where(where),
      db.selectDistinct({ direction: employeesTable.direction })
        .from(employeesTable).orderBy(employeesTable.direction),
    ]);

    const directions = directionsResult.map((r) => r.direction).filter(Boolean);

    /* ── Fetch ALL visits for these employees (needed for type calcul) ── */
    type VRow = {
      employeeId: number;
      dateVisite: string;
      typeVisite: string | null;
      risque: string | null;
      examensCliniques: string | null;
      observations: string | null;
      decisionAptitude: string | null;
      orientationSoins: string | null;
      examenRadio: string | null;
      bilan: string | null;
    };

    const allVisitsByEmp = new Map<number, VRow[]>();

    if (employees.length > 0) {
      const empIds = employees.map((e) => e.id);
      const rawVisits = await db
        .select({
          employeeId:       visitesTable.employeeId,
          dateVisite:       visitesTable.dateVisite,
          typeVisite:       visitesTable.typeVisite,
          risque:           visitesTable.risque,
          examensCliniques: visitesTable.examensCliniques,
          observations:     visitesTable.observations,
          decisionAptitude: visitesTable.decisionAptitude,
          orientationSoins: visitesTable.orientationSoins,
          examenRadio:      visitesTable.examenRadio,
          bilan:            visitesTable.bilan,
        })
        .from(visitesTable)
        .where(inArray(visitesTable.employeeId, empIds))
        .orderBy(desc(visitesTable.dateVisite)); // latest first

      for (const v of rawVisits) {
        if (!allVisitsByEmp.has(v.employeeId)) allVisitsByEmp.set(v.employeeId, []);
        allVisitsByEmp.get(v.employeeId)!.push(v);
      }
    }

    const rows = employees.map((e) => {
      const visits = allVisitsByEmp.get(e.id) ?? []; // desc order
      const latest = visits[0] ?? null;

      let typeTheorique: string | null = null;
      if (latest) {
        const latestYear = latest.dateVisite.slice(0, 4);

        // Risque: use from latest visite that has it set
        const risque = visits.find((v) => v.risque)?.risque ?? null;

        // All dates for the same year as the latest visit, sorted ASC
        const datesAnneeAsc = visits
          .filter((v) => v.dateVisite.slice(0, 4) === latestYear)
          .map((v) => v.dateVisite)
          .sort();

        typeTheorique = computeTypeVisite(risque, datesAnneeAsc, latest.dateVisite);
      }

      return {
        id:           e.id,
        matricule:    e.matricule,
        nom:          e.nom,
        prenom:       e.prenom,
        direction:    e.direction,
        service:      e.service,
        posteActuel:  e.posteActuel,
        age:          e.dateNaissance
          ? new Date().getFullYear() - new Date(e.dateNaissance).getFullYear()
          : null,
        latestVisite: latest
          ? { ...latest, typeTheorique }
          : null,
      };
    });

    return res.json({ total: Number(cnt), rows, directions });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
