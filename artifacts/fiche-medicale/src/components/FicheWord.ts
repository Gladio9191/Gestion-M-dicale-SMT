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

/* ── Build one fiche ─────────────────────────────────────────────────────── */
function buildFiche(data: FicheData, isFirst: boolean): (Paragraph | Table)[] {
  const { employee, antecedents, expertises, visites, restrictionsMedicales, maladiesChroniques, notes, corrections } = data;
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

  /* Expertise */
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
  const MIN_ROWS = 12;
  const empties = Math.max(0, MIN_ROWS - visites.length);
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NONE, rows: [
    new TableRow({ tableHeader: true, children: [
      hCell("Date\n& Décision", 14),
      hCell("Motif", 16),
      hCell("Examens cliniques et/ou explorations", 34),
      hCell("Observations & Orientation", 22),
      hCell("Décision médicale", 14),
    ]}),
    ...visites.map((v) => new TableRow({ height: { value: 480, rule: "atLeast" }, children: [
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([N(v.dateVisite, 16)], { left: 60 })] }),
      new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([N(v.motif ?? "", 16)], { left: 60 })] }),
      new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([N(v.examensCliniques ?? "", 16)], { left: 60 })] }),
      new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [
        p([N(v.observations ?? "", 16)], { left: 60 }),
        ...(v.orientation ? [p([I(`↳ ${v.orientation}`, 14)], { left: 60 })] : []),
        ...(v.recommandations ? [p([I(v.recommandations, 14)], { left: 60 })] : []),
      ]}),
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: THIN, verticalAlign: VerticalAlign.TOP, children: [p([B(v.decisionAptitude ?? "", 15)], { left: 60 })] }),
    ]})),
    ...Array.from({ length: empties }, () => new TableRow({ height: { value: 480, rule: "atLeast" }, children: [14, 16, 34, 22, 14].map((w) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, borders: THIN, children: [p([N(" ", 16)], {})] })) })),
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
