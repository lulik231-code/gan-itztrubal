import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/extract-consent-text
 * Accepts a multipart form with field "file" (Word .docx or PDF).
 * Returns { text: string } with the extracted plain text.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "לא הועלה קובץ" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    let text = "";

    if (name.endsWith(".docx")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    } else if (name.endsWith(".pdf")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const result = await pdfParse(buffer);
      text = result.text ?? "";
    } else {
      return NextResponse.json(
        { error: "פורמט לא נתמך. יש להעלות קובץ PDF או Word (.docx)" },
        { status: 400 }
      );
    }

    // Trim excessive blank lines
    text = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
      .join("\n")
      .trim();

    return NextResponse.json({ text });
  } catch (err) {
    console.error("extract-consent-text error:", err);
    return NextResponse.json(
      { error: "שגיאה בחילוץ הטקסט מהקובץ" },
      { status: 500 }
    );
  }
}
