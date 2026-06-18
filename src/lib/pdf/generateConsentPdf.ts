import { PDFDocument, rgb, RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { drawRTLLine, drawRTLParagraph } from "./rtlText";
import type { Event, Child, ParentFormInput } from "@/types";

// ============================================================
// Brand colors (mirrors the CSS tokens in globals.css) expressed as
// pdf-lib RGB (0–1 range) since pdf-lib doesn't read hex strings.
// ============================================================
const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const COLOR = {
  pine: hex("#2F5233"),
  pineDark: hex("#1C2B1E"),
  amber: hex("#D98A3D"),
  sage: hex("#A8BFA0"),
  sageLight: hex("#E4ECE0"),
  line: hex("#DCD3BE"),
  white: rgb(1, 1, 1),
  clay: hex("#C4694F"),
};

const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;
const MARGIN = 50;
const RIGHT = PAGE_W - MARGIN;
const LEFT = MARGIN;

let fontRegularBytesCache: ArrayBuffer | null = null;
let fontBoldBytesCache: ArrayBuffer | null = null;

async function loadFontBytes(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (fontRegularBytesCache && fontBoldBytesCache) {
    return { regular: fontRegularBytesCache, bold: fontBoldBytesCache };
  }
  // In Next.js server runtime, public/ assets are available on disk relative
  // to the project root at runtime (not via HTTP fetch) inside route handlers.
  const fs = await import("fs/promises");
  const path = await import("path");
  const regularPath = path.join(process.cwd(), "public/fonts/NotoSansHebrew-Regular.ttf");
  const boldPath = path.join(process.cwd(), "public/fonts/NotoSansHebrew-Bold.ttf");
  const [regular, bold] = await Promise.all([
    fs.readFile(regularPath),
    fs.readFile(boldPath),
  ]);
  fontRegularBytesCache = regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength);
  fontBoldBytesCache = bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength);
  return { regular: fontRegularBytesCache, bold: fontBoldBytesCache };
}

function formatDateHebrew(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function formatDateTimeHebrew(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d}.${m}.${y}, ${hh}:${mm}`;
}

interface GenerateConsentPdfParams {
  event: Event;
  child: Child;
  form: ParentFormInput;
  submittedAt: Date;
}

/**
 * Generates the final, "stamped" consent PDF: a single A4 page styled like
 * an official kindergarten form, with the event/child/parent details,
 * the consent declaration text, rendered checkboxes reflecting the
 * parent's actual choices, free-text notes, and the parent's hand-drawn
 * signature image embedded into a signature box — plus a timestamp.
 *
 * Returns the raw PDF bytes, ready to upload to storage.
 */
export async function generateConsentPdf(params: GenerateConsentPdfParams): Promise<Uint8Array> {
  const { event, child, form, submittedAt } = params;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const { regular, bold } = await loadFontBytes();
  const font = await pdfDoc.embedFont(regular, { subset: true });
  const fontBold = await pdfDoc.embedFont(bold, { subset: true });

  pdfDoc.setTitle(`טופס הסכמה - ${child.full_name} - ${event.title}`);
  pdfDoc.setLanguage("he");

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // ---------------------------------------------------------
  // Header band
  // ---------------------------------------------------------
  page.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: COLOR.pine });
  drawRTLLine(page, "גן אצטרובל", {
    rightX: RIGHT, y: PAGE_H - 45, size: 26, font: fontBold, color: COLOR.white,
  });
  drawRTLLine(page, "טופס הסכמת הורים", {
    rightX: RIGHT, y: PAGE_H - 70, size: 13, font, color: rgb(0.9, 0.93, 0.88),
  });

  let y = PAGE_H - 130;

  // ---------------------------------------------------------
  // Event details
  // ---------------------------------------------------------
  drawRTLLine(page, "פרטי האירוע", { rightX: RIGHT, y, size: 14, font: fontBold, color: COLOR.pine });
  y -= 22;
  y -= drawRTLParagraph(page, event.title, {
    rightX: RIGHT, leftX: LEFT, y, size: 12, font, color: COLOR.pineDark, lineHeight: 16,
  }) * 16 - 16;
  y -= 2;
  drawRTLLine(page, `תאריך: ${formatDateHebrew(event.event_date)}`, {
    rightX: RIGHT, y, size: 11, font, color: COLOR.pineDark,
  });
  y -= 18;

  if (event.description) {
    y -= drawRTLParagraph(page, event.description, {
      rightX: RIGHT, leftX: LEFT, y, size: 10.5, font, color: COLOR.pineDark, lineHeight: 15,
    }) * 15;
  }

  y -= 14;
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 1, color: COLOR.line });
  y -= 28;

  // ---------------------------------------------------------
  // Child & parent details
  // ---------------------------------------------------------
  drawRTLLine(page, "פרטי הילד וההורה", { rightX: RIGHT, y, size: 14, font: fontBold, color: COLOR.pine });
  y -= 24;

  const detailRow = (label: string, value: string) => {
    drawRTLLine(page, label, { rightX: RIGHT, y, size: 11, font: fontBold, color: COLOR.pineDark });
    drawRTLLine(page, value, { rightX: RIGHT - 130, y, size: 11, font, color: COLOR.pineDark });
    y -= 20;
  };

  detailRow("שם הילד/ה:", child.full_name);
  if (child.class_name) detailRow("כיתה:", child.class_name);
  detailRow("שם ההורה החותם/ת:", form.parentFullName);
  detailRow("טלפון:", form.parentPhone);
  if (form.parentIdNumber) detailRow("מספר תעודת זהות:", form.parentIdNumber);

  y -= 10;
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 1, color: COLOR.line });
  y -= 28;

  // ---------------------------------------------------------
  // Consent declaration text
  // ---------------------------------------------------------
  drawRTLLine(page, "הצהרת הסכמה", { rightX: RIGHT, y, size: 14, font: fontBold, color: COLOR.pine });
  y -= 22;
  const consentLines = drawRTLParagraph(page, event.consent_text, {
    rightX: RIGHT, leftX: LEFT, y, size: 11, font, color: COLOR.pineDark, lineHeight: 16,
  });
  y -= consentLines * 16 + 14;

  // ---------------------------------------------------------
  // Checkboxes — rendered to actually reflect what the parent checked
  // ---------------------------------------------------------
  const drawCheckbox = (checked: boolean, x: number, yPos: number) => {
    const size = 14;
    page.drawRectangle({
      x, y: yPos, width: size, height: size,
      borderColor: COLOR.pine, borderWidth: 1.3,
      color: checked ? COLOR.pine : COLOR.white,
    });
    if (checked) {
      page.drawLine({ start: { x: x + 3, y: yPos + 7 }, end: { x: x + 6, y: yPos + 3 }, thickness: 1.5, color: COLOR.white });
      page.drawLine({ start: { x: x + 6, y: yPos + 3 }, end: { x: x + 11.5, y: yPos + 11 }, thickness: 1.5, color: COLOR.white });
    }
  };

  const checkboxRow = (checked: boolean, label: string) => {
    const boxX = RIGHT - 14;
    const linesNeeded = drawRTLParagraph(page, label, {
      rightX: boxX - 10, leftX: LEFT, y, size: 10.5, font, color: COLOR.pineDark, lineHeight: 14,
    });
    drawCheckbox(checked, boxX, y - 2);
    y -= linesNeeded * 14 + 10;
  };

  if (event.requires_health_declaration) {
    checkboxRow(
      form.healthDeclarationChecked,
      "אני מאשר/ת כי קראתי את ההצהרה הבריאותית הנדרשת ומסרתי את כל המידע הרפואי הרלוונטי לגבי ילדי."
    );
  }
  checkboxRow(form.generalConsentChecked, "אני מסכים/ה להשתתפות ילדי באירוע המתואר לעיל.");
  if (form.photoConsentChecked !== null) {
    checkboxRow(form.photoConsentChecked, "אני מאשר/ת צילום ילדי לצרכי תיעוד ופרסום הגן (רשות).");
  }

  y -= 6;
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 1, color: COLOR.line });
  y -= 28;

  // ---------------------------------------------------------
  // Free-text notes
  // ---------------------------------------------------------
  drawRTLLine(page, "הערות נוספות מההורה:", { rightX: RIGHT, y, size: 11, font: fontBold, color: COLOR.pineDark });
  y -= 18;
  const notesText = form.notes?.trim() ? form.notes.trim() : "אין הערות נוספות.";
  const notesLines = drawRTLParagraph(page, notesText, {
    rightX: RIGHT, leftX: LEFT, y, size: 10.5, font, color: COLOR.pineDark, lineHeight: 14,
  });
  y -= notesLines * 14 + 24;

  // ---------------------------------------------------------
  // Signature block — embeds the parent's hand-drawn signature image
  // ---------------------------------------------------------
  page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 1, color: COLOR.line });
  y -= 26;
  drawRTLLine(page, "חתימת ההורה", { rightX: RIGHT, y, size: 12, font: fontBold, color: COLOR.pine });
  y -= 10;

  const sigBoxHeight = 90;
  const sigBoxY = y - sigBoxHeight;
  page.drawRectangle({
    x: LEFT, y: sigBoxY, width: RIGHT - LEFT, height: sigBoxHeight,
    borderColor: COLOR.sage, borderWidth: 1,
  });

  // Embed the signature PNG (base64 data URL from the canvas) into the box,
  // preserving aspect ratio and centering it within the box with padding.
  if (form.signatureDataUrl) {
    const base64 = form.signatureDataUrl.split(",")[1] ?? form.signatureDataUrl;
    const sigImageBytes = Uint8Array.from(Buffer.from(base64, "base64"));
    const sigImage = await pdfDoc.embedPng(sigImageBytes);

    const padding = 12;
    const maxW = RIGHT - LEFT - padding * 2;
    const maxH = sigBoxHeight - padding * 2;
    const scale = Math.min(maxW / sigImage.width, maxH / sigImage.height, 1);
    const drawW = sigImage.width * scale;
    const drawH = sigImage.height * scale;

    page.drawImage(sigImage, {
      x: LEFT + (RIGHT - LEFT - drawW) / 2,
      y: sigBoxY + (sigBoxHeight - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  y = sigBoxY - 22;
  drawRTLLine(page, `תאריך ושעת חתימה: ${formatDateTimeHebrew(submittedAt)}`, {
    rightX: RIGHT, y, size: 9.5, font, color: COLOR.pineDark,
  });

  // ---------------------------------------------------------
  // Footer
  // ---------------------------------------------------------
  const footerY = 45;
  page.drawLine({ start: { x: LEFT, y: footerY + 12 }, end: { x: RIGHT, y: footerY + 12 }, thickness: 0.5, color: COLOR.line });
  drawRTLLine(page, "מסמך זה הופק אוטומטית במערכת טפסי ההסכמה הדיגיטליים של גן אצטרובל", {
    rightX: RIGHT, y: footerY, size: 8, font, color: COLOR.sage,
  });

  const bytes = await pdfDoc.save();
  return bytes;
}
