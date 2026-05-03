import { Router } from "express";
import { db } from "@workspace/db";
import {
  visitesTable,
  antecedentsTable,
  restrictionsTable,
  expertisesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.put("/visites/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [updated] = await db
    .update(visitesTable)
    .set(req.body)
    .where(eq(visitesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Visite non trouvée" });
  return res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/visites/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(visitesTable).where(eq(visitesTable.id, id));
  return res.json({ success: true });
});

router.delete("/antecedents/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(antecedentsTable).where(eq(antecedentsTable.id, id));
  return res.json({ success: true });
});

router.delete("/restrictions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(restrictionsTable).where(eq(restrictionsTable.id, id));
  return res.json({ success: true });
});

router.delete("/expertises/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(expertisesTable).where(eq(expertisesTable.id, id));
  return res.json({ success: true });
});

export default router;
