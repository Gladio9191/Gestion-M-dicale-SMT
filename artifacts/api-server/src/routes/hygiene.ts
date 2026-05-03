import { Router } from "express";
import { db } from "@workspace/db";
import { visitesHygieneTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

/* GET /api/hygiene — list all */
router.get("/hygiene", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(visitesHygieneTable)
      .orderBy(desc(visitesHygieneTable.dateVisite));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* GET /api/hygiene/:id */
router.get("/hygiene/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
    const rows = await db.select().from(visitesHygieneTable).where(eq(visitesHygieneTable.id, id));
    if (!rows.length) { res.status(404).json({ error: "Visite introuvable" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* POST /api/hygiene — create */
router.post("/hygiene", async (req, res) => {
  try {
    const { dateVisite, direction, site, data, scoreGlobal } = req.body;
    if (!dateVisite || !direction || !site || !data) {
      res.status(400).json({ error: "Champs requis manquants" }); return;
    }
    const [row] = await db
      .insert(visitesHygieneTable)
      .values({
        dateVisite, direction, site,
        data: typeof data === "string" ? data : JSON.stringify(data),
        scoreGlobal: scoreGlobal ?? null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* DELETE /api/hygiene/:id */
router.delete("/hygiene/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
    await db.delete(visitesHygieneTable).where(eq(visitesHygieneTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
