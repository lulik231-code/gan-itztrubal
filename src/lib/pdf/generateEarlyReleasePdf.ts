import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { drawRTLLine, drawRTLParagraph, wrapRTLParagraph } from "./rtlText";
import { COLOR, PAGE_W, PAGE_H, MARGIN, loadFontBytes, formatDateTimeHebrew } from "./generateConsentPdf";
import {
  EARLY_RELEASE_INTRO,
  EARLY_RELEASE_CLAUSES,
  formatReleaseDate,
  type EarlyReleaseFormInput,
} from "@/lib/earlyRelease";
import type { Child } from "@/types";

const RIGHT = PAGE_W - MARGIN;
const LEFT = MARGIN;

interface Params {
  child: Child;
  form: EarlyReleaseFormInput;
  releaseDate: string; // YYYY-MM-DD, Israel time, set by the server
  submittedAt: Date;
}

/** Signed "early release from kindergarten" form as a PDF (A4, flows onto a 2nd page if needed). */
export async function generateEarlyReleasePdf({ child, form, releaseDate, submittedAt }: Params): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const { regular, bold } = loadFontBytes();
  const font = await pdfDoc.embedFont(regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(bold, { subset: true });

  pdfDoc.setTitle(`אישור שחרור מוקדם - ${child.full_name} - ${formatReleaseDate(releaseDate)}`);
  pdfDoc.setLanguage("he");

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // Header band
  page.drawRectangle({ x: 0, y: PAGE_H - 74, width: PAGE_W, height: 74, color: COLOR.pine });
  drawRTLLine(page, "גן אצטרובל", { rightX: RIGHT, y: PAGE_H - 36, size: 24, font: fontBold, color: COLOR.white });
  drawRTLLine(page, "אישור שחרור מוקדם מהגן", {
    rightX: RIGHT, y: PAGE_H - 58, size: 12.5, font, color: rgb(0.9, 0.93, 0.88),
  });

  let y = PAGE_H - 102;

  const ensureSpace = (needed: number) => {
    if (y - needed < 68) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 60;
    }
  };

  const rule = () => {
    page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 1, color: COLOR.line });
  };

  const detailRow = (label: string, value: string) => {
    ensureSpace(22);
    drawRTLLine(page, label, { rightX: RIGHT, y, size: 11, font: fontBold, color: COLOR.pineDark });
    drawRTLLine(page, value || "-", { rightX: RIGHT - 150, y, size: 11, font, color: COLOR.pineDark });
    y -= 17;
  };

  const paragraph = (text: string, size = 11, lineHeight = 16, gapAfter = 10) => {
    const lines = wrapRTLParagraph(text, RIGHT - LEFT, size, font).length;
    ensureSpace(lines * lineHeight + gapAfter);
    drawRTLParagraph(page, text, { rightX: RIGHT, leftX: LEFT, y, size, font, color: COLOR.pineDark, lineHeight });
    y -= lines * lineHeight + gapAfter;
  };

  const heading = (text: string) => {
    ensureSpace(40);
    drawRTLLine(page, text, { rightX: RIGHT, y, size: 14, font: fontBold, color: COLOR.pine });
    y -= 22;
  };

  // To / from
  const to = `אל: גננת הגן וצוות הגן: ${form.teacherName.trim()}`;
  paragraph(to, 11.5, 16, 12);

  heading("מאת ההורה/האפוטרופוס");
  detailRow("שם מלא:", form.parentFullName);
  detailRow("ת.ז.:", form.parentIdNumber);
  detailRow("טלפון:", form.parentPhone);
  y -= 6;

  paragraph(
    EARLY_RELEASE_INTRO.replace("{child}", child.full_name).replace("{childId}", form.childIdNumber),
    11,
    16,
    12
  );

  // Release time (date is the day the form was filled, set by the server)
  ensureSpace(60);
  rule();
  y -= 22;
  drawRTLLine(page, `שחרור חד-פעמי: בתאריך ${formatReleaseDate(releaseDate)} בשעה ${form.releaseTime}`, {
    rightX: RIGHT, y, size: 13, font: fontBold, color: COLOR.pineDark,
  });
  y -= 16;
  rule();
  y -= 22;

  // Pickup person
  heading("זהות המבוגר המאסף");
  paragraph("הילד/ה ישוחרר/ת אך ורק לידי:", 11, 16, 8);
  detailRow("שם מלא:", form.pickupName);
  detailRow("קשר משפחתי/קרבה:", form.pickupRelation);
  detailRow("טלפון:", form.pickupPhone);
  y -= 6;
  ensureSpace(30);
  rule();
  y -= 22;

  // Declaration: each clause approved on its own
  heading("הצהרת אחריות ופטור מתביעות");
  const boxX = RIGHT - 14;
  EARLY_RELEASE_CLAUSES.forEach((clause, i) => {
    const text = `${i + 1}. ${clause}`;
    const lines = wrapRTLParagraph(text, boxX - 10 - LEFT, 10, font).length;
    ensureSpace(lines * 13 + 12);
    drawRTLParagraph(page, text, {
      rightX: boxX - 10, leftX: LEFT, y, size: 10, font, color: COLOR.pineDark, lineHeight: 13,
    });
    page.drawRectangle({
      x: boxX, y: y - 2, width: 14, height: 14,
      borderColor: COLOR.pine, borderWidth: 1.3, color: COLOR.pine,
    });
    page.drawLine({ start: { x: boxX + 3, y: y + 5 }, end: { x: boxX + 6, y: y + 1 }, thickness: 1.5, color: COLOR.white });
    page.drawLine({ start: { x: boxX + 6, y: y + 1 }, end: { x: boxX + 11.5, y: y + 9 }, thickness: 1.5, color: COLOR.white });
    y -= lines * 13 + 8;
  });

  // Signature
  ensureSpace(168);
  y -= 2;
  rule();
  y -= 22;
  drawRTLLine(page, `שם מלא של ההורה: ${form.parentFullName}`, {
    rightX: RIGHT, y, size: 11, font: fontBold, color: COLOR.pineDark,
  });
  y -= 20;
  drawRTLLine(page, "חתימת ההורה", { rightX: RIGHT, y, size: 12, font: fontBold, color: COLOR.pine });
  y -= 10;

  const sigBoxHeight = 70;
  const sigBoxY = y - sigBoxHeight;
  page.drawRectangle({
    x: LEFT, y: sigBoxY, width: RIGHT - LEFT, height: sigBoxHeight,
    borderColor: COLOR.sage, borderWidth: 1,
  });
  if (form.signatureDataUrl) {
    const base64 = form.signatureDataUrl.split(",")[1] ?? form.signatureDataUrl;
    const sigImage = await pdfDoc.embedPng(Uint8Array.from(Buffer.from(base64, "base64")));
    const pad = 12;
    const scale = Math.min((RIGHT - LEFT - pad * 2) / sigImage.width, (sigBoxHeight - pad * 2) / sigImage.height, 1);
    const w = sigImage.width * scale;
    const h = sigImage.height * scale;
    page.drawImage(sigImage, {
      x: LEFT + (RIGHT - LEFT - w) / 2,
      y: sigBoxY + (sigBoxHeight - h) / 2,
      width: w,
      height: h,
    });
  }
  y = sigBoxY - 18;
  drawRTLLine(page, `תאריך: ${formatReleaseDate(releaseDate)}`, { rightX: RIGHT, y, size: 10.5, font, color: COLOR.pineDark });
  y -= 14;
  drawRTLLine(page, `תאריך ושעת חתימה: ${formatDateTimeHebrew(submittedAt)}`, {
    rightX: RIGHT, y, size: 9.5, font, color: COLOR.pineDark,
  });

  // Footer on every page
  for (const p of pdfDoc.getPages()) {
    p.drawLine({ start: { x: LEFT, y: 57 }, end: { x: RIGHT, y: 57 }, thickness: 0.5, color: COLOR.line });
    drawRTLLine(p, "מסמך זה הופק אוטומטית במערכת טפסי ההסכמה הדיגיטליים של גן אצטרובל", {
      rightX: RIGHT, y: 45, size: 8, font, color: COLOR.sage,
    });
  }

  return pdfDoc.save();
}
