"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";

export async function deleteEarlyReleaseAction(
  id: string,
  pdfStoragePath: string | null
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  if (pdfStoragePath) {
    const { error: storageError } = await supabase.storage.from("consent-pdfs").remove([pdfStoragePath]);
    if (storageError) console.error("deleteEarlyRelease storage error:", storageError);
  }

  const { error } = await supabase.from("early_releases").delete().eq("id", id);
  if (error) {
    console.error("deleteEarlyRelease db error:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/admin/early-release");
  return { success: true };
}
