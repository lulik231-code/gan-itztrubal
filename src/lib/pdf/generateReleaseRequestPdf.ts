import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { drawRTLLine, measureRTLLine, wrapRTLParagraph } from "./rtlText";
import { PAGE_W, PAGE_H, MARGIN, loadFontBytes, formatDateTimeHebrew } from "./generateConsentPdf";
import { formatReleaseDate } from "@/lib/earlyRelease";
import { RELEASE_REQUEST_TITLE, type ReleaseRequestInput } from "@/lib/releaseRequest";
import type { Child } from "@/types";

const RIGHT = PAGE_W - MARGIN;
const LEFT = MARGIN;
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.45, 0.45, 0.45);

interface Params {
  child: Child;
  form: ReleaseRequestInput;
  signedDate: string; // YYYY-MM-DD, Israel time, set by the server
  submittedAt: Date;
}

interface Seg {
  label?: string; // printed to the right of the line
  value?: string; // written on the line
  w?: number; // line width; when omitted the segment shares the remaining width
  noLine?: boolean; // text only (e.g. "לצאת מהגן")
}

/** The Ministry of Education form, filled in, as a single A4 page (black and white, like the printed form). */
export async function generateReleaseRequestPdf({ child, form, signedDate, submittedAt }: Params): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const { regular, bold } = loadFontBytes();
  const font = await pdfDoc.embedFont(regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(bold, { subset: true });

  pdfDoc.setTitle(`${RELEASE_REQUEST_TITLE} - ${child.full_name} - ${formatReleaseDate(form.requestDate)}`);
  pdfDoc.setLanguage("he");

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const SIZE = 12.5;

  const centered = (text: string, y: number, size: number, f = font) => {
    const w = measureRTLLine(text, size, f);
    drawRTLLine(page, text, { rightX: PAGE_W / 2 + w / 2, y, size, font: f, color: BLACK });
  };

  // Official header, exactly as on the printed form.
  centered("מדינת ישראל", PAGE_H - 70, 19, fontBold);
  centered("משרד החינוך", PAGE_H - 94, 15);
  centered("המנהל הפדגוגי", PAGE_H - 116, 13.5);
  centered(RELEASE_REQUEST_TITLE, PAGE_H - 175, 19.5, fontBold);

  /** One row of "label ____value____" pairs, laid out right to left. */
  const row = (y: number, segs: Seg[]) => {
    const GAP = 14;
    const LABEL_GAP = 6;
    const fixed = segs.reduce((sum, s) => {
      const labelW = s.label ? measureRTLLine(s.label, SIZE, font) + LABEL_GAP : 0;
      return sum + labelW + (s.noLine ? 0 : s.w ?? 0);
    }, 0);
    const flexCount = segs.filter((s) => !s.noLine && s.w === undefined).length;
    const flexW = flexCount ? (RIGHT - LEFT - fixed - GAP * (segs.length - 1)) / flexCount : 0;

    let cursor = RIGHT;
    for (const s of segs) {
      if (s.label) {
        const lw = measureRTLLine(s.label, SIZE, font);
        drawRTLLine(page, s.label, { rightX: cursor, y, size: SIZE, font, color: BLACK });
        cursor -= lw + LABEL_GAP;
      }
      if (!s.noLine) {
        const w = s.w ?? flexW;
        page.drawLine({ start: { x: cursor - w, y: y - 4 }, end: { x: cursor, y: y - 4 }, thickness: 0.8, color: BLACK });
        if (s.value) {
          let size = SIZE;
          while (size > 8 && measureRTLLine(s.value, size, font) > w - 4) size -= 0.5;
          const vw = measureRTLLine(s.value, size, font);
          drawRTLLine(page, s.value, { rightX: cursor - (w - vw) / 2, y, size, font, color: BLACK });
        }
        cursor -= w;
      }
      cursor -= GAP;
    }
  };

  let y = PAGE_H - 240;
  const STEP = 50;
  row(y, [{ label: "אל הגנ/נת", value: form.teacherName, w: 300 }]);
  y -= STEP;
  row(y, [{ label: "בגן", value: form.kindergartenName, w: 300 }]);
  y -= STEP;
  row(y, [
    { label: "אני מבקש/ת לאפשר לבני/בתי", value: child.full_name },
    { label: "לצאת מהגן", noLine: true },
  ]);
  y -= STEP;
  row(y, [
    { label: "בתאריך", value: formatReleaseDate(form.requestDate), w: 120 },
    { label: "משעה", value: form.fromTime, w: 80 },
    { label: "עד שעה", value: form.toTime, w: 80 },
  ]);
  y -= STEP;
  row(y, [
    { label: "שם הפונה", value: form.parentFullName },
    { label: "קרבת משפחה", value: form.parentRelation },
  ]);
  y -= STEP;
  row(y, [
    { label: "שם האדם שיקח/תיקח את הילד/ה", value: form.pickupName },
    { label: "מספר טלפון", value: form.pickupPhone, w: 95 },
  ]);
  y -= STEP;

  // Reason: label, then ruled lines with the text written on them.
  drawRTLLine(page, "הסיבה לבקשה", { rightX: RIGHT, y, size: SIZE, font, color: BLACK });
  const reasonLines = wrapRTLParagraph(form.reason.trim(), RIGHT - LEFT - 8, SIZE, font);
  const lineCount = Math.max(2, reasonLines.length);
  let ly = y - 34;
  for (let i = 0; i < lineCount; i++) {
    page.drawLine({ start: { x: LEFT, y: ly - 4 }, end: { x: RIGHT, y: ly - 4 }, thickness: 0.8, color: BLACK });
    if (reasonLines[i]) drawRTLLine(page, reasonLines[i], { rightX: RIGHT - 2, y: ly, size: SIZE, font, color: BLACK });
    ly -= 30;
  }

  // Signature block
  const sigY = Math.min(ly - 50, 170);
  const SIG_LINE_W = 190;
  const SIGNED_LABEL = "חתימת ההורה הפונה";
  const labelW = measureRTLLine(SIGNED_LABEL, SIZE, fontBold);
  drawRTLLine(page, SIGNED_LABEL, { rightX: RIGHT, y: sigY, size: SIZE, font: fontBold, color: BLACK });
  const sigLineRight = RIGHT - labelW - 8;
  page.drawLine({
    start: { x: sigLineRight - SIG_LINE_W, y: sigY - 4 }, end: { x: sigLineRight, y: sigY - 4 },
    thickness: 0.8, color: BLACK,
  });
  if (form.signatureDataUrl) {
    const base64 = form.signatureDataUrl.split(",")[1] ?? form.signatureDataUrl;
    const img = await pdfDoc.embedPng(Uint8Array.from(Buffer.from(base64, "base64")));
    const maxW = SIG_LINE_W - 8;
    const maxH = 48;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: sigLineRight - SIG_LINE_W + (SIG_LINE_W - w) / 2, y: sigY - 2, width: w, height: h });
  }
  const dateLabelRight = sigLineRight - SIG_LINE_W - 24;
  const dateLabel = "תאריך";
  const dlw = measureRTLLine(dateLabel, SIZE, font);
  drawRTLLine(page, dateLabel, { rightX: dateLabelRight, y: sigY, size: SIZE, font, color: BLACK });
  const dateLineRight = dateLabelRight - dlw - 6;
  const dateLineW = Math.max(60, dateLineRight - LEFT);
  page.drawLine({
    start: { x: dateLineRight - dateLineW, y: sigY - 4 }, end: { x: dateLineRight, y: sigY - 4 },
    thickness: 0.8, color: BLACK,
  });
  const dv = formatReleaseDate(signedDate);
  const dvw = measureRTLLine(dv, SIZE, font);
  drawRTLLine(page, dv, { rightX: dateLineRight - (dateLineW - dvw) / 2, y: sigY, size: SIZE, font, color: BLACK });

  // Small note about how the document was produced (kept out of the way of the form itself).
  drawRTLLine(
    page,
    `נחתם דיגיטלית במערכת גן אצטרובל ביום ${formatDateTimeHebrew(submittedAt)}`,
    { rightX: RIGHT, y: 40, size: 8, font, color: GRAY }
  );

  return pdfDoc.save();
}
