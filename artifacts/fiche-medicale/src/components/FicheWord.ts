import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, BorderStyle, AlignmentType,
  PageBreak, ShadingType, VerticalAlign, UnderlineType,
  convertInchesToTwip,
} from "docx";
import type { FicheData } from "./FichePDF";

/* ── Border presets ──────────────────────────────────────────────────────── */
const NONE = {
  top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};
const THIN = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left:   { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right:  { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};
const HDR_BORDER = {
  top:    { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  left:   { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  right:  { style: BorderStyle.SINGLE, size: 8, color: "000000" },
};

/* ── Text run helpers ────────────────────────────────────────────────────── */
const B  = (t: string, sz = 20) => new TextRun({ text: t, bold: true,  size: sz, font: "Times New Roman" });
const N  = (t: string, sz = 20) => new TextRun({ text: t,              size: sz, font: "Times New Roman" });
const BU = (t: string, sz = 20) => new TextRun({ text: t, bold: true,  size: sz, font: "Times New Roman", underline: { type: UnderlineType.SINGLE } });

/* ── Paragraph helpers ───────────────────────────────────────────────────── */
function para(
  children: TextRun[],
  opts: { center?: boolean; before?: number; after?: number; left?: number } = {},
): Paragraph {
  return new Paragraph({
    children,
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing:   { before: opts.before ?? 60, after: opts.after ?? 60 },
    indent:    opts.left != null ? { left: opts.left } : undefined,
  });
}

function spacer(before = 120): Paragraph {
  return new Paragraph({ children: [], spacing: { before, after: 0 } });
}

/* ── Info line: "LABEL :   value" ───────────────────────────────────────── */
function infoLine(label: string, value: string): Paragraph {
  return para([
    B(label + "   :   "),
    N(value || ""),
  ], { before: 80, after: 40 });
}

/* ── Section heading: "TITRE :" underlined bold ──────────────────────────── */
function sectionHead(title: string): Paragraph {
  return para([BU(title + " :")], { before: 180, after: 80 });
}

/* ── Table cell helpers ──────────────────────────────────────────────────── */
function thCell(text: string, w: number): TableCell {
  return new TableCell({
    width:         { size: w, type: WidthType.PERCENTAGE },
    borders:       HDR_BORDER,
    shading:       { type: ShadingType.SOLID, color: "DDDDDD", fill: "DDDDDD" },
    verticalAlign: VerticalAlign.CENTER,
    children:      [para([B(text, 18)], { center: true, before: 60, after: 60 })],
  });
}

function tdCell(children: Paragraph[], w: number): TableCell {
  return new TableCell({
    width:         { size: w, type: WidthType.PERCENTAGE },
    borders:       THIN,
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

/* ── Build one fiche ─────────────────────────────────────────────────────── */
function buildFiche(data: FicheData, isFirst: boolean): (Paragraph | Table)[] {
  const {
    employee, antecedents, expertises, visites,
    maladiesChroniques, manualExpertises, corrections,
  } = data;

  const out: (Paragraph | Table)[] = [];

  /* Page break for subsequent fiches */
  if (!isFirst) out.push(new Paragraph({ children: [new PageBreak()] }));

  /* ── TITLE ──────────────────────────────────────────────────────────────── */
  out.push(para(
    [new TextRun({ text: "FICHE TECHNIQUE MEDICALE", bold: true, size: 32, font: "Times New Roman", underline: { type: UnderlineType.SINGLE } })],
    { center: true, before: 0, after: 300 },
  ));

  /* Correction notice (small, discreet) */
  if (corrections && corrections.length > 0) {
    for (const c of corrections) {
      out.push(para(
        [new TextRun({ text: `ℹ  ${c.details} (${c.method})`, size: 15, color: "2060A0", font: "Times New Roman" })],
        { before: 0, after: 60 },
      ));
    }
  }

  /* ── EMPLOYEE INFO ──────────────────────────────────────────────────────── */
  const fullName = [employee.nom, employee.prenom].filter(Boolean).join(" ");
  out.push(infoLine("Nom & Prénom",              fullName));
  out.push(infoLine("Matricule",                 employee.matricule));
  out.push(infoLine("Age",                       employee.age != null ? `${employee.age} ans` : ""));
  out.push(infoLine("Date d'embauche",           employee.dateEmbauche ?? ""));
  out.push(infoLine("Service",                   employee.service ?? ""));
  out.push(infoLine("Poste de travail actuel",   employee.posteActuel ?? ""));

  /* ── ATCD NOTABLES ─────────────────────────────────────────────────────── */
  out.push(sectionHead("ATCD  NOTABLES"));

  if (antecedents.length > 0) {
    for (const a of antecedents) {
      out.push(para([N(`[${a.type}]  ${a.description}`, 19)], { before: 40, after: 20, left: 200 }));
    }
  }
  if (maladiesChroniques && maladiesChroniques.length > 0) {
    for (const m of maladiesChroniques) {
      const line = `• ${m.description}${m.traitement ? "  —  Traitement : " + m.traitement : ""}${m.dateDebut ? "  (" + m.dateDebut + ")" : ""}`;
      out.push(para([N(line, 19)], { before: 40, after: 20, left: 200 }));
    }
  }
  if (antecedents.length === 0 && (!maladiesChroniques || maladiesChroniques.length === 0)) {
    out.push(para([N("", 19)], { before: 40, after: 120 }));
  } else {
    out.push(spacer(80));
  }

  /* ── ANAMNESE ───────────────────────────────────────────────────────────── */
  out.push(sectionHead("ANAMNESE"));
  out.push(para([N(employee.anamnese ?? "", 19)], { before: 40, after: 120 }));

  /* ── DECISIONS IMPORTANTES ─────────────────────────────────────────────── */
  out.push(sectionHead("DECISIONS IMPORTANTES"));
  out.push(para([N(employee.decisionsImportantes ?? "", 19)], { before: 40, after: 120 }));

  /* ── EXPERTISE ──────────────────────────────────────────────────────────── */
  out.push(sectionHead("EXPERTISE"));

  const EXP_TYPES = ["OPTHALMO", "PSY", "ORL", "VERTIGE"] as const;
  for (const type of EXP_TYPES) {
    const exp = expertises.find((e) => e.typeExpertise === type);
    const detail = exp
      ? [exp.dateExpertise, exp.resultat, exp.notes].filter(Boolean).join("  |  ")
      : "";
    out.push(para(
      [B(type + "   ", 19), N(detail, 19)],
      { before: 60, after: 40, left: 200 },
    ));
  }

  /* manual expertises appended after VERTIGE if any */
  if (manualExpertises && manualExpertises.length > 0) {
    for (const e of manualExpertises) {
      out.push(para(
        [B(e.typeExpertise + "   ", 19), N([e.dateExpertise, e.resultat].filter(Boolean).join("  |  "), 19)],
        { before: 40, after: 40, left: 200 },
      ));
    }
  }

  out.push(spacer(160));

  /* ── VISITS TABLE ───────────────────────────────────────────────────────── */
  // 3 columns exactly as the template: Date | Examens cliniques | Observations
  // Observations = décision + orientation + radio + bilan + recommandations
  const MIN_ROWS = 50;
  const empties  = Math.max(0, MIN_ROWS - visites.length);

  out.push(new Table({
    width:   { size: 100, type: WidthType.PERCENTAGE },
    borders: NONE,
    rows:    [
      /* header row */
      new TableRow({
        tableHeader: true,
        children: [
          thCell("Date des visites",                       20),
          thCell("Examens cliniques et/ou explorations",   48),
          thCell("Observations",                           32),
        ],
      }),

      /* data rows */
      ...visites.map((v) => {
        /* Build Observations cell content */
        const obsLines: Paragraph[] = [];

        if (v.decisionAptitude) {
          obsLines.push(para([B(v.decisionAptitude, 17)], { before: 40, after: 20, left: 60 }));
        }
        const orient = v.orientationSoins ?? v.orientation ?? "";
        if (orient) {
          obsLines.push(para([N(orient, 17)], { before: 20, after: 20, left: 60 }));
        }
        if (v.examenRadio) {
          obsLines.push(para([B("Radio : ", 16), N(v.examenRadio, 16)], { before: 20, after: 20, left: 60 }));
        }
        if (v.bilan) {
          obsLines.push(para([B("Bilan : ", 16), N(v.bilan, 16)], { before: 20, after: 20, left: 60 }));
        }
        if (v.recommandations) {
          obsLines.push(para([N(v.recommandations, 16)], { before: 20, after: 40, left: 60 }));
        }
        if (obsLines.length === 0) {
          obsLines.push(para([N(" ", 17)], {}));
        }

        return new TableRow({
          height: { value: 560, rule: "atLeast" },
          children: [
            tdCell([para([B(v.dateVisite, 17)], { before: 40, after: 20, left: 60 }),
                    para([N(v.typeVisite ?? v.motif ?? "", 16)], { before: 0, after: 40, left: 60 })], 20),
            tdCell([para([N(v.examensCliniques ?? "", 17)], { before: 40, after: 40, left: 60 })], 48),
            tdCell(obsLines, 32),
          ],
        });
      }),

      /* empty rows */
      ...Array.from({ length: empties }, () =>
        new TableRow({
          height: { value: 480, rule: "atLeast" },
          children: [
            tdCell([para([N(" ", 17)], {})], 20),
            tdCell([para([N(" ", 17)], {})], 48),
            tdCell([para([N(" ", 17)], {})], 32),
          ],
        }),
      ),
    ],
  }));

  return out;
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function generateWordBlob(fiches: FicheData[]): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];
  fiches.forEach((f, i) => children.push(...buildFiche(f, i === 0)));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Times New Roman", size: 20 } } } },
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1.0),
            bottom: convertInchesToTwip(1.0),
            left:   convertInchesToTwip(1.2),
            right:  convertInchesToTwip(1.0),
          },
        },
      },
      children,
    }],
  });

  return Packer.toBlob(doc);
}
