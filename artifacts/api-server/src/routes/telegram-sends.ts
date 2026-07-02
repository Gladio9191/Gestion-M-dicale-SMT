import { Router } from "express";
import { db } from "@workspace/db";
import { telegramSendsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/telegram-sends", async (req, res) => {
  const rows = await db
    .select()
    .from(telegramSendsTable)
    .orderBy(desc(telegramSendsTable.createdAt))
    .limit(100);
  res.json(rows);
});

router.post("/telegram-sends", async (req, res) => {
  const { matricule, chatId, status, errorMessage, nomPrenom, direction } = req.body as {
    matricule: number;
    chatId: string;
    status: string;
    errorMessage?: string;
    nomPrenom?: string;
    direction?: string;
  };
  if (!matricule || !chatId || !status) {
    res.status(400).json({ error: "matricule, chatId et status sont requis" });
    return;
  }
  const [row] = await db
    .insert(telegramSendsTable)
    .values({ matricule, chatId, status, errorMessage: errorMessage ?? null, nomPrenom: nomPrenom ?? null, direction: direction ?? null })
    .returning();
  res.status(201).json(row);
});

export default router;
