import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateReleaseRequestPdf } from "@/lib/pdf/generateReleaseRequestPdf";
import { TIME_PATTERN, todayInIsrael } from "@/lib/earlyRelease";
import { REASON_MAX_LENGTH, type ReleaseRequestInput } from "@/lib/releaseRequest";
import type { Child } from "@/types";

export const runtime = "nodejs";

interface Body {
  childId: string;
  form: ReleaseRequestInput;
}

const clean = (v: unknown, max = 200) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export async function POST(req: NextRequest) {
  try {
    const { childId, form } = (await req.json()) as Body;
    if (!childId || !form) {
      return NextResponse.json({ error: "חסרים פרטים." }, { status: 400 });
    }

    const data: ReleaseRequestInput = {
      teacherName: clean(form.teacherName, 100),
      kindergartenName: clean(form.kindergartenName, 60),
      requestDate: clean(form.requestDate, 10),
      fromTime: clean(form.fromTime, 5),
      toTime: clean(form.toTime, 5),
      parentFullName: clean(form.parentFullName, 100),
      parentRelation: clean(form.parentRelation, 60),
      pickupName: clean(form.pickupName, 100),
      pickupPhone: clean(form.pickupPhone, 30),
      reason: clean(form.reason, REASON_MAX_LENGTH),
      signatureDataUrl: String(form.signatureDataUrl ?? ""),
    };

    if (
      !data.teacherName || !data.kindergartenName || !data.parentFullName || !data.parentRelation ||
      !data.pickupName || !data.pickupPhone || !data.reason
    ) {
      return NextResponse.json({ error: "יש למלא את כל השדות." }, { status: 400 });
    }
    if (!TIME_PATTERN.test(data.fromTime) || !TIME_PATTERN.test(data.toTime) || data.toTime <= data.fromTime) {
      return NextResponse.json({ error: "השעות לא תקינות. שעת הסיום חייבת להיות אחרי שעת ההתחלה." }, { status: 400 });
    }

    const today = todayInIsrael();
    const limit = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.requestDate) || data.requestDate < today || data.requestDate > limit) {
      return NextResponse.json({ error: "התאריך לא תקין. אפשר לבחור מהיום ועד שנה קדימה." }, { status: 400 });
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

    const submittedAt = new Date();
    const pdfBytes = await generateReleaseRequestPdf({ child, form: data, signedDate: today, submittedAt });

    // ASCII-only storage key (Hebrew in object keys is rejected by storage).
    const storagePath = `release-request/${childId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("consent-pdfs")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      console.error("release request PDF upload failed:", uploadError);
      return NextResponse.json({ error: "שגיאה בשמירת הקובץ. נסו שוב." }, { status: 500 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { error: insertError } = await supabase.from("release_requests").insert({
      child_id: childId,
      request_date: data.requestDate,
      from_time: data.fromTime,
      to_time: data.toTime,
      teacher_name: data.teacherName,
      kindergarten_name: data.kindergartenName,
      parent_full_name: data.parentFullName,
      parent_relation: data.parentRelation,
      pickup_name: data.pickupName,
      pickup_phone: data.pickupPhone,
      reason: data.reason,
      signature_data_url: data.signatureDataUrl,
      pdf_storage_path: storagePath,
      ip_address: ip,
    });
    if (insertError) {
      console.error("release request insert failed:", insertError);
      return NextResponse.json({ error: "שגיאה בשמירת הטופס. נסו שוב." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in submit-release-request:", err);
    return NextResponse.json({ error: "שגיאה לא צפויה. נסו שוב מאוחר יותר." }, { status: 500 });
  }
}
