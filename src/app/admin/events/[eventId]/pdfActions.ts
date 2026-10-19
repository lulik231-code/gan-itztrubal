"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";

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
