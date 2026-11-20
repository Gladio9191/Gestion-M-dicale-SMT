import { Router } from "express";
import { db } from "@workspace/db";
import {
  visitesTable,
  antecedentsTable,
  restrictionsTable,
  expertisesTable,
  insertVisiteSchema,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Update only clinical fields defined by the schema. Reject employeeId,
// id, createdAt or any unknown payload to prevent medical record reassignment.
const UpdateVisiteBody = insertVisiteSchema.omit({ employeeId: true }).partial().strict();
const isValidId = (id: number): boolean => Number.isSafeInteger(id) && id > 0;


router.put("/visites/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = UpdateVisiteBody.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "Invalid visit update fields" });
  }
  const [updated] = await db
    .update(visitesTable)
    .set(parsed.data)
    .where(eq(visitesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Visite non trouvée" });
  return res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/visites/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(visitesTable).where(eq(visitesTable.id, id));
  return res.json({ success: true });
});

router.delete("/antecedents/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(antecedentsTable).where(eq(antecedentsTable.id, id));
  return res.json({ success: true });
});

router.delete("/restrictions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(restrictionsTable).where(eq(restrictionsTable.id, id));
  return res.json({ success: true });
});

router.delete("/expertises/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(expertisesTable).where(eq(expertisesTable.id, id));
  return res.json({ success: true });
});

export default router;
