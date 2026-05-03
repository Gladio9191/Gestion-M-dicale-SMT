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

router.post("/employees/import", async (req, res) => {
  const { employees, updateExisting = false, visitesOnly = false } = req.body as {
    employees: Array<{
      matricule: string;
      nom?: string | null;
      prenom?: string | null;
      dateNaissance?: string | null;
      dateEmbauche?: string | null;
      direction?: string | null;
      service?: string | null;
      posteActuel?: string | null;
      anamnese?: string | null;
      decisionsImportantes?: string | null;
      dateVisite?: string | null;
      typeVisite?: string | null;
      decisionAptitude?: string | null;
    }>;
    updateExisting?: boolean;
    visitesOnly?: boolean;
  };

  if (!Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({ error: "Aucune donnée à importer" });
  }

  const details: Array<{ matricule: string; status: string; message?: string | null }> = [];
  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (const rec of employees) {
    if (!rec.matricule) {
      details.push({ matricule: rec.matricule ?? "?", status: "error", message: "Matricule est obligatoire" });
      errors++;
      continue;
    }
    try {
      const [existing] = await db
        .select({ id: employeesTable.id })
        .from(employeesTable)
        .where(eq(employeesTable.matricule, rec.matricule.trim()))
        .limit(1);

      let employeeId: number;

      if (existing) {
        if (visitesOnly) {
          // Mode visites — update direction/service/poste si fournis mais ne touche pas nom/prenom
          if (rec.direction || rec.service || rec.posteActuel) {
            const updateFields: Record<string, unknown> = { updatedAt: new Date() };
            if (rec.direction?.trim()) updateFields.direction = rec.direction.trim();
            if (rec.service?.trim()) updateFields.service = rec.service.trim();
            if (rec.posteActuel?.trim()) updateFields.posteActuel = rec.posteActuel.trim();
            await db.update(employeesTable).set(updateFields).where(eq(employeesTable.matricule, rec.matricule.trim()));
          }
          employeeId = existing.id;
          details.push({ matricule: rec.matricule, status: "updated", message: null });
          updated++;
        } else if (updateExisting) {
          await db
            .update(employeesTable)
            .set({
              nom: rec.nom?.trim() || undefined,
              prenom: rec.prenom?.trim() || undefined,
              dateNaissance: rec.dateNaissance?.trim() || null,
              dateEmbauche: rec.dateEmbauche?.trim() || null,
              direction: rec.direction?.trim() || null,
              service: rec.service?.trim() || null,
              posteActuel: rec.posteActuel?.trim() || null,
              anamnese: rec.anamnese?.trim() || null,
              decisionsImportantes: rec.decisionsImportantes?.trim() || null,
              updatedAt: new Date(),
            })
            .where(eq(employeesTable.matricule, rec.matricule.trim()));
          employeeId = existing.id;
          details.push({ matricule: rec.matricule, status: "updated", message: null });
          updated++;
        } else {
          details.push({ matricule: rec.matricule, status: "skipped", message: "Matricule déjà existant" });
          skipped++;
          continue;
        }
      } else if (visitesOnly) {
        // Mode visites — employé introuvable, on skip
        details.push({ matricule: rec.matricule, status: "skipped", message: "Employé introuvable (mode visites)" });
        skipped++;
        continue;
      } else {
        if (!rec.nom || !rec.prenom) {
          details.push({ matricule: rec.matricule, status: "error", message: "Nom et prénom obligatoires pour créer un employé" });
          errors++;
          continue;
        }
        const [inserted] = await db
          .insert(employeesTable)
          .values({
            matricule: rec.matricule.trim(),
            nom: rec.nom.trim(),
            prenom: rec.prenom.trim(),
            dateNaissance: rec.dateNaissance?.trim() || null,
            dateEmbauche: rec.dateEmbauche?.trim() || null,
            direction: rec.direction?.trim() || null,
            service: rec.service?.trim() || null,
            posteActuel: rec.posteActuel?.trim() || null,
            anamnese: rec.anamnese?.trim() || null,
            decisionsImportantes: rec.decisionsImportantes?.trim() || null,
          })
          .returning({ id: employeesTable.id });
        employeeId = inserted.id;
        details.push({ matricule: rec.matricule, status: "created", message: null });
        created++;
      }

      if (rec.dateVisite?.trim()) {
        const aptitude = ["APTE", "INAPTE", "APTE_SOUS_RESERVE"].includes(rec.decisionAptitude ?? "")
          ? (rec.decisionAptitude as "APTE" | "INAPTE" | "APTE_SOUS_RESERVE")
          : null;
        await db.insert(visitesTable).values({
          employeeId,
          dateVisite: rec.dateVisite.trim(),
          typeVisite: rec.typeVisite?.trim() || null,
          decisionAptitude: aptitude,
        });
      }
    } catch (err) {
      details.push({ matricule: rec.matricule, status: "error", message: String(err) });
      errors++;
    }
  }

  return res.json({ created, updated, skipped, errors, total: employees.length, details });
});

export default router;
