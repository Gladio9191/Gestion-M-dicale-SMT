import { Router } from "express";
import { db } from "@workspace/db";
import {
  employeesTable,
  visitesTable,
  restrictionsTable,
} from "@workspace/db";
import { sql, desc } from "drizzle-orm";

const router = Router();

router.get("/stats/overview", async (_req, res) => {
  const currentYear = new Date().getFullYear();

  const [
    totalEmployees,
    totalVisites,
    visitesThisYear,
    inapteCount,
    restrictionsCount,
    servicesCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(employeesTable),
    db.select({ count: sql<number>`count(*)` }).from(visitesTable),
    db
      .select({ count: sql<number>`count(*)` })
      .from(visitesTable)
      .where(sql`EXTRACT(YEAR FROM ${visitesTable.dateVisite}::date) = ${currentYear}`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(visitesTable)
      .where(sql`${visitesTable.decisionAptitude} = 'INAPTE'`),
    db.select({ count: sql<number>`count(*)` }).from(restrictionsTable),
    db
      .select({ count: sql<number>`count(distinct ${employeesTable.service})` })
      .from(employeesTable)
      .where(sql`${employeesTable.service} IS NOT NULL`),
  ]);

  return res.json({
    totalEmployees: Number(totalEmployees[0]?.count ?? 0),
    totalVisites: Number(totalVisites[0]?.count ?? 0),
    visitesThisYear: Number(visitesThisYear[0]?.count ?? 0),
    inapteCount: Number(inapteCount[0]?.count ?? 0),
    restrictionsCount: Number(restrictionsCount[0]?.count ?? 0),
    servicesCount: Number(servicesCount[0]?.count ?? 0),
  });
});

router.get("/stats/services", async (_req, res) => {
  const result = await db
    .select({
      service: employeesTable.service,
      count: sql<number>`count(*)`,
    })
    .from(employeesTable)
    .where(sql`${employeesTable.service} IS NOT NULL`)
    .groupBy(employeesTable.service)
    .orderBy(desc(sql`count(*)`));

  return res.json(
    result.map((r) => ({
      service: r.service ?? "Inconnu",
      count: Number(r.count),
    }))
  );
});

router.get("/stats/recent-visites", async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const result = await db
    .select({
      id: visitesTable.id,
      matricule: employeesTable.matricule,
      nom: employeesTable.nom,
      prenom: employeesTable.prenom,
      service: employeesTable.service,
      dateVisite: visitesTable.dateVisite,
      typeVisite: visitesTable.typeVisite,
      decisionAptitude: visitesTable.decisionAptitude,
    })
    .from(visitesTable)
    .innerJoin(employeesTable, sql`${visitesTable.employeeId} = ${employeesTable.id}`)
    .orderBy(desc(visitesTable.dateVisite))
    .limit(limit);

  return res.json(
    result.map((r) => ({
      ...r,
      nomPrenom: `${r.nom} ${r.prenom}`,
    }))
  );
});

router.get("/stats/aptitude", async (_req, res) => {
  const result = await db
    .select({
      decision: visitesTable.decisionAptitude,
      count: sql<number>`count(*)`,
    })
    .from(visitesTable)
    .where(sql`${visitesTable.decisionAptitude} IS NOT NULL`)
    .groupBy(visitesTable.decisionAptitude);

  return res.json(
    result.map((r) => ({
      decision: r.decision ?? "NON_DEFINI",
      count: Number(r.count),
    }))
  );
});

router.get("/services", async (_req, res) => {
  const result = await db
    .selectDistinct({ service: employeesTable.service })
    .from(employeesTable)
    .where(sql`${employeesTable.service} IS NOT NULL`)
    .orderBy(employeesTable.service);
  return res.json(result.map((r) => r.service).filter(Boolean));
});

export default router;
