import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { generateStandingReleasePdf, buildPackagePdf } from "@/lib/pdf/generateStandingReleasePdf";
import { TIME_PATTERN, todayInIsrael } from "@/lib/earlyRelease";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENTS,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  NOTES_MAX_LENGTH,
  type StandingReleaseInput,
  type StoredAttachment,
} from "@/lib/standingRelease";
import type { Child } from "@/types";

export const runtime = "nodejs";

const clean = (v: unknown, max = 200) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const isPngDataUrl = (v: string) => v.startsWith("data:image/png;base64,");

/** Looks at the first bytes so a renamed file cannot pass as a PDF or an image. */
function sniff(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const childId = clean(fd.get("childId"), 60);
    const raw = JSON.parse(String(fd.get("form") ?? "{}")) as Partial<StandingReleaseInput>;
    if (!childId) return NextResponse.json({ error: "חסרים פרטים." }, { status: 400 });

    const data: StandingReleaseInput = {
      kindergartenName: clean(raw.kindergartenName, 60),
      releaseTime: clean(raw.releaseTime, 5),
      startDate: clean(raw.startDate, 10),
      notes: clean(raw.notes, NOTES_MAX_LENGTH),
      parent1Name: clean(raw.parent1Name, 100),
      parent1Signature: String(raw.parent1Signature ?? ""),
      parent2Name: clean(raw.parent2Name, 100),
      parent2Signature: String(raw.parent2Signature ?? ""),
    };

    if (!data.kindergartenName || !data.parent1Name) {
      return NextResponse.json({ error: "יש למלא את כל שדות החובה." }, { status: 400 });
    }
    if (!TIME_PATTERN.test(data.releaseTime)) {
      return NextResponse.json({ error: "שעת היציאה לא תקינה." }, { status: 400 });
    }
    const today = todayInIsrael();
    const limit = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate) || data.startDate < today || data.startDate > limit) {
      return NextResponse.json({ error: "תאריך ההתחלה לא תקין. אפשר לבחור מהיום ועד שנה קדימה." }, { status: 400 });
    }
    if (!isPngDataUrl(data.parent1Signature)) {
      return NextResponse.json({ error: "חתימת ההורה הראשון חסרה." }, { status: 400 });
    }
    // A second parent is optional, but name and signature go together.
    if (data.parent2Name || data.parent2Signature) {
      if (!data.parent2Name || !isPngDataUrl(data.parent2Signature)) {
        return NextResponse.json({ error: "להורה השני יש למלא גם שם וגם חתימה, או להשאיר את שניהם ריקים." }, { status: 400 });
      }
    }

    // Attachments
    const files = fd.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
    if (files.length > MAX_ATTACHMENTS) {
      return NextResponse.json({ error: `אפשר לצרף עד ${MAX_ATTACHMENTS} קבצים.` }, { status: 400 });
    }
    let total = 0;
    const attachments: { name: string; type: string; bytes: Uint8Array }[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `הקובץ "${f.name}" גדול מדי (עד 4MB לקובץ).` }, { status: 400 });
      }
      total += f.size;
      const bytes = new Uint8Array(await f.arrayBuffer());
      const type = sniff(bytes);
      if (!type || !ALLOWED_ATTACHMENT_TYPES.includes(type)) {
        return NextResponse.json({ error: `הקובץ "${f.name}" אינו PDF או תמונה (JPG, PNG).` }, { status: 400 });
      }
      attachments.push({ name: f.name.slice(0, 120), type, bytes });
    }
    if (total > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: "סך כל הקבצים גדול מדי (עד 5MB)." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: child } = await supabase.from("children").select("*").eq("id", childId).single<Child>();
    if (!child) {
      return NextResponse.json({ error: "הילד/ה לא נמצא/ה ברשימה הפעילה." }, { status: 404 });
    }

    const submittedAt = new Date();
    const formPdf = await generateStandingReleasePdf({ child, form: data, submittedAt });
    let packagePdf: Uint8Array;
    try {
      packagePdf = await buildPackagePdf(formPdf, attachments);
    } catch (e) {
      console.error("standing release package failed:", e);
      return NextResponse.json(
        { error: "לא הצלחנו לקרוא אחד הקבצים. אם זה PDF עם סיסמה, אפשר לצלם אותו ולצרף כתמונה." },
        { status: 400 }
      );
    }

    // ASCII-only storage keys (Hebrew in object keys is rejected by storage).
    const id = randomUUID();
    const base = `standing-release/${id}`;
    const upload = async (path: string, body: Uint8Array, contentType: string) => {
      const { error } = await supabase.storage.from("consent-pdfs").upload(path, body, { contentType, upsert: false });
      if (error) throw error;
    };

    const stored: StoredAttachment[] = [];
    try {
      await upload(`${base}_form.pdf`, formPdf, "application/pdf");
      await upload(`${base}_package.pdf`, packagePdf, "application/pdf");
      for (let i = 0; i < attachments.length; i++) {
        const a = attachments[i];
        const ext = a.type === "application/pdf" ? "pdf" : a.type === "image/png" ? "png" : "jpg";
        const path = `${base}_doc${i + 1}.${ext}`;
        await upload(path, a.bytes, a.type);
        stored.push({ path, name: a.name, type: a.type });
      }
    } catch (e) {
      console.error("standing release upload failed:", e);
      return NextResponse.json({ error: "שגיאה בשמירת הקבצים. נסו שוב." }, { status: 500 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error: insertError } = await supabase.from("standing_releases").insert({
      id,
      child_id: childId,
      kindergarten_name: data.kindergartenName,
      release_time: data.releaseTime,
      start_date: data.startDate,
      notes: data.notes || null,
      parent1_name: data.parent1Name,
      parent1_signature: data.parent1Signature,
      parent2_name: data.parent2Name || null,
      parent2_signature: data.parent2Signature || null,
      attachments: stored,
      pdf_storage_path: `${base}_form.pdf`,
      package_storage_path: `${base}_package.pdf`,
      ip_address: ip,
    });
    if (insertError) {
      console.error("standing release insert failed:", insertError);
      return NextResponse.json({ error: "שגיאה בשמירת הטופס. נסו שוב." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in submit-standing-release:", err);
    return NextResponse.json({ error: "שגיאה לא צפויה. נסו שוב מאוחר יותר." }, { status: 500 });
  }
}
