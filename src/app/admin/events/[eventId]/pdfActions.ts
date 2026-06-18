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
