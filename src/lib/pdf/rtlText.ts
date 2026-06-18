import { PDFFont, PDFPage, RGB } from "pdf-lib";

/**
 * pdf-lib has no bidi algorithm built in: drawText() always lays a string
 * out left-to-right starting at a given x. Hebrew glyphs themselves shape
 * correctly regardless of draw order, but a line that mixes Hebrew words
 * with embedded numbers (dates, phone numbers, ID numbers) needs the
 * *words* ordered right-to-left while each number stays internally
 * left-to-right — exactly how real Hebrew typesetting handles numerals.
 *
 * The approach: split each line into space-separated word tokens, then
 * place tokens right-to-left across the line. Within a token, characters
 * are drawn by the font exactly as given (so "25.06.2026" stays correctly
 * ordered), and parenthesis pairs are mirrored when they wrap a token.
 */

function mirrorWrappingParens(word: string): string {
  if (word.startsWith("(") && word.endsWith(")")) {
    return ")" + word.slice(1, -1) + "(";
  }
  return word;
}

interface DrawTextStyle {
  size: number;
  font: PDFFont;
  color: RGB;
}

/** Draws one line of Hebrew/RTL text right-aligned to `rightX`. Returns the line's rendered width. */
export function drawRTLLine(
  page: PDFPage,
  text: string,
  opts: { rightX: number; y: number } & DrawTextStyle
): number {
  const { rightX, y, size, font, color } = opts;
  const words = text.split(" ").map(mirrorWrappingParens);
  let cursorX = rightX;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length > 0) {
      const w = font.widthOfTextAtSize(word, size);
      page.drawText(word, { x: cursorX - w, y, size, font, color });
      cursorX -= w;
    }
    if (i < words.length - 1) {
      cursorX -= font.widthOfTextAtSize(" ", size);
    }
  }
  return rightX - cursorX;
}

/** Word-wraps Hebrew/RTL text within [leftX, rightX] and draws each line. Returns number of lines used. */
export function drawRTLParagraph(
  page: PDFPage,
  text: string,
  opts: { rightX: number; leftX: number; y: number; lineHeight: number } & DrawTextStyle
): number {
  const { rightX, leftX, y, size, font, color, lineHeight } = opts;
  const maxWidth = rightX - leftX;
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  lines.forEach((lineText, i) => {
    drawRTLLine(page, lineText, { rightX, y: y - i * lineHeight, size, font, color });
  });

  return lines.length;
}

/** Measures the rendered width of an RTL line without drawing it (for layout calculations). */
export function measureRTLLine(text: string, size: number, font: PDFFont): number {
  const words = text.split(" ");
  let total = 0;
  words.forEach((word, i) => {
    total += font.widthOfTextAtSize(word, size);
    if (i < words.length - 1) total += font.widthOfTextAtSize(" ", size);
  });
  return total;
}
