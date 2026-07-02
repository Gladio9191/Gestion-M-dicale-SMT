import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const telegramSendsTable = pgTable("telegram_sends", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  matricule: integer("matricule").notNull(),
  nomPrenom: text("nom_prenom"),
  direction: text("direction"),
  chatId: text("chat_id").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
});

export const insertTelegramSendSchema = createInsertSchema(telegramSendsTable);
export const selectTelegramSendSchema = createSelectSchema(telegramSendsTable);
