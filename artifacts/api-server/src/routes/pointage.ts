import { Router } from "express";
import { db } from "@workspace/db";
import { pointageMensuelTable } from "@workspace/db";
import { eq, like, sql } from "drizzle-orm";

const router = Router();

/* ── Helpers ── */
const isWeekend = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6; // 0=Sun, 6=Sat
};

const daysOfMonth = (yearMonth: string): string[] => {
  const [y, m] = yearMonth.split("-").map(Number);
  const days: string[] = [];
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    const dd = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${String(m).padStart(2, "0")}-${dd}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
};

/* GET /api/pointage?mois=2025-05 */
router.get("/pointage", async (req, res) => {
  const { mois } = req.query as Record<string, string>;
  if (!mois || !/^\d{4}-\d{2}$/.test(mois)) {
    return res.status(400).json({ error: "Paramètre ?mois=YYYY-MM requis" });
  }
  const rows = await db
    .select()
    .from(pointageMensuelTable)
    .where(like(pointageMensuelTable.date, `${mois}%`))
    .orderBy(pointageMensuelTable.date);
  return res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

/* POST /api/pointage — create single entry */
router.post("/pointage", async (req, res) => {
  const { date, heureEntree = "08:00", heureSortie = "16:30", observations = null } = req.body;
  if (!date) return res.status(400).json({ error: "date est requis" });
  try {
    const [row] = await db
      .insert(pointageMensuelTable)
      .values({ date, heureEntree, heureSortie, observations })
      .onConflictDoUpdate({
        target: pointageMensuelTable.date,
        set: { heureEntree, heureSortie, observations },
      })
      .returning();
    return res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch {
    return res.status(409).json({ error: "Date déjà existante" });
  }
});

/* PUT /api/pointage/:id */
router.put("/pointage/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { heureEntree, heureSortie, observations } = req.body;
  const [row] = await db
    .update(pointageMensuelTable)
    .set({
      ...(heureEntree  !== undefined && { heureEntree }),
      ...(heureSortie  !== undefined && { heureSortie }),
      ...(observations !== undefined && { observations }),
    })
    .where(eq(pointageMensuelTable.id, id))
    .returning();
  if (!row) return res.status(404).json({ error: "Non trouvé" });
  return res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

/* DELETE /api/pointage/:id */
router.delete("/pointage/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(pointageMensuelTable).where(eq(pointageMensuelTable.id, id));
  return res.status(204).send();
});

/* POST /api/pointage/generate — bulk-create all working days for a month */
router.post("/pointage/generate", async (req, res) => {
  const { mois } = req.body as { mois: string };
  if (!mois || !/^\d{4}-\d{2}$/.test(mois)) {
    return res.status(400).json({ error: "mois=YYYY-MM requis" });
  }
  const workDays = daysOfMonth(mois).filter((d) => !isWeekend(d));
  // Insert only dates not already present — use onConflictDoNothing
  if (workDays.length === 0) return res.json({ created: 0 });
  const vals = workDays.map((date) => ({ date, heureEntree: "08:00", heureSortie: "16:30" }));
  const result = await db
    .insert(pointageMensuelTable)
    .values(vals)
    .onConflictDoNothing({ target: pointageMensuelTable.date })
    .returning();
  return res.json({ created: result.length });
});

/* GET /api/pointage/stats?mois=2025-05 — summary */
router.get("/pointage/stats", async (req, res) => {
  const { mois } = req.query as Record<string, string>;
  if (!mois) return res.status(400).json({ error: "?mois requis" });
  const rows = await db
    .select({ cnt: sql<string>`count(*)` })
    .from(pointageMensuelTable)
    .where(like(pointageMensuelTable.date, `${mois}%`));
  return res.json({ jours: Number(rows[0]?.cnt ?? 0) });
});

export default router;
