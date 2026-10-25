import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateEarlyReleasePdf } from "@/lib/pdf/generateEarlyReleasePdf";
import {
  ID_NUMBER_PATTERN,
  TIME_PATTERN,
  todayInIsrael,
  type EarlyReleaseFormInput,
} from "@/lib/earlyRelease";
import type { Child } from "@/types";

export const runtime = "nodejs";

interface Body {
  childId: string;
  form: EarlyReleaseFormInput;
}

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const digits = (v: unknown) => clean(v, 30).replace(/[\s-]/g, "");

export async function POST(req: NextRequest) {
  try {
    const { childId, form } = (await req.json()) as Body;
    if (!childId || !form) {
      return NextResponse.json({ error: "חסרים פרטים." }, { status: 400 });
    }

    const data: EarlyReleaseFormInput = {
      teacherName: clean(form.teacherName, 100),
      parentFullName: clean(form.parentFullName, 100),
      parentIdNumber: digits(form.parentIdNumber),
      parentPhone: clean(form.parentPhone, 30),
      childIdNumber: digits(form.childIdNumber),
      releaseTime: clean(form.releaseTime, 5),
      pickupName: clean(form.pickupName, 100),
      pickupRelation: clean(form.pickupRelation, 60),
      pickupPhone: clean(form.pickupPhone, 30),
      clausesChecked: form.clausesChecked === true,
      signatureDataUrl: String(form.signatureDataUrl ?? ""),
    };

    if (
      !data.teacherName || !data.parentFullName || !data.parentPhone || !data.pickupName ||
      !data.pickupRelation || !data.pickupPhone
    ) {
      return NextResponse.json({ error: "יש למלא את כל השדות." }, { status: 400 });
    }
    if (!ID_NUMBER_PATTERN.test(data.parentIdNumber) || !ID_NUMBER_PATTERN.test(data.childIdNumber)) {
      return NextResponse.json({ error: "מספר תעודת זהות לא תקין." }, { status: 400 });
    }
    if (!TIME_PATTERN.test(data.releaseTime)) {
      return NextResponse.json({ error: "שעת האיסוף לא תקינה." }, { status: 400 });
    }
    if (!data.clausesChecked) {
      return NextResponse.json({ error: "יש לאשר את כל סעיפי ההצהרה." }, { status: 400 });
    }
    if (!data.signatureDataUrl.startsWith("data:image/png;base64,")) {
      return NextResponse.json({ error: "חתימה דיגיטלית חסרה." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // The teacher must be one of the names in the admin-managed list (when a list exists).
    const { data: teachers } = await supabase.from("kindergarten_teachers").select("full_name");
    if (teachers && teachers.length > 0 && !teachers.some((t) => t.full_name === data.teacherName)) {
      return NextResponse.json({ error: "יש לבחור גננת מהרשימה." }, { status: 400 });
    }

    const { data: child } = await supabase
      .from("children")
      .select("*")
      .eq("id", childId)
      .single<Child>();
    if (!child) {
      return NextResponse.json({ error: "הילד/ה לא נמצא/ה ברשימה הפעילה." }, { status: 404 });
    }

    // The release date is always today in Israel, decided here (and again by the database).
    const releaseDate = todayInIsrael();
    const submittedAt = new Date();

    const pdfBytes = await generateEarlyReleasePdf({ child, form: data, releaseDate, submittedAt });

    // ASCII-only storage key (Hebrew in object keys is rejected by storage).
    const storagePath = `early-release/${childId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("consent-pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      console.error("early release PDF upload failed:", uploadError);
      return NextResponse.json({ error: "שגיאה בשמירת הקובץ. נסו שוב." }, { status: 500 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error: insertError } = await supabase.from("early_releases").insert({
      child_id: childId,
      release_time: data.releaseTime,
      teacher_name: data.teacherName || null,
      parent_full_name: data.parentFullName,
      parent_id_number: data.parentIdNumber,
      parent_phone: data.parentPhone,
      child_id_number: data.childIdNumber,
      pickup_name: data.pickupName,
      pickup_id_number: "", // no longer collected; column is NOT NULL
      pickup_relation: data.pickupRelation,
      pickup_phone: data.pickupPhone,
      signature_data_url: data.signatureDataUrl,
      pdf_storage_path: storagePath,
      ip_address: ip,
    });
    if (insertError) {
      console.error("early release insert failed:", insertError);
      return NextResponse.json({ error: "שגיאה בשמירת הטופס. נסו שוב." }, { status: 500 });
    }

    return NextResponse.json({ success: true, releaseDate });
  } catch (err) {
    console.error("Unexpected error in submit-early-release:", err);
    return NextResponse.json({ error: "שגיאה לא צפויה. נסו שוב מאוחר יותר." }, { status: 500 });
  }
}
