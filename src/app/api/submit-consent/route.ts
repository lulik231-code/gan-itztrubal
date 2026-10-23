import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateConsentPdf } from "@/lib/pdf/generateConsentPdf";
import type { Event, Child, ParentFormInput } from "@/types";

export const runtime = "nodejs"; // needs Node's fs to read the embedded font file

interface SubmitConsentBody {
  eventId: string;
  childId: string;
  form: ParentFormInput;
  /** Set when a parent edits an existing submission: the phone number on the original form. */
  editVerifyPhone?: string;
}

function getAnonClient() {
  // Uses the public anon key — the same privilege level the browser would
  // have. RLS policies (see migrations) already restrict this client to:
  // reading active events/children, inserting a submission row only when
  // the referenced event+child are active, and uploading into the
  // consent-pdfs bucket. No service-role key is used or needed here.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitConsentBody;
    const { eventId, childId, form, editVerifyPhone } = body;

    // ---- basic input validation (defense in depth alongside RLS) ----
    if (!eventId || !childId) {
      return NextResponse.json({ error: "חסרים פרטי אירוע או ילד." }, { status: 400 });
    }
    if (!form?.parentFullName?.trim() || !form?.parentPhone?.trim()) {
      return NextResponse.json({ error: "יש למלא שם וטלפון הורה." }, { status: 400 });
    }
    if (!form?.signatureDataUrl) {
      return NextResponse.json({ error: "חתימה דיגיטלית חסרה." }, { status: 400 });
    }
    if (!form.generalConsentChecked) {
      return NextResponse.json({ error: "יש לאשר את ההסכמה הכללית." }, { status: 400 });
    }

    const supabase = getAnonClient();

    // ---- fetch event + child (also re-validates they're active via RLS) ----
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single<Event>();

    if (eventError || !event) {
      return NextResponse.json({ error: "האירוע לא נמצא או אינו פעיל." }, { status: 404 });
    }

    const { data: child, error: childError } = await supabase
      .from("children")
      .select("*")
      .eq("id", childId)
      .single<Child>();

    if (childError || !child) {
      return NextResponse.json({ error: "הילד/ה לא נמצא/ה ברשימה הפעילה." }, { status: 404 });
    }

    if (event.requires_health_declaration && !form.healthDeclarationChecked) {
      return NextResponse.json({ error: "יש לאשר את ההצהרה הבריאותית." }, { status: 400 });
    }

    // Fail fast on a bad edit attempt, before spending time on the PDF/upload.
    if (editVerifyPhone) {
      const { data: existing } = await supabase.rpc("get_submission_for_edit", {
        p_event: eventId,
        p_child: childId,
        p_phone: editVerifyPhone,
      });
      if (!existing) {
        return NextResponse.json(
          { error: "לא ניתן לערוך את הטופס: העריכה נחסמה (ביום האירוע ואילך) או שמספר הטלפון אינו תואם." },
          { status: 403 }
        );
      }
    }

    const submittedAt = new Date();

    // ---- generate the stamped PDF ----
    const pdfBytes = await generateConsentPdf({ event, child, form, submittedAt });

    // ---- upload to storage ----
    // Storage object keys must be ASCII-safe: Supabase Storage's S3-compatible
    // backend rejects keys containing non-ASCII bytes (Hebrew characters caused
    // every upload to fail with a 400, even though the previous regex correctly
    // identified Hebrew chars as "safe to keep" for readability — they are NOT
    // safe in a storage key, only in display text). Use a plain ASCII-only
    // path; the actual Hebrew child name is already stored in submissions.parent_full_name
    // and embedded in the PDF itself, so nothing is lost by keeping the path opaque.
    const storagePath = `${eventId}/${childId}_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("consent-pdfs")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("PDF upload failed:", uploadError);
      return NextResponse.json({ error: "שגיאה בשמירת הקובץ. נסו שוב." }, { status: 500 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const healthNotes = event.requires_health_declaration
      ? form.healthNotes?.trim().slice(0, 1000) || null
      : null;

    // ---- edit an existing submission (allowed until the day of the event) ----
    if (editVerifyPhone) {
      const { data: updated, error: updateError } = await supabase.rpc("update_submission_for_edit", {
        p_event: eventId,
        p_child: childId,
        p_verify_phone: editVerifyPhone,
        p_parent_full_name: form.parentFullName.trim(),
        p_parent_phone: form.parentPhone.trim(),
        p_parent_id_number: form.parentIdNumber?.trim() || null,
        p_notes: form.notes?.trim() || null,
        p_health_declaration_checked: form.healthDeclarationChecked,
        p_health_notes: healthNotes,
        p_general_consent_checked: form.generalConsentChecked,
        p_photo_consent_checked: form.photoConsentChecked,
        p_signature_data_url: form.signatureDataUrl,
        p_pdf_storage_path: storagePath,
        p_ip: ip,
      });
      if (updateError) {
        console.error("Submission update failed:", updateError);
        return NextResponse.json({ error: "שגיאה בעדכון הטופס. נסו שוב." }, { status: 500 });
      }
      if (!updated) {
        return NextResponse.json(
          { error: "לא ניתן לערוך את הטופס: העריכה נחסמה (ביום האירוע ואילך) או שמספר הטלפון אינו תואם." },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true, edited: true });
    }

    // ---- insert the submission row ----
    const { error: insertError } = await supabase.from("submissions").insert({
      event_id: eventId,
      child_id: childId,
      parent_full_name: form.parentFullName.trim(),
      parent_phone: form.parentPhone.trim(),
      parent_id_number: form.parentIdNumber?.trim() || null,
      notes: form.notes?.trim() || null,
      health_declaration_checked: form.healthDeclarationChecked,
      health_notes: healthNotes,
      general_consent_checked: form.generalConsentChecked,
      photo_consent_checked: form.photoConsentChecked,
      signature_data_url: form.signatureDataUrl,
      pdf_storage_path: storagePath,
      submitted_at: submittedAt.toISOString(),
      ip_address: ip,
    });

    if (insertError) {
      // Unique constraint violation = duplicate submission for this child+event
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "טופס ההסכמה עבור ילד זה ואירוע זה כבר הוגש בעבר." },
          { status: 409 }
        );
      }
      console.error("Submission insert failed:", insertError);
      return NextResponse.json({ error: "שגיאה בשמירת ההגשה. נסו שוב." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in submit-consent:", err);
    return NextResponse.json({ error: "שגיאה לא צפויה. נסו שוב מאוחר יותר." }, { status: 500 });
  }
}
