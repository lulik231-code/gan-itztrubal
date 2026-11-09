import { NextRequest, NextResponse } from "next/server";
import { generateStandingReleasePdf, buildPackagePdf } from "@/lib/pdf/generateStandingReleasePdf";
import { todayInIsrael } from "@/lib/earlyRelease";
import { anonClient, loadInspectorView, TOKEN_PATTERN } from "@/lib/inspectorLink";
import type { Child } from "@/types";

export const runtime = "nodejs";

const INVALID = "הקישור אינו תקף או שפג תוקפו. יש לפנות לצוות הגן לקבלת קישור חדש.";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; name?: string; signature?: string };
    const token = String(body.token ?? "");
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
    const signature = String(body.signature ?? "");

    if (!TOKEN_PATTERN.test(token)) return NextResponse.json({ error: INVALID }, { status: 404 });
    if (!name) return NextResponse.json({ error: "יש להזין שם." }, { status: 400 });
    if (!signature.startsWith("data:image/png;base64,") || signature.length > 600_000) {
      return NextResponse.json({ error: "חתימה לא תקינה." }, { status: 400 });
    }

    const view = await loadInspectorView(token);
    if (!view) return NextResponse.json({ error: INVALID }, { status: 404 });

    const supabase = anonClient();
    const now = new Date();

    // Rebuild the form with the inspector's signature, then attach the parents' documents after it.
    const formPdf = await generateStandingReleasePdf({
      child: { id: view.child_id, full_name: view.child_name } as Child,
      form: {
        kindergartenName: view.kindergarten_name,
        releaseType: view.release_type,
        reasonText: view.reason_text ?? "",
        schedule: view.schedule,
        startDate: view.start_date,
        notes: view.notes ?? "",
        parent1Name: view.parent1_name,
        parent1Signature: view.parent1_signature ?? "",
        parent2Name: view.parent2_name ?? "",
        parent2Signature: view.parent2_signature ?? "",
      },
      submittedAt: new Date(view.submitted_at),
      inspector: { name, signatureDataUrl: signature, signedDate: todayInIsrael(), signedAt: now },
    });

    const attachments = [];
    for (const a of view.attachments) {
      const { data, error } = await supabase.storage.from("consent-pdfs").download(a.path);
      if (error || !data) {
        console.error("inspector-sign: attachment download failed", error);
        return NextResponse.json({ error: "לא הצלחנו לקרוא את המסמכים המצורפים. נסו שוב." }, { status: 500 });
      }
      attachments.push({ type: a.type, bytes: new Uint8Array(await data.arrayBuffer()) });
    }
    const finalPdf = await buildPackagePdf(formPdf, attachments);

    const path = `standing-release/${view.id}_signed_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("consent-pdfs")
      .upload(path, finalPdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      console.error("inspector-sign: upload failed", uploadError);
      return NextResponse.json({ error: "שגיאה בשמירת הקובץ. נסו שוב." }, { status: 500 });
    }

    // Closes the link and moves the form to "approved". Fails if the link was revoked in the meantime.
    const { data: ok, error: finalizeError } = await supabase.rpc("finalize_standing_release_signed", {
      p_token: token,
      p_path: path,
      p_name: name,
    });
    if (finalizeError || ok !== true) {
      console.error("inspector-sign: finalize failed", finalizeError);
      return NextResponse.json({ error: INVALID }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in inspector-sign:", err);
    return NextResponse.json({ error: "שגיאה לא צפויה. נסו שוב מאוחר יותר." }, { status: 500 });
  }
}
