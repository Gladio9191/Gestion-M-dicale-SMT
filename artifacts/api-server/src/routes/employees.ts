import { Router } from "express";
import { db } from "@workspace/db";
import {
  employeesTable,
  antecedentsTable,
  restrictionsTable,
  expertisesTable,
  visitesTable,
} from "@workspace/db";
import {
  ListEmployeesQueryParams,
  CreateEmployeeBody,
  UpdateEmployeeBody,
} from "@workspace/api-zod";
import { eq, ilike, or, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/employees", async (req, res) => {
  const query = ListEmployeesQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }
  const { search, service, page, limit } = query.data;
  const offset = (page - 1) * limit;

  let whereConditions: ReturnType<typeof or> | undefined;

  if (search && service) {
    whereConditions = or(
      ilike(employeesTable.nom, `%${search}%`),
      ilike(employeesTable.prenom, `%${search}%`),
      ilike(employeesTable.matricule, `%${search}%`)
    );
  } else if (search) {
    whereConditions = or(
      ilike(employeesTable.nom, `%${search}%`),
      ilike(employeesTable.prenom, `%${search}%`),
      ilike(employeesTable.matricule, `%${search}%`)
    );
  }

  const [employees, countResult] = await Promise.all([
    db
      .select()
      .from(employeesTable)
      .where(
        whereConditions
          ? service
            ? sql`${whereConditions} AND ${employeesTable.service} ILIKE ${`%${service}%`}`
            : whereConditions
          : service
          ? ilike(employeesTable.service, `%${service}%`)
          : undefined
      )
      .orderBy(desc(employeesTable.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(employeesTable)
      .where(
        whereConditions
          ? service
            ? sql`${whereConditions} AND ${employeesTable.service} ILIKE ${`%${service}%`}`
            : whereConditions
          : service
          ? ilike(employeesTable.service, `%${service}%`)
          : undefined
      ),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  const mapped = employees.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    age: e.dateNaissance
      ? new Date().getFullYear() - new Date(e.dateNaissance).getFullYear()
      : null,
  }));

  return res.json({ employees: mapped, total, page, limit });
});

router.post("/employees", async (req, res) => {
  const body = CreateEmployeeBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const existing = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.matricule, body.data.matricule))
    .limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Un employé avec ce matricule existe déjà" });
  }
  const [employee] = await db
    .insert(employeesTable)
    .values({
      ...body.data,
      updatedAt: new Date(),
    })
    .returning();
  return res.status(201).json({
    ...employee,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    age: employee.dateNaissance
      ? new Date().getFullYear() - new Date(employee.dateNaissance).getFullYear()
      : null,
  });
});

router.get("/employees/:matricule", async (req, res) => {
  const { matricule } = req.params;
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!employee) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  return res.json({
    ...employee,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    age: employee.dateNaissance
      ? new Date().getFullYear() - new Date(employee.dateNaissance).getFullYear()
      : null,
  });
});

router.put("/employees/:matricule", async (req, res) => {
  const { matricule } = req.params;
  const body = UpdateEmployeeBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }
  const [existing] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!existing) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  const [updated] = await db
    .update(employeesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(employeesTable.matricule, matricule))
    .returning();
  return res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    age: updated.dateNaissance
      ? new Date().getFullYear() - new Date(updated.dateNaissance).getFullYear()
      : null,
  });
});

router.get("/employees/:matricule/fiche", async (req, res) => {
  const { matricule } = req.params;
  const [employee] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!employee) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  const [antecedents, restrictions, expertises, visites] = await Promise.all([
    db.select().from(antecedentsTable).where(eq(antecedentsTable.employeeId, employee.id)).orderBy(desc(antecedentsTable.createdAt)),
    db.select().from(restrictionsTable).where(eq(restrictionsTable.employeeId, employee.id)).orderBy(desc(restrictionsTable.createdAt)),
    db.select().from(expertisesTable).where(eq(expertisesTable.employeeId, employee.id)).orderBy(desc(expertisesTable.createdAt)),
    db.select().from(visitesTable).where(eq(visitesTable.employeeId, employee.id)).orderBy(desc(visitesTable.dateVisite)),
  ]);

  const mapEmployee = (e: typeof employee) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    age: e.dateNaissance
      ? new Date().getFullYear() - new Date(e.dateNaissance).getFullYear()
      : null,
  });
  const mapWithDate = (items: { createdAt: Date; [key: string]: unknown }[]) =>
    items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));

  return res.json({
    employee: mapEmployee(employee),
    antecedents: mapWithDate(antecedents),
    restrictions: mapWithDate(restrictions),
    expertises: mapWithDate(expertises),
    visites: mapWithDate(visites),
  });
});

router.get("/employees/:matricule/visites", async (req, res) => {
  const { matricule } = req.params;
  const [employee] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!employee) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  const visites = await db
    .select()
    .from(visitesTable)
    .where(eq(visitesTable.employeeId, employee.id))
    .orderBy(desc(visitesTable.dateVisite));
  return res.json(visites.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })));
});

router.post("/employees/:matricule/visites", async (req, res) => {
  const { matricule } = req.params;
  const [employee] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!employee) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  const [visite] = await db
    .insert(visitesTable)
    .values({ ...req.body, employeeId: employee.id })
    .returning();
  return res.status(201).json({ ...visite, createdAt: visite.createdAt.toISOString() });
});

router.post("/employees/:matricule/antecedents", async (req, res) => {
  const { matricule } = req.params;
  const [employee] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!employee) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  const [antecedent] = await db
    .insert(antecedentsTable)
    .values({ ...req.body, employeeId: employee.id })
    .returning();
  return res.status(201).json({ ...antecedent, createdAt: antecedent.createdAt.toISOString() });
});

router.post("/employees/:matricule/restrictions", async (req, res) => {
  const { matricule } = req.params;
  const [employee] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!employee) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  const [restriction] = await db
    .insert(restrictionsTable)
    .values({ ...req.body, employeeId: employee.id })
    .returning();
  return res.status(201).json({ ...restriction, createdAt: restriction.createdAt.toISOString() });
});

router.post("/employees/:matricule/expertises", async (req, res) => {
  const { matricule } = req.params;
  const [employee] = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(eq(employeesTable.matricule, matricule))
    .limit(1);
  if (!employee) {
    return res.status(404).json({ error: "Employé non trouvé" });
  }
  const [expertise] = await db
    .insert(expertisesTable)
    .values({ ...req.body, employeeId: employee.id })
    .returning();
  return res.status(201).json({ ...expertise, createdAt: expertise.createdAt.toISOString() });
});

export default router;
