import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, ShadingType, BorderStyle,
  HeadingLevel, VerticalAlign,
} from "docx";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
export type Conformite = "OUI" | "NON" | "N/A";

export type CheckItem = {
  designation: string;
  presence: Conformite;
  observations: string;
  recommandations: string;
  nombre?: string;
  dateVerif?: string;
  datePeremption?: string;
};

export type VisiteHygieneData = {
  dateVisite: string;
  direction: string;
  site: string;
  sanitaires: CheckItem[];
  locauxTravail: CheckItem[];
  locauxTechAdmin: CheckItem[];
  securite: CheckItem[];
  urgenceSecourisme: CheckItem[];
  synthese: {
    etatGeneral: Conformite;
    observation: string;
    scoreGlobal: number | null;
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   COLOURS
═══════════════════════════════════════════════════════════════════════════ */
const TEAL       = "1a7a6a";
const TEAL_LIGHT = "e6f4f1";
const RED_BG     = "fde8e8";
const RED_TEXT   = "c0392b";
const DARK_HEADER= "2c3e50";
const WHITE      = "ffffff";
const ROW_ALT    = "f9fafb";

/* ═══════════════════════════════════════════════════════════════════════════
   BORDER SETS
═══════════════════════════════════════════════════════════════════════════ */
const THIN_BORDER = {
  top:    { style: BorderStyle.SINGLE, size: 2, color: "cccccc" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "cccccc" },
  left:   { style: BorderStyle.SINGLE, size: 2, color: "cccccc" },
  right:  { style: BorderStyle.SINGLE, size: 2, color: "cccccc" },
};
const THICK_BORDER = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: TEAL },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL },
  left:   { style: BorderStyle.SINGLE, size: 4, color: TEAL },
  right:  { style: BorderStyle.SINGLE, size: 4, color: TEAL },
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function shade(color: string) {
  return { type: ShadingType.SOLID, color, fill: color };
}

function margins() {
  return { top: 80, bottom: 80, left: 120, right: 120 };
}

function tc(
  text: string,
  opts: {
    bold?: boolean; color?: string; bg?: string; width?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    italics?: boolean; size?: number;
  } = {}
): TableCell {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.bg ? shade(opts.bg) : undefined,
    verticalAlign: VerticalAlign.CENTER,
    borders: THIN_BORDER,
    margins: margins(),
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? false,
            italics: opts.italics ?? false,
            color: opts.color ?? "1a1a1a",
            size: opts.size ?? 20,
          }),
        ],
      }),
    ],
  });
}

function sectionHeaderRow(label: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 4,
        shading: shade(DARK_HEADER),
        borders: THIN_BORDER,
        margins: { top: 100, bottom: 100, left: 150, right: 150 },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label.toUpperCase(), bold: true, color: WHITE, size: 22 }),
            ],
          }),
        ],
      }),
    ],
  });
}

function colHeaderRow(): TableRow {
  const headers = ["Désignation", "Conformité", "Observations", "Recommandations"];
  const widths  = [35, 12, 28, 25];
  return new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.PERCENTAGE },
        shading: shade(TEAL),
        borders: THIN_BORDER,
        margins: margins(),
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: h, bold: true, color: WHITE, size: 20 })],
          }),
        ],
      })
    ),
  });
}

function itemRow(item: CheckItem, altBg: boolean): TableRow {
  const isNon    = item.presence === "NON";
  const bg       = isNon ? RED_BG : altBg ? ROW_ALT : WHITE;
  const textColor= isNon ? RED_TEXT : "1a1a1a";
  const confColor= item.presence === "OUI" ? TEAL : item.presence === "NON" ? RED_TEXT : "666666";

  let designation = item.designation;
  if (item.nombre)        designation += `  —  Nb: ${item.nombre}`;
  if (item.dateVerif)     designation += `  —  Vérif: ${item.dateVerif}`;
  if (item.datePeremption)designation += `  —  Péremption: ${item.datePeremption}`;

  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: shade(bg), borders: THIN_BORDER, margins: margins(), verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: designation, bold: isNon, color: textColor, size: 19 })] })],
      }),
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        shading: shade(bg), borders: THIN_BORDER, margins: margins(), verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.presence, bold: true, color: confColor, size: 20 })] })],
      }),
      new TableCell({
        width: { size: 28, type: WidthType.PERCENTAGE },
        shading: shade(bg), borders: THIN_BORDER, margins: margins(), verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: item.observations || "—", italics: !item.observations, color: item.observations ? textColor : "999999", size: 19 })] })],
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: shade(bg), borders: THIN_BORDER, margins: margins(), verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: item.recommandations || "—", italics: !item.recommandations, color: item.recommandations ? textColor : "999999", size: 19 })] })],
      }),
    ],
  });
}

function buildSection(label: string, items: CheckItem[]): TableRow[] {
  return [
    sectionHeaderRow(label),
    colHeaderRow(),
    ...items.map((item, i) => itemRow(item, i % 2 === 1)),
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════════════════ */
export async function generateHygieneWordBlob(data: VisiteHygieneData): Promise<Blob> {
  const allItems = [
    ...data.sanitaires, ...data.locauxTravail, ...data.locauxTechAdmin,
    ...data.securite, ...data.urgenceSecourisme,
  ];
  const total         = allItems.length;
  const conforme      = allItems.filter((i) => i.presence === "OUI").length;
  const nonConforme   = allItems.filter((i) => i.presence === "NON").length;
  const score         = data.synthese.scoreGlobal ?? (total > 0 ? Math.round((conforme / total) * 100) : null);
  const scoreColor    = score !== null ? (score >= 80 ? TEAL : score >= 60 ? "e67e22" : RED_TEXT) : "666666";

  /* ── Info header table ── */
  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        tc("Date de visite",  { bold: true, bg: TEAL_LIGHT, width: 20 }),
        tc(data.dateVisite,   { width: 30 }),
        tc("Direction",       { bold: true, bg: TEAL_LIGHT, width: 20 }),
        tc(data.direction,    { width: 30 }),
      ]}),
      new TableRow({ children: [
        tc("Site visité",  { bold: true, bg: TEAL_LIGHT, width: 20 }),
        tc(data.site,      { width: 30 }),
        tc("Score global", { bold: true, bg: TEAL_LIGHT, width: 20 }),
        tc(score !== null ? `${score}% — ${conforme}/${total} conformes` : "—",
           { width: 30, color: scoreColor, bold: true }),
      ]}),
    ],
  });

  /* ── Main checklist table ── */
  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ...buildSection("Sanitaires", data.sanitaires),
      ...buildSection("Locaux de travail", data.locauxTravail),
      ...buildSection("Locaux Techniques & Administratifs", data.locauxTechAdmin),
      ...buildSection("Securite & Lutte contre l'incendie", data.securite),
      ...buildSection("Situations d'Urgence & Secourisme", data.urgenceSecourisme),
    ],
  });

  /* ── Synthèse table ── */
  const syntheseColor = data.synthese.etatGeneral === "OUI" ? TEAL
                      : data.synthese.etatGeneral === "NON" ? RED_TEXT : "666666";
  const syntheseTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [
        tc("État d'hygiène général",   { bold: true, bg: TEAL_LIGHT, width: 30 }),
        tc(data.synthese.etatGeneral,  { bold: true, color: syntheseColor, width: 15 }),
        tc("Observations générales",   { bold: true, bg: TEAL_LIGHT, width: 25 }),
        tc(data.synthese.observation || "—", { width: 30 }),
      ]}),
      new TableRow({ children: [
        tc("Points non conformes", {
          bold: true,
          bg: nonConforme > 0 ? RED_BG : TEAL_LIGHT,
          color: nonConforme > 0 ? RED_TEXT : "1a1a1a",
          width: 30,
        }),
        tc(nonConforme > 0 ? `${nonConforme} point(s) à corriger` : "Aucun", {
          bold: nonConforme > 0,
          color: nonConforme > 0 ? RED_TEXT : TEAL,
          bg: nonConforme > 0 ? RED_BG : WHITE,
          width: 15,
        }),
        tc("Points conformes", { bold: true, bg: TEAL_LIGHT, width: 25 }),
        tc(`${conforme} sur ${total}`, { color: TEAL, bold: true, width: 30 }),
      ]}),
    ],
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
    sections: [{
      properties: {
        page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } },
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 100 },
          children: [new TextRun({ text: "RAPPORT DE VISITE D'HYGIENE", bold: true, color: TEAL, size: 32 })],
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: "Médecine du Travail — Service Hygiène & Sécurité", color: "666666", size: 20, italics: true })],
        }),
        infoTable,
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        mainTable,
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: "SYNTHESE ET EVALUATION GLOBALE", bold: true, color: TEAL, size: 24 })],
        }),
        syntheseTable,
        new Paragraph({ spacing: { after: 600 }, children: [] }),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: "Signature du médecin du travail :", size: 20, bold: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: "_".repeat(40), size: 20 })],
        }),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
