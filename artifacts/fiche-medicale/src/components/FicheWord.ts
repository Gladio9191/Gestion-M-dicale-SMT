import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  ShadingType,
  VerticalAlign,
  PageOrientation,
  convertInchesToTwip,
} from "docx";
import type { FicheData } from "./FichePDF";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const BORDER_NONE = {
  top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

const BORDER_THIN = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left:   { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right:  { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

const BORDER_THIN_INNER = {
  top:    { style: BorderStyle.SINGLE, size: 2, color: "888888" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "888888" },
  left:   { style: BorderStyle.SINGLE, size: 2, color: "888888" },
  right:  { style: BorderStyle.SINGLE, size: 2, color: "888888" },
};

function bold(text: string, size = 18): TextRun {
  return new TextRun({ text, bold: true, size, font: "Arial" });
}
function normal(text: string, size = 18): TextRun {
  return new TextRun({ text, size, font: "Arial" });
}
function italic(text: string, size = 16): TextRun {
  return new TextRun({ text, italics: true, size, color: "999999", font: "Arial" });
}

function labelCell(text: string, widthPct: number = 25): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, color: "EEEEEE", fill: "EEEEEE" },
    borders: BORDER_THIN_INNER,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [bold(text, 17)],
        spacing: { before: 40, after: 40 },
        indent: { left: 80 },
      }),
    ],
  });
}

function valueCell(text: string, widthPct: number = 25): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: BORDER_THIN_INNER,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [normal(text || "—", 17)],
        spacing: { before: 40, after: 40 },
        indent: { left: 80 },
      }),
    ],
  });
}

function sectionHeader(title: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.SOLID, color: "D0D0D0", fill: "D0D0D0" },
            borders: BORDER_THIN,
            children: [
              new Paragraph({
                children: [bold(title.toUpperCase(), 17)],
                spacing: { before: 50, after: 50 },
                indent: { left: 100 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function sectionContentPara(text: string | null | undefined): Paragraph {
  return new Paragraph({
    children: text ? [normal(text, 17)] : [italic("—", 16)],
    spacing: { before: 60, after: 80 },
    indent: { left: 100 },
  });
}

function emptyRow(colCount: number, minHeight = 400): TableRow {
  return new TableRow({
    height: { value: minHeight, rule: "atLeast" },
    children: Array.from({ length: colCount }, () =>
      new TableCell({
        borders: BORDER_THIN_INNER,
        children: [new Paragraph({ children: [normal(" ", 16)] })],
      })
    ),
  });
}

/* ── Single fiche builder ────────────────────────────────────────────────── */
function buildFicheSections(data: FicheData, isFirst: boolean): (Paragraph | Table)[] {
  const { employee, antecedents, expertises, visites, notes } = data;
  const sections: (Paragraph | Table)[] = [];

  // Page break between fiches (except first)
  if (!isFirst) {
    sections.push(new Paragraph({ children: [new PageBreak()] }));
  }

  /* ── Title ─────────────────────────────────────────────────────────────── */
  sections.push(
    new Paragraph({
      children: [bold("FICHE TECHNIQUE MÉDICALE", 28)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
    })
  );

  /* ── Employee info table ────────────────────────────────────────────────── */
  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            labelCell("Nom & Prénom", 25),
            valueCell([employee.nom, employee.prenom].filter(Boolean).join(" "), 25),
            labelCell("Matricule", 25),
            valueCell(employee.matricule, 25),
          ],
        }),
        new TableRow({
          children: [
            labelCell("Âge", 25),
            valueCell(employee.age != null ? `${employee.age} ans` : "—", 25),
            labelCell("Date d'embauche", 25),
            valueCell(employee.dateEmbauche ?? "—", 25),
          ],
        }),
        new TableRow({
          children: [
            labelCell("Direction", 25),
            valueCell(employee.direction ?? "—", 25),
            labelCell("Service", 25),
            valueCell(employee.service ?? "—", 25),
          ],
        }),
        new TableRow({
          children: [
            labelCell("Poste de travail actuel", 25),
            valueCell(employee.posteActuel ?? "—", 75),
          ],
        }),
      ],
    })
  );

  sections.push(new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }));

  /* ── ATCD NOTABLES ──────────────────────────────────────────────────────── */
  sections.push(sectionHeader("ATCD Notables"));
  if (antecedents.length === 0) {
    sections.push(sectionContentPara(null));
  } else {
    for (const a of antecedents) {
      sections.push(
        new Paragraph({
          children: [bold(`[${a.type}]  `, 17), normal(a.description, 17)],
          spacing: { before: 40, after: 40 },
          indent: { left: 100 },
        })
      );
    }
    sections.push(new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }));
  }

  /* ── ANAMNESE ───────────────────────────────────────────────────────────── */
  sections.push(sectionHeader("Anamnèse"));
  sections.push(sectionContentPara(employee.anamnese));

  /* ── DECISIONS IMPORTANTES ──────────────────────────────────────────────── */
  sections.push(sectionHeader("Décisions Importantes"));
  sections.push(sectionContentPara(employee.decisionsImportantes));

  /* ── EXPERTISE ──────────────────────────────────────────────────────────── */
  sections.push(sectionHeader("Expertise"));
  const expertiseTypes = ["OPTHALMO", "PSY", "ORL", "VERTIGE"];
  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: expertiseTypes.map((type) => {
        const exp = expertises.find((e) => e.typeExpertise === type);
        const result = exp
          ? [exp.dateExpertise, exp.resultat, exp.notes].filter(Boolean).join("  |  ")
          : "";
        return new TableRow({
          height: { value: 350, rule: "atLeast" },
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: "F0F0F0", fill: "F0F0F0" },
              borders: BORDER_THIN_INNER,
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({ children: [bold(type, 17)], indent: { left: 80 }, spacing: { before: 40, after: 40 } })],
            }),
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              borders: BORDER_THIN_INNER,
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({ children: [normal(result, 17)], indent: { left: 80 }, spacing: { before: 40, after: 40 } })],
            }),
          ],
        });
      }),
    })
  );

  sections.push(new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }));

  /* ── VISITS TABLE ───────────────────────────────────────────────────────── */
  const MIN_ROWS = 12;
  const emptyCount = Math.max(0, MIN_ROWS - visites.length);

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "D0D0D0", fill: "D0D0D0" },
        borders: BORDER_THIN,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [bold("Date des visites", 17)], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })],
      }),
      new TableCell({
        width: { size: 52, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "D0D0D0", fill: "D0D0D0" },
        borders: BORDER_THIN,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [bold("Examens cliniques et/ou explorations", 17)], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })],
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: "D0D0D0", fill: "D0D0D0" },
        borders: BORDER_THIN,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [bold("Observations", 17)], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 } })],
      }),
    ],
  });

  const visitRows = visites.map((v) =>
    new TableRow({
      height: { value: 450, rule: "atLeast" },
      children: [
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: BORDER_THIN_INNER,
          verticalAlign: VerticalAlign.TOP,
          children: [
            new Paragraph({ children: [normal(v.dateVisite, 16)], indent: { left: 60 }, spacing: { before: 40, after: 20 } }),
            ...(v.decisionAptitude
              ? [new Paragraph({ children: [bold(v.decisionAptitude, 14)], indent: { left: 60 }, spacing: { before: 0, after: 40 } })]
              : []),
          ],
        }),
        new TableCell({
          width: { size: 52, type: WidthType.PERCENTAGE },
          borders: BORDER_THIN_INNER,
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({ children: [normal(v.examensCliniques ?? "", 16)], indent: { left: 60 }, spacing: { before: 40, after: 40 } })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: BORDER_THIN_INNER,
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({ children: [normal([v.observations, v.recommandations].filter(Boolean).join(" | ") || "", 16)], indent: { left: 60 }, spacing: { before: 40, after: 40 } })],
        }),
      ],
    })
  );

  const emptyRows = Array.from({ length: emptyCount }, () => emptyRow(3, 450));

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [headerRow, ...visitRows, ...emptyRows],
    })
  );

  /* ── NOTES (unmapped columns) ───────────────────────────────────────────── */
  if (notes && notes.length > 0) {
    sections.push(new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }));

    // Group by sheet
    const bySheet = new Map<string, typeof notes>();
    for (const n of notes) {
      if (!bySheet.has(n.sheet)) bySheet.set(n.sheet, []);
      bySheet.get(n.sheet)!.push(n);
    }

    sections.push(
      new Paragraph({
        children: [bold("⚠  Informations supplémentaires (données Excel non incluses dans la fiche)", 16)],
        spacing: { before: 60, after: 40 },
        indent: { left: 100 },
      })
    );

    for (const [sheet, entries] of bySheet.entries()) {
      sections.push(
        new Paragraph({
          children: [bold(`[ Feuille : ${sheet} ]`, 16)],
          spacing: { before: 60, after: 20 },
          indent: { left: 100 },
        })
      );
      for (const e of entries) {
        sections.push(
          new Paragraph({
            children: [bold(`${e.label} : `, 15), normal(e.value, 15)],
            spacing: { before: 20, after: 20 },
            indent: { left: 200 },
          })
        );
      }
    }
  }

  return sections;
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export async function generateWordBlob(fiches: FicheData[]): Promise<Blob> {
  const allChildren: (Paragraph | Table)[] = [];
  for (let i = 0; i < fiches.length; i++) {
    allChildren.push(...buildFicheSections(fiches[i], i === 0));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 18 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left:   convertInchesToTwip(1),
              right:  convertInchesToTwip(1),
            },
          },
        },
        children: allChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}
