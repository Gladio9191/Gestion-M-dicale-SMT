import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, paddingTop: 26, paddingBottom: 32, paddingHorizontal: 30, color: "#111", backgroundColor: "#fff" },
  headerBox: { borderWidth: 1.5, borderColor: "#000", paddingVertical: 5, paddingHorizontal: 8, marginBottom: 7, alignItems: "center" },
  headerTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" },
  infoGrid: { borderWidth: 1, borderColor: "#000", marginBottom: 6 },
  infoRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#555" },
  infoRowLast: { flexDirection: "row" },
  infoLabel: { fontFamily: "Helvetica-Bold", width: 120, paddingVertical: 3, paddingHorizontal: 5, borderRightWidth: 0.5, borderRightColor: "#555", fontSize: 8 },
  infoValue: { flex: 1, paddingVertical: 3, paddingHorizontal: 5, fontSize: 8 },
  infoSep: { borderLeftWidth: 0.5, borderLeftColor: "#555" },
  section: { marginBottom: 5, borderWidth: 1, borderColor: "#000" },
  sectionHeader: { backgroundColor: "#e0e0e0", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#000" },
  sectionLabel: { fontFamily: "Helvetica-Bold", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  sectionBody: { paddingVertical: 4, paddingHorizontal: 7, minHeight: 18 },
  sectionText: { fontSize: 8, lineHeight: 1.5, color: "#222" },
  emptyText: { fontSize: 7.5, color: "#bbb", fontStyle: "italic" },
  atcdRow: { flexDirection: "row", marginBottom: 2 },
  atcdBadge: { fontSize: 7, fontFamily: "Helvetica-Bold", borderWidth: 0.5, borderColor: "#555", paddingHorizontal: 3, paddingVertical: 1, marginRight: 5, borderRadius: 2 },
  atcdDesc: { fontSize: 8, flex: 1, lineHeight: 1.4 },
  expertiseRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 3, paddingHorizontal: 7 },
  expertiseRowLast: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 7 },
  expertiseLabel: { fontFamily: "Helvetica-Bold", width: 68, fontSize: 8 },
  expertiseDate: { width: 65, fontSize: 7.5, color: "#555" },
  expertiseValue: { flex: 1, fontSize: 8 },
  // Restrictions & Maladies
  listRow: { flexDirection: "row", paddingVertical: 2, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  listRowLast: { flexDirection: "row", paddingVertical: 2, paddingHorizontal: 7 },
  listBullet: { width: 10, fontSize: 8, color: "#555" },
  listText: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  listMeta: { width: 80, fontSize: 7.5, color: "#666" },
  // Visits table
  table: { borderWidth: 1, borderColor: "#000", marginBottom: 5 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#e0e0e0", borderBottomWidth: 1, borderBottomColor: "#000" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", minHeight: 18 },
  tableRowEmpty: { flexDirection: "row", borderBottomWidth: 0.3, borderBottomColor: "#e5e5e5", minHeight: 12 },
  tableRowLast: { flexDirection: "row", minHeight: 18 },
  thDate: { width: 65, fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#555", textAlign: "center" },
  thMotif: { width: 70, fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#555", textAlign: "center" },
  thExamens: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#555", textAlign: "center" },
  thObs: { width: 100, fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 4, textAlign: "center" },
  tdDate: { width: 65, fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#ddd" },
  tdMotif: { width: 70, fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#ddd", lineHeight: 1.3 },
  tdExamens: { flex: 1, fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#ddd", lineHeight: 1.4 },
  tdObs: { width: 100, fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 4, lineHeight: 1.4 },
  decisionBadge: { fontSize: 6.5, fontFamily: "Helvetica-Bold", marginTop: 1, color: "#444" },
  orientBadge: { fontSize: 6, color: "#666", marginTop: 1 },
  // Notes
  notesBox: { marginBottom: 5, borderWidth: 1, borderColor: "#c8a800", borderStyle: "dashed" },
  notesHeader: { backgroundColor: "#fffbdd", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#c8a800" },
  notesHeaderLabel: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#7a6000", textTransform: "uppercase" },
  notesBody: { paddingVertical: 4, paddingHorizontal: 7 },
  notesSheetLabel: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#7a6000", marginBottom: 2, marginTop: 2 },
  noteRow: { flexDirection: "row", marginBottom: 1.5, paddingLeft: 8 },
  noteKey: { fontFamily: "Helvetica-Bold", fontSize: 7, color: "#555", width: 100 },
  noteVal: { fontSize: 7, color: "#333", flex: 1 },
  // Correction
  corrBox: { marginBottom: 5, borderWidth: 0.5, borderColor: "#4a90d9", backgroundColor: "#f0f7ff", paddingVertical: 3, paddingHorizontal: 7 },
  corrText: { fontSize: 7, color: "#2060a0" },
  footer: { position: "absolute", bottom: 12, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#aaa", paddingTop: 3 },
  footerText: { fontSize: 6.5, color: "#888" },
});

/* ── Types ─────────────────────────────────────────────────────────────────── */
export type NoteEntry = { sheet: string; label: string; value: string };
export type RestrictionEntry = { description: string; dateDebut?: string | null; dateFin?: string | null; source?: string };
export type MaladieEntry = { description: string; traitement?: string | null; dateDebut?: string | null; source?: string };

export type FicheData = {
  employee: {
    matricule: string; nom: string; prenom: string;
    age?: number | null;
    dateNaissance?: string | null;
    dateEmbauche?: string | null;
    direction?: string | null; service?: string | null; posteActuel?: string | null;
    anamnese?: string | null; decisionsImportantes?: string | null;
  };
  antecedents: Array<{ type: string; description: string }>;
  restrictions: Array<{ typeRestriction: string; motifMedical: string; dateDebut?: string | null; dateFin?: string | null }>;
  expertises: Array<{ typeExpertise: string; dateExpertise?: string | null; resultat?: string | null; notes?: string | null }>;
  visites: Array<{
    dateVisite: string; typeVisite?: string | null;
    risque?: string | null;
    motif?: string | null;
    examensCliniques?: string | null; observations?: string | null;
    orientation?: string | null;       // from Excel import
    orientationSoins?: string | null;  // from DB
    examenRadio?: string | null;
    bilan?: string | null;
    recommandations?: string | null; decisionAptitude?: string | null;
  }>;
  restrictionsMedicales?: RestrictionEntry[];
  maladiesChroniques?: MaladieEntry[];
  notes?: NoteEntry[];
  corrections?: Array<{ matricule: string; method: string; details: string }>;
  manualExpertises?: Array<{ categorie: string; typeExpertise: string; resultat: string | null; dateExpertise: string }>;
};

const EXPERTISE_TYPES = ["OPTHALMO", "PSY", "ORL", "VERTIGE"] as const;
const APTITUDE_LABELS: Record<string, string> = {
  APTE: "APTE", INAPTE: "INAPTE", APTE_SOUS_RESERVE: "APTE SOUS RÉSERVE",
};

/* ── Single fiche page ─────────────────────────────────────────────────────── */
function SingleFiche({ data }: { data: FicheData }) {
  const { employee, antecedents, expertises, visites, restrictionsMedicales, maladiesChroniques, notes, corrections } = data;
  const getExp = (t: string) => expertises.find((e) => e.typeExpertise === t);
  const MIN_ROWS = 10;
  const emptyCount = Math.max(0, MIN_ROWS - visites.length);

  const notesBySheet = new Map<string, NoteEntry[]>();
  for (const n of notes ?? []) {
    if (!notesBySheet.has(n.sheet)) notesBySheet.set(n.sheet, []);
    notesBySheet.get(n.sheet)!.push(n);
  }

  return (
    <Page size="A4" style={S.page}>
      {/* Header */}
      <View style={S.headerBox}>
        <Text style={S.headerTitle}>Fiche Technique Médicale</Text>
      </View>

      {/* Correction notice */}
      {corrections && corrections.length > 0 && (
        <View style={S.corrBox}>
          {corrections.map((c, i) => (
            <Text key={i} style={S.corrText}>ℹ  {c.details} ({c.method})</Text>
          ))}
        </View>
      )}

      {/* Employee info */}
      <View style={S.infoGrid}>
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Nom &amp; Prénom</Text>
          <Text style={S.infoValue}>{[employee.nom, employee.prenom].filter(Boolean).join(" ") || "—"}</Text>
          <Text style={[S.infoLabel, S.infoSep]}>Matricule</Text>
          <Text style={S.infoValue}>{employee.matricule}</Text>
        </View>
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Date de naissance</Text>
          <Text style={S.infoValue}>{employee.dateNaissance ?? "—"}</Text>
          <Text style={[S.infoLabel, S.infoSep]}>Âge</Text>
          <Text style={S.infoValue}>{employee.age != null ? `${employee.age} ans` : "—"}</Text>
        </View>
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Date d'embauche</Text>
          <Text style={S.infoValue}>{employee.dateEmbauche ?? "—"}</Text>
          <Text style={[S.infoLabel, S.infoSep]}>Direction</Text>
          <Text style={S.infoValue}>{employee.direction ?? "—"}</Text>
        </View>
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Service</Text>
          <Text style={S.infoValue}>{employee.service ?? "—"}</Text>
          <Text style={[S.infoLabel, S.infoSep]}>Poste actuel</Text>
          <Text style={S.infoValue}>{employee.posteActuel ?? "—"}</Text>
        </View>
      </View>

      {/* ATCD */}
      <View style={S.section}>
        <View style={S.sectionHeader}><Text style={S.sectionLabel}>ATCD Notables</Text></View>
        <View style={S.sectionBody}>
          {antecedents.length === 0 ? <Text style={S.emptyText}>—</Text> : antecedents.map((a, i) => (
            <View key={i} style={S.atcdRow}><Text style={S.atcdBadge}>{a.type}</Text><Text style={S.atcdDesc}>{a.description}</Text></View>
          ))}
        </View>
      </View>

      {/* Maladies Chroniques */}
      {maladiesChroniques && maladiesChroniques.length > 0 && (
        <View style={S.section}>
          <View style={S.sectionHeader}><Text style={S.sectionLabel}>Maladies Chroniques</Text></View>
          {maladiesChroniques.map((m, i) => {
            const isLast = i === maladiesChroniques.length - 1;
            return (
              <View key={i} style={isLast ? S.listRowLast : S.listRow}>
                <Text style={S.listBullet}>•</Text>
                <Text style={S.listText}>{m.description}{m.traitement ? ` — Traitement : ${m.traitement}` : ""}</Text>
                <Text style={S.listMeta}>{m.dateDebut ?? ""}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Anamnèse */}
      <View style={S.section}>
        <View style={S.sectionHeader}><Text style={S.sectionLabel}>Anamnèse</Text></View>
        <View style={S.sectionBody}><Text style={employee.anamnese ? S.sectionText : S.emptyText}>{employee.anamnese ?? "—"}</Text></View>
      </View>

      {/* Décisions importantes */}
      <View style={S.section}>
        <View style={S.sectionHeader}><Text style={S.sectionLabel}>Décisions Importantes</Text></View>
        <View style={S.sectionBody}><Text style={employee.decisionsImportantes ? S.sectionText : S.emptyText}>{employee.decisionsImportantes ?? "—"}</Text></View>
      </View>

      {/* Expertise */}
      <View style={S.section}>
        <View style={S.sectionHeader}><Text style={S.sectionLabel}>Expertise</Text></View>
        {EXPERTISE_TYPES.map((type, i) => {
          const exp = getExp(type);
          const isLast = i === EXPERTISE_TYPES.length - 1;
          return (
            <View key={type} style={isLast ? S.expertiseRowLast : S.expertiseRow}>
              <Text style={S.expertiseLabel}>{type}</Text>
              <Text style={S.expertiseDate}>{exp?.dateExpertise ?? ""}</Text>
              <Text style={S.expertiseValue}>{exp ? [exp.resultat, exp.notes].filter(Boolean).join(" — ") : "—"}</Text>
            </View>
          );
        })}
      </View>

      {/* Restrictions Médicales */}
      {restrictionsMedicales && restrictionsMedicales.length > 0 && (
        <View style={S.section}>
          <View style={[S.sectionHeader, { backgroundColor: "#fde8e8" }]}><Text style={[S.sectionLabel, { color: "#900" }]}>Restrictions Médicales</Text></View>
          {restrictionsMedicales.map((r, i) => {
            const isLast = i === restrictionsMedicales.length - 1;
            const period = [r.dateDebut, r.dateFin].filter(Boolean).join(" → ");
            return (
              <View key={i} style={isLast ? S.listRowLast : S.listRow}>
                <Text style={S.listBullet}>⚠</Text>
                <Text style={S.listText}>{r.description}</Text>
                <Text style={S.listMeta}>{period}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Visits table */}
      <View style={S.table}>
        <View style={S.tableHeaderRow}>
          <Text style={S.thDate}>Date{"\n"}Décision</Text>
          <Text style={S.thMotif}>Motif</Text>
          <Text style={S.thExamens}>Examens cliniques et/ou explorations</Text>
          <Text style={S.thObs}>Observations & Orientation</Text>
        </View>
        {visites.map((v, i) => {
          const isLast = i === visites.length - 1 && emptyCount === 0;
          return (
            <View key={i} style={isLast ? S.tableRowLast : S.tableRow}>
              <View style={S.tdDate}>
                <Text>{v.dateVisite}</Text>
                {v.decisionAptitude && <Text style={S.decisionBadge}>{APTITUDE_LABELS[v.decisionAptitude] ?? v.decisionAptitude}</Text>}
              </View>
              <Text style={S.tdMotif}>{v.motif ?? ""}</Text>
              <Text style={S.tdExamens}>{v.examensCliniques ?? ""}</Text>
              <View style={S.tdObs}>
                <Text>{v.observations ?? ""}</Text>
                {v.orientation && <Text style={S.orientBadge}>↳ {v.orientation}</Text>}
                {v.recommandations && <Text style={S.orientBadge}>{v.recommandations}</Text>}
              </View>
            </View>
          );
        })}
        {Array.from({ length: emptyCount }).map((_, i) => {
          const isLast = i === emptyCount - 1;
          return (
            <View key={`e-${i}`} style={isLast ? S.tableRowLast : S.tableRowEmpty}>
              <Text style={S.tdDate}> </Text>
              <Text style={S.tdMotif}> </Text>
              <Text style={S.tdExamens}> </Text>
              <Text style={S.tdObs}> </Text>
            </View>
          );
        })}
      </View>

      {/* Notes */}
      {notesBySheet.size > 0 && (
        <View style={S.notesBox}>
          <View style={S.notesHeader}><Text style={S.notesHeaderLabel}>⚠ Informations supplémentaires (à vérifier)</Text></View>
          <View style={S.notesBody}>
            {Array.from(notesBySheet.entries()).map(([sheet, entries]) => (
              <View key={sheet}>
                <Text style={S.notesSheetLabel}>[ {sheet} ]</Text>
                {entries.map((n, i) => (
                  <View key={i} style={S.noteRow}><Text style={S.noteKey}>{n.label} :</Text><Text style={S.noteVal}>{n.value}</Text></View>
                ))}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={S.footer} fixed>
        <Text style={S.footerText}>Médecine du Travail — Confidentiel</Text>
        <Text style={S.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

export function FicheDocument({ fiches }: { fiches: FicheData[] }) {
  return (
    <Document title="Fiches Techniques Médicales" author="Médecine du Travail" creator="Médecine du Travail">
      {fiches.map((d) => <SingleFiche key={d.employee.matricule} data={d} />)}
    </Document>
  );
}
