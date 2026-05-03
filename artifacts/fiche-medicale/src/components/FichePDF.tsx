import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    color: "#111",
    backgroundColor: "#fff",
  },
  /* ── Header ─────────────────────────────────── */
  headerBox: {
    borderWidth: 1.5,
    borderColor: "#000",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  /* ── Info grid ──────────────────────────────── */
  infoGrid: {
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 7,
  },
  infoRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#555",
  },
  infoRowLast: {
    flexDirection: "row",
  },
  infoLabel: {
    fontFamily: "Helvetica-Bold",
    width: 130,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: "#555",
    fontSize: 8.5,
  },
  infoValue: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8.5,
  },
  /* ── Section ────────────────────────────────── */
  section: {
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#000",
  },
  sectionHeader: {
    backgroundColor: "#e8e8e8",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
  },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionBody: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    minHeight: 28,
  },
  sectionText: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: "#222",
  },
  emptyText: {
    fontSize: 8,
    color: "#aaa",
    fontStyle: "italic",
  },
  /* ── ATCD list ──────────────────────────────── */
  atcdRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  atcdBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    borderWidth: 0.5,
    borderColor: "#555",
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginRight: 6,
    borderRadius: 2,
    color: "#333",
  },
  atcdDesc: {
    fontSize: 8.5,
    flex: 1,
    lineHeight: 1.4,
  },
  /* ── Expertise ──────────────────────────────── */
  expertiseRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  expertiseRowLast: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  expertiseLabel: {
    fontFamily: "Helvetica-Bold",
    width: 72,
    fontSize: 8.5,
  },
  expertiseDate: {
    width: 70,
    fontSize: 8,
    color: "#444",
  },
  expertiseValue: {
    flex: 1,
    fontSize: 8.5,
  },
  /* ── Visits table ───────────────────────────── */
  table: {
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#e8e8e8",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#bbb",
    minHeight: 18,
  },
  tableRowEmpty: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    minHeight: 14,
  },
  tableRowLast: {
    flexDirection: "row",
    minHeight: 18,
  },
  thDate: {
    width: 72,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#555",
    textAlign: "center",
  },
  thExamens: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#555",
    textAlign: "center",
  },
  thObs: {
    width: 120,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 5,
    textAlign: "center",
  },
  tdDate: {
    width: 72,
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#ccc",
  },
  tdExamens: {
    flex: 1,
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderRightWidth: 0.5,
    borderRightColor: "#ccc",
    lineHeight: 1.4,
  },
  tdObs: {
    width: 120,
    fontSize: 8,
    paddingVertical: 3,
    paddingHorizontal: 5,
    lineHeight: 1.4,
  },
  aptitudeBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
    color: "#555",
  },
  /* ── Footer ─────────────────────────────────── */
  footer: {
    position: "absolute",
    bottom: 14,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#aaa",
    paddingTop: 3,
  },
  footerText: {
    fontSize: 7,
    color: "#888",
  },
  pageBreak: {
    marginTop: 0,
  },
});

export type FicheData = {
  employee: {
    matricule: string;
    nom: string;
    prenom: string;
    age?: number | null;
    dateEmbauche?: string | null;
    direction?: string | null;
    service?: string | null;
    posteActuel?: string | null;
    anamnese?: string | null;
    decisionsImportantes?: string | null;
  };
  antecedents: Array<{ type: string; description: string }>;
  restrictions: Array<{ typeRestriction: string; motifMedical: string; dateDebut?: string | null; dateFin?: string | null }>;
  expertises: Array<{ typeExpertise: string; dateExpertise?: string | null; resultat?: string | null; notes?: string | null }>;
  visites: Array<{ dateVisite: string; typeVisite?: string | null; examensCliniques?: string | null; observations?: string | null; recommandations?: string | null; decisionAptitude?: string | null }>;
};

const EXPERTISE_TYPES = ["OPTHALMO", "PSY", "ORL", "VERTIGE"] as const;

const APTITUDE_LABELS: Record<string, string> = {
  APTE: "APTE",
  INAPTE: "INAPTE",
  APTE_SOUS_RESERVE: "APTE SOUS RÉSERVE",
};

function SingleFiche({ data, pageIndex }: { data: FicheData; pageIndex: number }) {
  const { employee, antecedents, expertises, visites } = data;

  const getExpertise = (type: string) =>
    expertises.find((e) => e.typeExpertise === type);

  // Fill empty rows so table has at least 12 rows
  const MIN_ROWS = 12;
  const emptyRowCount = Math.max(0, MIN_ROWS - visites.length);

  return (
    <Page size="A4" style={[S.page, pageIndex > 0 ? S.pageBreak : {}]}>
      {/* Header */}
      <View style={S.headerBox}>
        <Text style={S.headerTitle}>Fiche Technique Médicale</Text>
      </View>

      {/* Employee info */}
      <View style={S.infoGrid}>
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Nom &amp; Prénom</Text>
          <Text style={S.infoValue}>{employee.nom} {employee.prenom}</Text>
          <Text style={[S.infoLabel, { borderLeftWidth: 0.5, borderLeftColor: "#555" }]}>Matricule</Text>
          <Text style={S.infoValue}>{employee.matricule}</Text>
        </View>
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Âge</Text>
          <Text style={S.infoValue}>{employee.age != null ? `${employee.age} ans` : "—"}</Text>
          <Text style={[S.infoLabel, { borderLeftWidth: 0.5, borderLeftColor: "#555" }]}>Date d'embauche</Text>
          <Text style={S.infoValue}>{employee.dateEmbauche ?? "—"}</Text>
        </View>
        <View style={S.infoRow}>
          <Text style={S.infoLabel}>Direction</Text>
          <Text style={S.infoValue}>{employee.direction ?? "—"}</Text>
          <Text style={[S.infoLabel, { borderLeftWidth: 0.5, borderLeftColor: "#555" }]}>Service</Text>
          <Text style={S.infoValue}>{employee.service ?? "—"}</Text>
        </View>
        <View style={S.infoRowLast}>
          <Text style={S.infoLabel}>Poste de travail actuel</Text>
          <Text style={S.infoValue}>{employee.posteActuel ?? "—"}</Text>
        </View>
      </View>

      {/* ATCD NOTABLES */}
      <View style={S.section}>
        <View style={S.sectionHeader}>
          <Text style={S.sectionLabel}>ATCD Notables</Text>
        </View>
        <View style={S.sectionBody}>
          {antecedents.length === 0 ? (
            <Text style={S.emptyText}>Aucun antécédent notable</Text>
          ) : (
            antecedents.map((a, i) => (
              <View key={i} style={S.atcdRow}>
                <Text style={S.atcdBadge}>{a.type}</Text>
                <Text style={S.atcdDesc}>{a.description}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* ANAMNESE */}
      <View style={S.section}>
        <View style={S.sectionHeader}>
          <Text style={S.sectionLabel}>Anamnèse</Text>
        </View>
        <View style={S.sectionBody}>
          <Text style={employee.anamnese ? S.sectionText : S.emptyText}>
            {employee.anamnese ?? "—"}
          </Text>
        </View>
      </View>

      {/* DECISIONS IMPORTANTES */}
      <View style={S.section}>
        <View style={S.sectionHeader}>
          <Text style={S.sectionLabel}>Décisions Importantes</Text>
        </View>
        <View style={S.sectionBody}>
          <Text style={employee.decisionsImportantes ? S.sectionText : S.emptyText}>
            {employee.decisionsImportantes ?? "—"}
          </Text>
        </View>
      </View>

      {/* EXPERTISE */}
      <View style={S.section}>
        <View style={S.sectionHeader}>
          <Text style={S.sectionLabel}>Expertise</Text>
        </View>
        {EXPERTISE_TYPES.map((type, i) => {
          const exp = getExpertise(type);
          const isLast = i === EXPERTISE_TYPES.length - 1;
          return (
            <View key={type} style={isLast ? S.expertiseRowLast : S.expertiseRow}>
              <Text style={S.expertiseLabel}>{type}</Text>
              <Text style={S.expertiseDate}>{exp?.dateExpertise ?? ""}</Text>
              <Text style={S.expertiseValue}>
                {exp ? [exp.resultat, exp.notes].filter(Boolean).join(" — ") : "—"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* VISITS TABLE */}
      <View style={S.table}>
        <View style={S.tableHeaderRow}>
          <Text style={S.thDate}>Date des visites</Text>
          <Text style={S.thExamens}>Examens cliniques et/ou explorations</Text>
          <Text style={S.thObs}>Observations</Text>
        </View>
        {visites.map((v, i) => {
          const isLast = i === visites.length - 1 && emptyRowCount === 0;
          return (
            <View key={i} style={isLast ? S.tableRowLast : S.tableRow}>
              <View style={S.tdDate}>
                <Text>{v.dateVisite}</Text>
                {v.decisionAptitude && (
                  <Text style={S.aptitudeBadge}>{APTITUDE_LABELS[v.decisionAptitude] ?? v.decisionAptitude}</Text>
                )}
              </View>
              <Text style={S.tdExamens}>{v.examensCliniques ?? ""}</Text>
              <Text style={S.tdObs}>{v.observations ?? ""}</Text>
            </View>
          );
        })}
        {Array.from({ length: emptyRowCount }).map((_, i) => {
          const isLast = i === emptyRowCount - 1;
          return (
            <View key={`empty-${i}`} style={isLast ? S.tableRowLast : S.tableRowEmpty}>
              <Text style={S.tdDate}> </Text>
              <Text style={S.tdExamens}> </Text>
              <Text style={S.tdObs}> </Text>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={S.footer} fixed>
        <Text style={S.footerText}>Médecine du Travail — Confidentiel</Text>
        <Text style={S.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

export function FicheDocument({ fiches }: { fiches: FicheData[] }) {
  return (
    <Document
      title="Fiches Techniques Médicales"
      author="Médecine du Travail"
      creator="Médecine du Travail"
    >
      {fiches.map((data, i) => (
        <SingleFiche key={data.employee.matricule} data={data} pageIndex={i} />
      ))}
    </Document>
  );
}
