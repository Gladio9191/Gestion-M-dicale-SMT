import { Router } from "express";
import { db, employeesTable, antecedentsTable, visitesTable, telegramSendsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] ?? c));

/** Original Replit employee action restored behind the application-wide owner/CSRF gate. */
router.post("/employees/:matricule/send-telegram", async (req, res) => {
  const matricule = String(req.params.matricule ?? "").trim();
  const chatId = typeof req.body?.chat_id === "string" ? req.body.chat_id.trim() : "";
  if (!matricule || !chatId || !/^-?\d{1,20}$/.test(chatId)) {
    return res.status(400).json({ error: "Matricule ou chat_id invalide" });
  }
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return res.status(503).json({ error: "Telegram non configuré" });
  const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.matricule, matricule)).limit(1);
  if (!employee) return res.status(404).json({ error: "Employé non trouvé" });
  const [history, visits] = await Promise.all([
    db.select().from(antecedentsTable).where(eq(antecedentsTable.employeeId, employee.id)).orderBy(desc(antecedentsTable.createdAt)),
    db.select().from(visitesTable).where(eq(visitesTable.employeeId, employee.id)).orderBy(desc(visitesTable.dateVisite)).limit(5),
  ]);
  const name = [employee.prenom, employee.nom].filter(Boolean).join(" ");
  const lines = [
    "<b>FICHE TECHNIQUE MÉDICALE</b>",
    "<b>Matricule :</b> " + esc(matricule),
    "<b>Nom et prénom :</b> " + esc(name),
    ...(employee.direction ? ["<b>Direction :</b> " + esc(employee.direction)] : []),
    ...(employee.service ? ["<b>Service :</b> " + esc(employee.service)] : []),
    ...(employee.posteActuel ? ["<b>Poste :</b> " + esc(employee.posteActuel)] : []),
  ];
  if (history.length) {
    lines.push("<b>ATCD notables :</b>");
    for (const a of history.slice(0, 4)) lines.push("• " + esc(a.type) + " : " + esc(a.description));
  }
  if (visits.length) {
    lines.push("<b>Visites récentes :</b>");
    for (const v of visits) lines.push("• " + esc(v.dateVisite) + " — " + esc(v.decisionAptitude));
  }
  let status = "success";
  let errorMessage: string | null = null;
  try {
    const response = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), parse_mode: "HTML" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("Telegram HTTP " + response.status);
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : "Telegram send failed";
  }
  try {
    await db.insert(telegramSendsTable).values({
      matricule: employee.matricule,
      chatId,
      status,
      errorMessage,
      nomPrenom: name || null,
      direction: employee.direction ?? null,
    });
  } catch {
    return res.status(500).json({ error: "Envoi traité, mais historique Telegram non enregistré" });
  }
  if (status !== "success") return res.status(502).json({ error: errorMessage });
  return res.json({ ok: true, message: "Fiche envoyée via Telegram" });
});
export default router;
