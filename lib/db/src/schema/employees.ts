import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const antecedentTypeEnum = pgEnum("antecedent_type", [
  "PATHOLOGIQUE",
  "PROFESSIONNEL",
  "CHIRURGICAL",
  "ALLERGIQUE",
  "AUTRE",
]);

export const restrictionTypeEnum = pgEnum("restriction_type", [
  "DEFINITIVE",
  "TEMPORAIRE",
]);

export const expertiseTypeEnum = pgEnum("expertise_type", [
  "OPTHALMO",
  "PSY",
  "ORL",
  "VERTIGE",
  "AUTRE",
]);

export const aptitudeEnum = pgEnum("aptitude_decision", [
  "APTE",
  "INAPTE",
  "APTE_SOUS_RESERVE",
]);

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  matricule: text("matricule").notNull().unique(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  dateNaissance: text("date_naissance"),
  dateEmbauche: text("date_embauche"),
  direction: text("direction"),
  service: text("service"),
  posteActuel: text("poste_actuel"),
  anamnese: text("anamnese"),
  decisionsImportantes: text("decisions_importantes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const antecedentsTable = pgTable("antecedents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  type: antecedentTypeEnum("type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const restrictionsTable = pgTable("restrictions_medicales", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  typeRestriction: restrictionTypeEnum("type_restriction").notNull(),
  motifMedical: text("motif_medical").notNull(),
  dateDebut: text("date_debut"),
  dateFin: text("date_fin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expertisesTable = pgTable("expertises", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  typeExpertise: expertiseTypeEnum("type_expertise").notNull(),
  dateExpertise: text("date_expertise"),
  resultat: text("resultat"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visitesTable = pgTable("visites_medicales", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  dateVisite: text("date_visite").notNull(),
  typeVisite: text("type_visite"),
  examensCliniques: text("examens_cliniques"),
  observations: text("observations"),
  recommandations: text("recommandations"),
  decisionAptitude: aptitudeEnum("decision_aptitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const visitesHygieneTable = pgTable("visites_hygiene", {
  id: serial("id").primaryKey(),
  dateVisite: text("date_visite").notNull(),
  direction: text("direction").notNull(),
  site: text("site").notNull(),
  data: text("data").notNull(),
  scoreGlobal: integer("score_global"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAntecedentSchema = createInsertSchema(antecedentsTable).omit({ id: true, createdAt: true });
export const insertRestrictionSchema = createInsertSchema(restrictionsTable).omit({ id: true, createdAt: true });
export const insertExpertiseSchema = createInsertSchema(expertisesTable).omit({ id: true, createdAt: true });
export const insertVisiteSchema = createInsertSchema(visitesTable).omit({ id: true, createdAt: true });

export type Employee = typeof employeesTable.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Antecedent = typeof antecedentsTable.$inferSelect;
export type Restriction = typeof restrictionsTable.$inferSelect;
export type Expertise = typeof expertisesTable.$inferSelect;
export type Visite = typeof visitesTable.$inferSelect;
