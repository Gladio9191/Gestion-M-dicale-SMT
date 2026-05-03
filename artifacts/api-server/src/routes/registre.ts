import { Router } from "express";
import { db } from "@workspace/db";
import { employeesTable, visitesTable } from "@workspace/db";
import { eq, ilike, or, and, inArray, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/registre-activites", async (req, res) => {
  try {
    const { search, direction, page: p = "1", limit: l = "25" } = req.query as Record<string, string>;
    const page  = Math.max(1, parseInt(p));
    const limit = Math.min(100, Math.max(1, parseInt(l)));
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
        .limit(limit)
        .offset(offset),
      db.select({ cnt: sql<string>`count(*)` }).from(employeesTable).where(where),
      db.selectDistinct({ direction: employeesTable.direction })
        .from(employeesTable)
        .orderBy(employeesTable.direction),
    ]);

    const directions = directionsResult.map((r) => r.direction).filter(Boolean);

    type VisitRow = {
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

    let visitMap = new Map<number, VisitRow>();
    if (employees.length > 0) {
      const empIds = employees.map((e) => e.id);
      const visits = await db
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
        .orderBy(desc(visitesTable.dateVisite));

      for (const v of visits) {
        if (!visitMap.has(v.employeeId)) {
          visitMap.set(v.employeeId, {
            dateVisite:       v.dateVisite,
            typeVisite:       v.typeVisite,
            risque:           v.risque,
            examensCliniques: v.examensCliniques,
            observations:     v.observations,
            decisionAptitude: v.decisionAptitude,
            orientationSoins: v.orientationSoins,
            examenRadio:      v.examenRadio,
            bilan:            v.bilan,
          });
        }
      }
    }

    const rows = employees.map((e) => ({
      id:            e.id,
      matricule:     e.matricule,
      nom:           e.nom,
      prenom:        e.prenom,
      direction:     e.direction,
      service:       e.service,
      posteActuel:   e.posteActuel,
      age:           e.dateNaissance
        ? new Date().getFullYear() - new Date(e.dateNaissance).getFullYear()
        : null,
      latestVisite:  visitMap.get(e.id) ?? null,
    }));

    return res.json({ total: Number(cnt), rows, directions });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
