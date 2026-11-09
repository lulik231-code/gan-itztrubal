import { NextRequest, NextResponse } from "next/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The admin uploads the copy the inspector signed and sent back. Admin only.
 * The file goes into the private bucket and the request moves to "approved".
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר." }, { status: 401 });
    const { data: allowed } = await supabase
      .from("admin_allowlist")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();
    if (!allowed) return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });

    const fd = await req.formData();
    const id = String(fd.get("id") ?? "");
    const file = fd.get("file");
    if (!id || !file || typeof file === "string" || file.size === 0) {
      return NextResponse.json({ error: "חסר קובץ." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "הקובץ גדול מדי (עד 5MB)." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let ext: string, type: string;
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) [ext, type] = ["pdf", "application/pdf"];
    else if (bytes[0] === 0xff && bytes[1] === 0xd8) [ext, type] = ["jpg", "image/jpeg"];
    else if (bytes[0] === 0x89 && bytes[1] === 0x50) [ext, type] = ["png", "image/png"];
    else return NextResponse.json({ error: "יש להעלות קובץ PDF או תמונה." }, { status: 400 });

    const { data: row } = await supabase
      .from("standing_releases")
      .select("id, signed_storage_path")
      .eq("id", id)
      .single();
    if (!row) return NextResponse.json({ error: "הטופס לא נמצא." }, { status: 404 });

    // The bucket accepts uploads from the public client key only (no admin insert rule), so use it here.
    const storage = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const path = `standing-release/${id}_signed_${Date.now()}.${ext}`;
    const { error: uploadError } = await storage.storage
      .from("consent-pdfs")
      .upload(path, bytes, { contentType: type, upsert: false });
    if (uploadError) {
      console.error("signed upload failed:", uploadError);
      return NextResponse.json({ error: "שגיאה בשמירת הקובץ." }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("standing_releases")
      .update({ status: "approved", signed_storage_path: path, approved_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) {
      console.error("signed update failed:", updateError);
      return NextResponse.json({ error: "שגיאה בעדכון הטופס." }, { status: 500 });
    }

    // Remove the previously uploaded signed copy, if any.
    if (row.signed_storage_path) {
      await supabase.storage.from("consent-pdfs").remove([row.signed_storage_path]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in standing-release-signed:", err);
    return NextResponse.json({ error: "שגיאה לא צפויה." }, { status: 500 });
  }
}
