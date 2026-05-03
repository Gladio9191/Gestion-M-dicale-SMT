import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, BorderStyle, AlignmentType,
  PageBreak, ShadingType, VerticalAlign, convertInchesToTwip,
} from "docx";
import type { FicheData } from "./FichePDF";

/* ── Border helpers ──────────────────────────────────────────────────────── */
const NONE = { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };
const THICK = { top: { style: BorderStyle.SINGLE, size: 6, color: "000000" }, bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" }, left: { style: BorderStyle.SINGLE, size: 6, color: "000000" }, right: { style: BorderStyle.SINGLE, size: 6, color: "000000" } };
const THIN = { top: { style: BorderStyle.SINGLE, size: 3, color: "777777" }, bottom: { style: BorderStyle.SINGLE, size: 3, color: "777777" }, left: { style: BorderStyle.SINGLE, size: 3, color: "777777" }, right: { style: BorderStyle.SINGLE, size: 3, color: "777777" } };
const DASHED = { top: { style: BorderStyle.DASHED, size: 3, color: "C8A800" }, bottom: { style: BorderStyle.DASHED, size: 3, color: "C8A800" }, left: { style: BorderStyle.DASHED, size: 3, color: "C8A800" }, right: { style: BorderStyle.DASHED, size: 3, color: "C8A800" } };

/* ── Text helpers ────────────────────────────────────────────────────────── */
const B = (t: string, sz = 18) => new TextRun({ text: t, bold: true, size: sz, font: "Arial" });
const N = (t: string, sz = 18) => new TextRun({ text: t, size: sz, font: "Arial" });
const I = (t: string, sz = 16) => new TextRun({ text: t, italics: true, size: sz, color: "999999", font: "Arial" });

function p(children: TextRun[], opts: { center?: boolean; before?: number; after?: number; left?: number } = {}): Paragraph {
  return new Paragraph({
    children,
    alignment: opts.center ? AlignmentType.CENTER : undefined,
    spacing: { before: opts.before ?? 40, after: opts.after ?? 40 },
    indent: opts.left != null ? { left: opts.left } : undefined,
  });
}

/* ── Cell helpers ────────────────────────────────────────────────────────── */
function lCell(text: string, w: number, shade = "EEEEEE"): TableCell {
  return new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: shade, fill: shade }, borders: THIN, verticalAlign: VerticalAlign.CENTER, children: [p([B(text, 17)], { left: 80 })] });
}
function vCell(text: string, w: number): TableCell {
  return new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.CENTER, children: [p([N(text || "—", 17)], { left: 80 })] });
}
function hCell(text: string, w: number, shade = "D0D0D0"): TableCell {
  return new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: shade, fill: shade }, borders: THICK, verticalAlign: VerticalAlign.CENTER, children: [p([B(text, 17)], { center: true })] });
}

function sectionTitle(title: string, shade = "D5D5D5", textColor = "000000"): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows: [
    new TableRow({ children: [new TableCell({ shading: { type: ShadingType.SOLID, color: shade, fill: shade }, borders: THICK, children: [p([new TextRun({ text: title.toUpperCase(), bold: true, size: 17, color: textColor, font: "Arial" })], { left: 100 })] })] }),
  ]});
}

function spacer(): Paragraph { return new Paragraph({ children: [], spacing: { before: 80, after: 0 } }); }

/* ── Category colours for manual expertises ─────────────────────────────── */
const CAT_STYLE: Record<string, { bg: string; hdr: string; text: string }> = {
  STANDARDS:     { bg: "D6EAF8", hdr: "1a5276", text: "154360" },
  SYSTEMATIQUES: { bg: "E8DAEF", hdr: "6c3483", text: "4a235a" },
  AUTRES_MT:     { bg: "FDEBD0", hdr: "935116", text: "6e3b10" },
  SOINS:         { bg: "D5F5E3", hdr: "1e8449", text: "145a32" },
};
const CAT_LABELS: Record<string, string> = {
  STANDARDS:     "Expertises Standards (Ophtalmo / ORL / Psy)",
  SYSTEMATIQUES: "Expertises Systématiques (Bilans biologiques / radiologiques)",
  AUTRES_MT:     "Autres Expertises MT",
  SOINS:         "Suivi en Soins",
};
const CAT_ORDER = ["STANDARDS", "SYSTEMATIQUES", "AUTRES_MT", "SOINS"] as const;

/* ── Build one fiche ─────────────────────────────────────────────────────── */
function buildFiche(data: FicheData, isFirst: boolean): (Paragraph | Table)[] {
  const { employee, antecedents, expertises, visites, restrictionsMedicales, maladiesChroniques, notes, corrections, manualExpertises } = data;
  const out: (Paragraph | Table)[] = [];

  if (!isFirst) out.push(new Paragraph({ children: [new PageBreak()] }));

  /* Title */
  out.push(p([B("FICHE TECHNIQUE MÉDICALE", 28)], { center: true, before: 0, after: 180 }));

  /* Correction notice */
  if (corrections && corrections.length > 0) {
    for (const c of corrections) {
      out.push(new Paragraph({ children: [new TextRun({ text: `ℹ  ${c.details} (${c.method})`, size: 15, color: "2060A0", font: "Arial" })], spacing: { before: 0, after: 60 }, shading: { type: ShadingType.SOLID, color: "EEF5FF", fill: "EEF5FF" } }));
    }
  }

  /* Employee info */
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows: [
    new TableRow({ children: [lCell("Nom & Prénom", 25), vCell([employee.nom, employee.prenom].filter(Boolean).join(" "), 25), lCell("Matricule", 25), vCell(employee.matricule, 25)] }),
    new TableRow({ children: [lCell("Date de naissance", 25), vCell(employee.dateNaissance ?? "—", 25), lCell("Âge", 25), vCell(employee.age != null ? `${employee.age} ans` : "—", 25)] }),
    new TableRow({ children: [lCell("Date d'embauche", 25), vCell(employee.dateEmbauche ?? "—", 25), lCell("Direction", 25), vCell(employee.direction ?? "—", 25)] }),
    new TableRow({ children: [lCell("Service", 25), vCell(employee.service ?? "—", 25), lCell("Poste actuel", 25), vCell(employee.posteActuel ?? "—", 25)] }),
  ]}));
  out.push(spacer());

  /* ATCD */
  out.push(sectionTitle("ATCD Notables"));
  if (antecedents.length === 0) {
    out.push(p([I("—", 16)], { left: 100 }));
  } else {
    for (const a of antecedents) out.push(p([B(`[${a.type}]  `, 17), N(a.description, 17)], { left: 100 }));
  }
  out.push(spacer());

  /* Maladies Chroniques */
  if (maladiesChroniques && maladiesChroniques.length > 0) {
    out.push(sectionTitle("Maladies Chroniques", "FCE8E8", "880000"));
    for (const m of maladiesChroniques) {
      out.push(p([N(`• ${m.description}${m.traitement ? `  —  Traitement : ${m.traitement}` : ""}${m.dateDebut ? `  (${m.dateDebut})` : ""}`, 17)], { left: 100 }));
    }
    out.push(spacer());
  }

  /* Anamnèse */
  out.push(sectionTitle("Anamnèse"));
  out.push(p(employee.anamnese ? [N(employee.anamnese, 17)] : [I("—", 16)], { left: 100 }));
  out.push(spacer());

  /* Décisions importantes */
  out.push(sectionTitle("Décisions Importantes"));
  out.push(p(employee.decisionsImportantes ? [N(employee.decisionsImportantes, 17)] : [I("—", 16)], { left: 100 }));
  out.push(spacer());

  /* Expertise (DB-linked) */
  out.push(sectionTitle("Expertise"));
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows:
    ["OPTHALMO", "PSY", "ORL", "VERTIGE"].map((type) => {
      const exp = expertises.find((e) => e.typeExpertise === type);
      const result = exp ? [exp.dateExpertise, exp.resultat, exp.notes].filter(Boolean).join("  |  ") : "";
      return new TableRow({ height: { value: 360, rule: "atLeast" }, children: [
        new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: "F0F0F0", fill: "F0F0F0" }, borders: THIN, verticalAlign: VerticalAlign.CENTER, children: [p([B(type, 17)], { left: 80 })] }),
        new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.CENTER, children: [p([N(result, 17)], { left: 80 })] }),
      ]});
    })
  }));
  out.push(spacer());

  /* Manual Expertises (saisie manuelle) */
  if (manualExpertises && manualExpertises.length > 0) {
    out.push(sectionTitle("Expertises Médicales — Résultats Détaillés", "D4E6F1", "1a5276"));
    for (const cat of CAT_ORDER) {
      const items = manualExpertises.filter((e) => e.categorie === cat);
      if (!items.length) continue;
      const cs = CAT_STYLE[cat] ?? { bg: "F0F0F0", hdr: "333333", text: "111111" };
      // Category header
      out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows: [
        new TableRow({ children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: cs.hdr, fill: cs.hdr },
            borders: THICK,
            children: [p([new TextRun({ text: `  ${CAT_LABELS[cat] ?? cat}`, bold: true, size: 17, color: "FFFFFF", font: "Arial" })], {})],
          }),
        ]})
      ]}));
      // Column headers
      out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows: [
        new TableRow({ children: [
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: cs.bg, fill: cs.bg }, borders: THIN, children: [p([B("Date", 16)], { center: true })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: cs.bg, fill: cs.bg }, borders: THIN, children: [p([B("Type d'expertise", 16)], { center: true })] }),
          new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: cs.bg, fill: cs.bg }, borders: THIN, children: [p([B("Résultat / Compte-rendu", 16)], { center: true })] }),
        ]}),
        ...items.map((e) => new TableRow({ height: { value: 480, rule: "atLeast" }, children: [
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([N(e.dateExpertise, 16)], { left: 60 })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([B(e.typeExpertise, 16)], { left: 60 })] }),
          new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p(e.resultat ? [N(e.resultat, 16)] : [I("—", 15)], { left: 60 })] }),
        ]})),
      ]}));
      out.push(spacer());
    }
  }

  /* Restrictions Médicales */
  if (restrictionsMedicales && restrictionsMedicales.length > 0) {
    out.push(sectionTitle("Restrictions Médicales ⚠", "FFEDED", "880000"));
    out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows: [
      new TableRow({ children: [hCell("Restriction", 60, "FFCCCC"), hCell("Début", 20, "FFCCCC"), hCell("Fin", 20, "FFCCCC")] }),
      ...restrictionsMedicales.map((r) => new TableRow({ height: { value: 400, rule: "atLeast" }, children: [
        new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, borders: THIN, children: [p([N(r.description, 17)], { left: 80 })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: THIN, children: [p([N(r.dateDebut ?? "", 16)], { left: 80 })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: THIN, children: [p([N(r.dateFin ?? "", 16)], { left: 80 })] }),
      ]})),
    ]}));
    out.push(spacer());
  }

  /* Visits table */
  out.push(sectionTitle("Historique des Visites Médicales (VM)", "2C3E50", "FFFFFF"));
  out.push(spacer());
  const MIN_ROWS = 12;
  const empties = Math.max(0, MIN_ROWS - visites.length);
  // column widths: Date(11) | Type VM(13) | Examens(25) | Observations(19) | Orient/Radio/Bilan(18) | Décision(14)
  const COL_W = [11, 13, 25, 19, 18, 14] as const;
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows: [
    new TableRow({ tableHeader: true, children: [
      hCell("Date VM",         COL_W[0]),
      hCell("Type de visite",  COL_W[1]),
      hCell("Examens cliniques / Explorations", COL_W[2]),
      hCell("Observations",    COL_W[3]),
      hCell("Orientation / Radio / Bilan", COL_W[4]),
      hCell("Décision médicale", COL_W[5]),
    ]}),
    ...visites.map((v) => {
      const orientDisplay = v.orientationSoins ?? v.orientation ?? "";
      const extraLines: Paragraph[] = [];
      if (v.examenRadio)  extraLines.push(p([B("Radio : ", 14), N(v.examenRadio,  14)], { left: 60 }));
      if (v.bilan)        extraLines.push(p([B("Bilan : ", 14), N(v.bilan,        14)], { left: 60 }));
      if (v.recommandations) extraLines.push(p([I(`↳ ${v.recommandations}`, 13)], { left: 60 }));
      const obsLines: Paragraph[] = [p([N(v.observations ?? "", 15)], { left: 60 })];
      if (v.risque) obsLines.push(p([B("Risque : ", 14), N(v.risque, 14)], { left: 60 }));
      return new TableRow({ height: { value: 520, rule: "atLeast" }, children: [
        new TableCell({ width: { size: COL_W[0], type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([B(v.dateVisite, 15)], { left: 60 })] }),
        new TableCell({ width: { size: COL_W[1], type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([N(v.typeVisite ?? v.motif ?? "", 14)], { left: 60 })] }),
        new TableCell({ width: { size: COL_W[2], type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([N(v.examensCliniques ?? "", 15)], { left: 60 })] }),
        new TableCell({ width: { size: COL_W[3], type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: obsLines }),
        new TableCell({ width: { size: COL_W[4], type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [
          p([N(orientDisplay, 14)], { left: 60 }),
          ...extraLines,
        ]}),
        new TableCell({ width: { size: COL_W[5], type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([B(v.decisionAptitude ?? "", 15)], { left: 60 })] }),
      ]});
    }),
    ...Array.from({ length: empties }, () => new TableRow({ height: { value: 480, rule: "atLeast" }, children: COL_W.map((w) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, borders: THIN, children: [p([N(" ", 16)], {})] })) })),
  ]}));

  /* Notes */
  if (notes && notes.length > 0) {
    out.push(spacer());
    const bySheet = new Map<string, typeof notes>();
    for (const n of notes) { if (!bySheet.has(n.sheet)) bySheet.set(n.sheet, []); bySheet.get(n.sheet)!.push(n); }
    out.push(p([B("⚠  Informations supplémentaires (données non incluses dans la fiche — à vérifier)", 15)]));
    for (const [sheet, entries] of bySheet.entries()) {
      out.push(p([B(`[ Feuille : ${sheet} ]`, 15)], { left: 100 }));
      for (const e of entries) out.push(p([B(`${e.label} : `, 14), N(e.value, 14)], { left: 200 }));
    }
  }

  return out;
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function generateWordBlob(fiches: FicheData[]): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];
  fiches.forEach((f, i) => children.push(...buildFiche(f, i === 0)));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 18 } } } },
    sections: [{
      properties: { page: { margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.9), right: convertInchesToTwip(0.9) } } },
      children,
    }],
  });
  return Packer.toBlob(doc);
}
