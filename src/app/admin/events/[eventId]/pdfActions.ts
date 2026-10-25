"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";

/**
 * The consent-pdfs bucket is private (RLS-gated). To let an admin download
 * a specific file from the browser, we mint a short-lived signed URL
 * server-side (where we've already verified admin status) rather than
 * exposing the bucket or a service-role key to the client.
 */
export async function getSignedPdfUrl(storagePath: string): Promise<string | null> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("consent-pdfs")
    .createSignedUrl(storagePath, 60 * 5); // 5 minutes, plenty for a click-to-download

  if (error || !data) {
    console.error("getSignedPdfUrl error:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * מוחק הגשה — שורת ה-DB וה-PDF מהאחסון.
 * מוגן בדרישת אדמין בלבד.
 */
export async function deleteSubmissionAction(
  submissionId: string,
  pdfStoragePath: string | null
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  // מחיקת קובץ ה-PDF מהאחסון (אם קיים)
  if (pdfStoragePath) {
    const { error: storageError } = await supabase.storage
      .from("consent-pdfs")
      .remove([pdfStoragePath]);
    if (storageError) {
      console.error("deleteSubmission storage error:", storageError);
    }
  }

  // מחיקת שורת ה-DB
  const { error: dbError } = await supabase
    .from("consent_submissions")
    .delete()
    .eq("id", submissionId);

  if (dbError) {
    console.error("deleteSubmission db error:", dbError);
    return { success: false, error: dbError.message };
  }

  return { success: true };
}

/**
 * Opens (or closes) editing for one specific child on the day of the event.
 * Only this child's parent gets access; everyone else stays locked.
 */
export async function setEditAccessAction(
  eventId: string,
  childId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const { user } = await requireAdmin();
  const supabase = await createClient();

  const { error } = enabled
    ? await supabase
        .from("event_edit_access")
        .upsert({ event_id: eventId, child_id: childId, granted_by: user.email }, { onConflict: "event_id,child_id" })
    : await supabase.from("event_edit_access").delete().eq("event_id", eventId).eq("child_id", childId);

  if (error) {
    console.error("setEditAccessAction error:", error);
    return { success: false, error: error.message };
  }
  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}
