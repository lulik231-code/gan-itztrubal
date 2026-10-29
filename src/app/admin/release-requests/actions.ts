"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";

export async function deleteReleaseRequestAction(
  id: string,
  pdfStoragePath: string | null
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  if (pdfStoragePath) {
    const { error: storageError } = await supabase.storage.from("consent-pdfs").remove([pdfStoragePath]);
    if (storageError) console.error("deleteReleaseRequest storage error:", storageError);
  }

  const { error } = await supabase.from("release_requests").delete().eq("id", id);
  if (error) {
    console.error("deleteReleaseRequest db error:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/admin/release-requests");
  return { success: true };
}
