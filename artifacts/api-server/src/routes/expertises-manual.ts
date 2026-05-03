import { Router } from "express";
import { db } from "@workspace/db";
import { expertisesManuellesTable, employeesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

/* GET /api/expertises-manual — list recent */
router.get("/expertises-manual", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(expertisesManuellesTable)
      .orderBy(desc(expertisesManuellesTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* GET /api/expertises-manual/by-matricule/:matricule */
router.get("/expertises-manual/by-matricule/:matricule", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(expertisesManuellesTable)
      .where(eq(expertisesManuellesTable.matricule, req.params.matricule))
      .orderBy(desc(expertisesManuellesTable.dateExpertise));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* POST /api/expertises-manual */
router.post("/expertises-manual", async (req, res) => {
  try {
    const { matricule, categorie, typeExpertise, resultat, dateExpertise } = req.body;
    if (!matricule || !categorie || !typeExpertise || !dateExpertise) {
      res.status(400).json({ error: "Champs requis manquants" }); return;
    }
    const [row] = await db
      .insert(expertisesManuellesTable)
      .values({ matricule, categorie, typeExpertise, resultat: resultat || null, dateExpertise })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/* DELETE /api/expertises-manual/:id */
router.delete("/expertises-manual/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
    await db.delete(expertisesManuellesTable).where(eq(expertisesManuellesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
