import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { drawRTLLine, drawRTLParagraph, measureRTLLine, wrapRTLParagraph } from "./rtlText";
import { PAGE_W, PAGE_H, MARGIN, loadFontBytes, formatDateTimeHebrew } from "./generateConsentPdf";
import { formatReleaseDate } from "@/lib/earlyRelease";
import {
  STANDING_TITLE,
  STANDING_SUBTITLE,
  STANDING_SUBJECT,
  STANDING_RESPONSIBILITY,
  standingIntroLines,
  releaseTypeLabel,
  type StandingReleaseInput,
} from "@/lib/standingRelease";
import type { Child } from "@/types";

const RIGHT = PAGE_W - MARGIN;
const LEFT = MARGIN;
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.45, 0.45, 0.45);

async function embedSignature(pdfDoc: PDFDocument, dataUrl: string) {
  if (!dataUrl) return null;
  const base64 = dataUrl.split(",")[1] ?? dataUrl;
  return pdfDoc.embedPng(Uint8Array.from(Buffer.from(base64, "base64")));
}

/** Appendix C (standing early release) filled in, with a blank "אישור המפקח/ת" block for the inspector to sign. */
export async function generateStandingReleasePdf(params: {
  child: Child;
  form: StandingReleaseInput;
  submittedAt: Date;
}): Promise<Uint8Array> {
  const { child, form, submittedAt } = params;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const { regular, bold } = loadFontBytes();
  const font = await pdfDoc.embedFont(regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(bold, { subset: true });

  pdfDoc.setTitle(`${STANDING_TITLE} - ${child.full_name}`);
  pdfDoc.setLanguage("he");
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const SIZE = 12.5;

  const centered = (text: string, y: number, size: number, f = font) => {
    const w = measureRTLLine(text, size, f);
    drawRTLLine(page, text, { rightX: PAGE_W / 2 + w / 2, y, size, font: f, color: BLACK });
  };
  const line = (x1: number, x2: number, y: number) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.8, color: BLACK });
  const paragraph = (text: string, y: number, f = font, lh = 20): number => {
    const n = drawRTLParagraph(page, text, { rightX: RIGHT, leftX: LEFT, y, size: SIZE, font: f, color: BLACK, lineHeight: lh });
    return n * lh;
  };

  let y = PAGE_H - 70;
  centered(STANDING_TITLE, y, 15, fontBold);
  y -= 32;
  centered(STANDING_SUBTITLE, y, 14, fontBold);
  y -= 38;

  drawRTLLine(page, "אל הגננת", { rightX: RIGHT, y, size: SIZE, font, color: BLACK });
  y -= 28;
  drawRTLLine(page, `שם הגן: ${form.kindergartenName}`, { rightX: RIGHT, y, size: SIZE, font, color: BLACK });
  y -= 28;
  drawRTLLine(page, STANDING_SUBJECT, { rightX: RIGHT, y, size: SIZE, font: fontBold, color: BLACK });
  y -= 36;

  const [a1, a2] = standingIntroLines(child.full_name, form.schedule, formatReleaseDate(form.startDate));
  y -= paragraph(a1, y) + 4;
  y -= paragraph(a2, y) + 8;
  const typeLine =
    form.releaseType === "other" && form.reasonText
      ? `סוג השחרור: ${releaseTypeLabel(form.releaseType)}. סיבה: ${form.reasonText}`
      : `סוג השחרור: ${releaseTypeLabel(form.releaseType)}`;
  y -= paragraph(typeLine, y) + 8;
  y -= paragraph(STANDING_RESPONSIBILITY, y) + 14;

  // Notes: first block holds the parents' remarks, second block is left empty as on the printed form.
  const noteBlock = (text: string) => {
    drawRTLLine(page, "הערות:", { rightX: RIGHT, y, size: SIZE, font, color: BLACK });
    const labelW = measureRTLLine("הערות:", SIZE, font) + 8;
    const first = wrapRTLParagraph(text, RIGHT - labelW - LEFT - 6, SIZE, font);
    // First line sits next to the label, remaining lines use the full width.
    const lines: string[] = [];
    if (text) {
      const head = first[0] ?? "";
      lines.push(head);
      const rest = text.slice(head.length).trim();
      if (rest) lines.push(...wrapRTLParagraph(rest, RIGHT - LEFT - 6, SIZE, font));
    }
    const count = Math.max(3, lines.length);
    for (let i = 0; i < count; i++) {
      const ly = y - i * 24;
      const x1 = i === 0 ? RIGHT - labelW : RIGHT;
      line(LEFT, x1, ly - 4);
      if (lines[i]) drawRTLLine(page, lines[i], { rightX: x1 - 3, y: ly, size: SIZE, font, color: BLACK });
    }
    y -= count * 24 + 14;
  };
  noteBlock(form.notes.trim());
  noteBlock("");

  // Parents: names and signatures
  const sig1 = await embedSignature(pdfDoc, form.parent1Signature);
  const sig2 = await embedSignature(pdfDoc, form.parent2Signature);
  const NAME_W = 210;
  const SIG_W = 170;
  const parentRow = async (n: number, name: string, sig: Awaited<ReturnType<typeof embedSignature>>) => {
    const label = `${n}.`;
    const lw = measureRTLLine(label, SIZE, font) + 6;
    // name column
    drawRTLLine(page, label, { rightX: RIGHT, y, size: SIZE, font, color: BLACK });
    const nameRight = RIGHT - lw;
    line(nameRight - NAME_W, nameRight, y - 4);
    if (name) {
      let size = SIZE;
      while (size > 8 && measureRTLLine(name, size, font) > NAME_W - 4) size -= 0.5;
      const w = measureRTLLine(name, size, font);
      drawRTLLine(page, name, { rightX: nameRight - (NAME_W - w) / 2, y, size, font, color: BLACK });
    }
    // signature column
    const sigLabelRight = nameRight - NAME_W - 30;
    drawRTLLine(page, label, { rightX: sigLabelRight, y, size: SIZE, font, color: BLACK });
    const sigRight = sigLabelRight - lw;
    line(sigRight - SIG_W, sigRight, y - 4);
    if (sig) {
      const scale = Math.min((SIG_W - 8) / sig.width, 40 / sig.height, 1);
      const w = sig.width * scale;
      const h = sig.height * scale;
      page.drawImage(sig, { x: sigRight - SIG_W + (SIG_W - w) / 2, y: y - 2, width: w, height: h });
    }
    return { nameCenter: nameRight - NAME_W / 2, sigCenter: sigRight - SIG_W / 2 };
  };
  y -= 22;
  const c1 = await parentRow(1, form.parent1Name, sig1);
  y -= 44;
  await parentRow(2, form.parent2Name, sig2);
  y -= 20;
  const cap = (text: string, center: number) => {
    const w = measureRTLLine(text, 10.5, font);
    drawRTLLine(page, text, { rightX: center + w / 2, y, size: 10.5, font, color: BLACK });
  };
  cap("שמות ההורים הפונים", c1.nameCenter);
  cap("חתימת ההורים", c1.sigCenter);

  // Inspector approval block (left blank on purpose)
  y -= 52;
  drawRTLLine(page, "אישור המפקח/ת", { rightX: RIGHT, y, size: 13, font: fontBold, color: BLACK });
  y -= 52;
  line(RIGHT - 260, RIGHT, y);

  drawRTLLine(page, `נחתם על ידי ההורים דיגיטלית במערכת גן אצטרובל ביום ${formatDateTimeHebrew(submittedAt)}`, {
    rightX: RIGHT, y: 40, size: 8, font, color: GRAY,
  });

  return pdfDoc.save();
}

export interface AttachmentFile {
  type: string;
  bytes: Uint8Array;
}

/** The form followed by the uploaded documents (PDF pages as they are, images fitted to an A4 page). */
export async function buildPackagePdf(formBytes: Uint8Array, attachments: AttachmentFile[]): Promise<Uint8Array> {
  const out = await PDFDocument.load(formBytes);
  out.registerFontkit(fontkit);
  const { regular } = loadFontBytes();
  const font = await out.embedFont(regular, { subset: true });

  let n = 0;
  for (const a of attachments) {
    n++;
    if (a.type === "application/pdf") {
      const src = await PDFDocument.load(a.bytes); // throws for password-protected files
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    } else {
      const img = a.type === "image/png" ? await out.embedPng(a.bytes) : await out.embedJpg(a.bytes);
      const page = out.addPage([PAGE_W, PAGE_H]);
      const label = `מסמך מצורף ${n}`;
      const lw = measureRTLLine(label, 10, font);
      drawRTLLine(page, label, { rightX: PAGE_W / 2 + lw / 2, y: PAGE_H - 32, size: 10, font, color: GRAY });
      const maxW = PAGE_W - MARGIN * 2;
      const maxH = PAGE_H - 110;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1.5);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: (PAGE_W - w) / 2, y: PAGE_H - 55 - h, width: w, height: h });
    }
  }
  return out.save();
}
