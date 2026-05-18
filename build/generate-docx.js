/**
 * generate-docx.js — produce a 2-column sidebar DOCX from the final resume markdown.
 *
 * Reads:  ~/Desktop/Resume Outputs/03-final-resume-review.md (the proofread output)
 * Writes: ~/Desktop/Resume Outputs/final-resume.docx
 *
 * Run via:
 *   NODE_PATH=$(npm root -g) node /Users/stack3/resume-agent/build/generate-docx.js
 *
 * Override paths via env: RESUME_SOURCE, RESUME_OUTPUT.
 *
 * Layout architecture from the working source — see header comments there.
 */

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType
} = require('docx');

// ============================================================
// CONSTANTS — Edit these to change colors
// ============================================================
const NAVY      = "1F3A5F";
const GREY      = "555555";
const LIGHT_BG  = "F2F4F7";
const DARK_TEXT = "222222";
const SIDE_TEXT = "333333";

// ============================================================
// LAYOUT CONSTANTS — Page 8.5" Letter; 0.75" margins all sides.
// SIDEBAR_W + MAIN_W must equal page_width - left_margin - right_margin.
// 12240 - 1080 - 1080 = 10080.  3300 + 6780 = 10080. ✓
// ============================================================
const SIDEBAR_W = 3300;
const MAIN_W    = 6780;

// ============================================================
// BORDERS HELPER
// ============================================================
const noBorders = {
  top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

// ============================================================
// PARAGRAPH HELPERS (from working source — do not edit)
// ============================================================
const sideHeader = (text) => new Paragraph({
  spacing: { before: 200, after: 80, line: 240 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 2 } },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: NAVY, font: "Calibri" })],
});

const mainHeader = (text) => new Paragraph({
  spacing: { before: 160, after: 100, line: 240 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 2 } },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24, color: NAVY, font: "Calibri" })],
});

const sideLine = (text, opts = {}) => new Paragraph({
  spacing: { before: 0, after: 40, line: 240 },
  children: [new TextRun({
    text, size: 18,
    color: opts.color ?? SIDE_TEXT,
    font: "Calibri",
    bold: opts.bold ?? false,
  })],
});

const sideGroupLabel = (text) => new Paragraph({
  spacing: { before: 120, after: 30 },
  children: [new TextRun({ text, bold: true, size: 18, color: NAVY, font: "Calibri" })],
});

const sideBullet = (text) => new Paragraph({
  numbering: { reference: "side-bullets", level: 0 },
  spacing: { before: 0, after: 30, line: 240 },
  children: [new TextRun({ text, size: 18, color: SIDE_TEXT, font: "Calibri" })],
});

const mainBullet = (text) => new Paragraph({
  numbering: { reference: "main-bullets", level: 0 },
  spacing: { before: 0, after: 60, line: 268 },
  children: [new TextRun({ text, size: 20, color: DARK_TEXT, font: "Calibri" })],
});

const jobBlock = (title, company, dates) => [
  new Paragraph({
    spacing: { before: 120, after: 0, line: 260 },
    children: [
      new TextRun({ text: title,   bold: true, size: 22, color: "111111", font: "Calibri" }),
      new TextRun({ text: "  |  ",             size: 22, color: GREY,     font: "Calibri" }),
      new TextRun({ text: company, bold: true, size: 22, color: NAVY,     font: "Calibri" }),
    ],
  }),
  new Paragraph({
    spacing: { before: 0, after: 60, line: 240 },
    children: [new TextRun({ text: dates, italics: true, size: 18, color: GREY, font: "Calibri" })],
  }),
];

// ============================================================
// MARKDOWN PARSER — turns the final-resume markdown into structured data
// ============================================================

function extractFinalResume(reviewMd) {
  const m = reviewMd.match(/^##\s+Final Resume\s*$/m);
  if (!m) return null;
  return reviewMd.slice(m.index + m[0].length).trim();
}

function parseMarkdown(md) {
  // Strip pandoc-safe backslash escapes around parens/brackets (e.g., \(404\) -> (404))
  md = md.replace(/\\([()])/g, '$1');

  const lines = md.split('\n');
  const data = {
    name: '',
    tagline: '',
    contact: [],
    summary: '',
    experience: [],          // [{ title, company, dates, bullets[] }]
    skillGroups: [],         // [{ label, bullets[] }]
    certifications: [],      // ["Cert — Issued YYYY", ...]
    educationLines: [],      // raw lines under EDUCATION, in order
  };

  let section = null;        // 'contact' | 'summary' | 'experience' | 'skills' | 'certifications' | 'education'
  let currentJob = null;
  let currentSkillGroup = null;
  const summaryBuf = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    // H1 → name; next non-empty non-heading line is tagline
    if (!data.name && /^#\s+/.test(raw)) {
      data.name = raw.replace(/^#\s+/, '').trim();
      for (let j = i + 1; j < lines.length; j++) {
        const tj = lines[j].trim();
        if (tj === '' || tj === '---') continue;
        if (/^#/.test(tj)) break;
        data.tagline = tj;
        break;
      }
      continue;
    }

    // H2 → switch sections
    if (/^##\s+/.test(raw)) {
      const h = raw.replace(/^##\s+/, '').trim().toLowerCase();
      currentJob = null;
      currentSkillGroup = null;
      if (h === 'contact')                    section = 'contact';
      else if (h === 'professional summary')  section = 'summary';
      else if (h === 'work experience')       section = 'experience';
      else if (h === 'skills')                section = 'skills';
      else if (h === 'certifications')        section = 'certifications';
      else if (h === 'education')             section = 'education';
      else                                    section = null;
      continue;
    }

    // H3 → job heading inside experience, or skill group heading inside skills
    if (/^###\s+/.test(raw)) {
      const h = raw.replace(/^###\s+/, '').trim();
      if (section === 'experience') {
        // "Title, Company" — split on the LAST comma
        const idx = h.lastIndexOf(',');
        const title   = idx > 0 ? h.slice(0, idx).trim() : h;
        const company = idx > 0 ? h.slice(idx + 1).trim() : '';
        currentJob = { title, company, dates: '', bullets: [] };
        data.experience.push(currentJob);
      } else if (section === 'skills') {
        currentSkillGroup = { label: h, bullets: [] };
        data.skillGroups.push(currentSkillGroup);
      }
      continue;
    }

    // Separators / blank lines
    if (t === '' || t === '---') continue;

    // Section body
    if (section === 'contact') {
      if (t.startsWith('- ')) data.contact.push(t.slice(2).trim());
      continue;
    }
    if (section === 'summary') {
      summaryBuf.push(t);
      continue;
    }
    if (section === 'experience' && currentJob) {
      if (t.startsWith('- ')) currentJob.bullets.push(t.slice(2).trim());
      else if (!currentJob.dates) currentJob.dates = t;
      continue;
    }
    if (section === 'skills' && currentSkillGroup) {
      if (t.startsWith('- ')) currentSkillGroup.bullets.push(t.slice(2).trim());
      continue;
    }
    if (section === 'certifications') {
      if (t.startsWith('- ')) data.certifications.push(t.slice(2).trim());
      continue;
    }
    if (section === 'education') {
      // Strip trailing backslash hard-break marker
      data.educationLines.push(t.replace(/\\$/, '').trim());
      continue;
    }
  }

  data.summary = summaryBuf.join(' ').replace(/\s+/g, ' ').trim();
  return data;
}

// ============================================================
// BUILDERS — turn parsed data into paragraph arrays
// ============================================================

function buildSidebar(data) {
  const out = [];

  out.push(sideHeader("Contact"));
  for (const line of data.contact) out.push(sideLine(line));

  if (data.skillGroups.length) {
    out.push(sideHeader("Core Skills"));
    for (const g of data.skillGroups) {
      out.push(sideGroupLabel(g.label));
      for (const b of g.bullets) out.push(sideBullet(b));
    }
  }

  if (data.certifications.length) {
    out.push(sideHeader("Certifications"));
    for (const c of data.certifications) {
      // Split "Name — Issued YYYY" into bold name + plain detail
      const m = c.match(/^(.+?)\s+[—–-]\s+(.+)$/);
      if (m) {
        out.push(sideLine(m[1].trim(), { bold: true }));
        out.push(sideLine(m[2].trim()));
      } else {
        out.push(sideLine(c, { bold: true }));
      }
    }
  }

  if (data.educationLines.length) {
    out.push(sideHeader("Education"));
    // First line is degree (often wrapped in **bold**); strip the markers.
    const first = data.educationLines[0].replace(/^\*\*|\*\*$/g, '').trim();
    out.push(sideLine(first, { bold: true }));
    for (const line of data.educationLines.slice(1)) {
      const clean = line.replace(/^\*\*|\*\*$/g, '').trim();
      out.push(sideLine(clean));
    }
  }

  return out;
}

function buildMain(data) {
  const out = [];

  out.push(new Paragraph({
    spacing: { before: 0, after: 60, line: 260 },
    children: [new TextRun({ text: data.name, bold: true, size: 44, color: NAVY, font: "Calibri" })],
  }));

  if (data.tagline) {
    out.push(new Paragraph({
      spacing: { before: 0, after: 200, line: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY, space: 4 } },
      children: [new TextRun({ text: data.tagline, italics: true, size: 22, color: GREY, font: "Calibri" })],
    }));
  }

  if (data.summary) {
    out.push(mainHeader("Professional Summary"));
    out.push(new Paragraph({
      spacing: { before: 0, after: 120, line: 280 },
      children: [new TextRun({ text: data.summary, size: 20, color: DARK_TEXT, font: "Calibri" })],
    }));
  }

  if (data.experience.length) {
    out.push(mainHeader("Professional Experience"));
    for (const job of data.experience) {
      out.push(...jobBlock(job.title, job.company, job.dates));
      for (const b of job.bullets) out.push(mainBullet(b));
    }
  }

  return out;
}

// ============================================================
// MAIN
// ============================================================

const SOURCE = process.env.RESUME_SOURCE || `${process.env.HOME}/Desktop/Resume Outputs/03-final-resume-review.md`;
const OUTPUT = process.env.RESUME_OUTPUT || `${process.env.HOME}/Desktop/Resume Outputs/final-resume.docx`;

if (!fs.existsSync(SOURCE)) {
  console.error(`error: source not found: ${SOURCE}`);
  process.exit(1);
}

const reviewMd = fs.readFileSync(SOURCE, 'utf8');
const finalMd = extractFinalResume(reviewMd);
if (!finalMd) {
  console.error("error: no '## Final Resume' section found in source");
  process.exit(1);
}

const data = parseMarkdown(finalMd);

const layoutTable = new Table({
  width: { size: SIDEBAR_W + MAIN_W, type: WidthType.DXA },
  columnWidths: [SIDEBAR_W, MAIN_W],
  borders: {
    top:              { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom:           { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left:             { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right:            { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideVertical:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  },
  rows: [
    new TableRow({
      children: [
        new TableCell({
          width: { size: SIDEBAR_W, type: WidthType.DXA },
          borders: noBorders,
          shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
          margins: { top: 240, bottom: 240, left: 220, right: 220 },
          children: buildSidebar(data),
        }),
        new TableCell({
          width: { size: MAIN_W, type: WidthType.DXA },
          borders: noBorders,
          margins: { top: 200, bottom: 200, left: 280, right: 100 },
          children: buildMain(data),
        }),
      ],
    }),
  ],
});

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
  numbering: {
    config: [
      {
        reference: "side-bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 260, hanging: 200 } } },
        }],
      },
      {
        reference: "main-bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 260, hanging: 200 } } },
        }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    children: [layoutTable],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUTPUT, buf);
  console.log(`wrote: ${OUTPUT}`);
});
