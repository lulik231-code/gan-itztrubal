"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";

export async function deleteStandingReleaseAction(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("standing_releases")
    .select("pdf_storage_path, package_storage_path, signed_storage_path, attachments")
    .eq("id", id)
    .single();

  if (row) {
    const paths = [
      row.pdf_storage_path,
      row.package_storage_path,
      row.signed_storage_path,
      ...((row.attachments as { path: string }[] | null) ?? []).map((a) => a.path),
    ].filter(Boolean) as string[];
    const { error: storageError } = await supabase.storage.from("consent-pdfs").remove(paths);
    if (storageError) console.error("deleteStandingRelease storage error:", storageError);
  }

  const { error } = await supabase.from("standing_releases").delete().eq("id", id);
  if (error) {
    console.error("deleteStandingRelease db error:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/admin/standing-releases");
  return { success: true };
}

/** Back to "waiting for the inspector" (for example when a wrong file was uploaded). */
export async function reopenStandingReleaseAction(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("standing_releases")
    .update({ status: "pending", approved_at: null })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/standing-releases");
  return { success: true };
}
