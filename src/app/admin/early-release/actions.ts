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

export async function addTeacherAction(fullName: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const name = fullName.trim().slice(0, 100);
  if (!name) return { success: false, error: "יש להזין שם." };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("kindergarten_teachers")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.sort_order ?? 0) + 1;
  const { error } = await supabase.from("kindergarten_teachers").insert({ full_name: name, sort_order: nextOrder });
  if (error) {
    console.error("addTeacher error:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/admin/early-release");
  revalidatePath("/early-release");
  return { success: true };
}

export async function renameTeacherAction(id: string, fullName: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const name = fullName.trim().slice(0, 100);
  if (!name) return { success: false, error: "יש להזין שם." };
  const supabase = await createClient();
  const { error } = await supabase.from("kindergarten_teachers").update({ full_name: name }).eq("id", id);
  if (error) {
    console.error("renameTeacher error:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/admin/early-release");
  revalidatePath("/early-release");
  return { success: true };
}

export async function deleteTeacherAction(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("kindergarten_teachers").delete().eq("id", id);
  if (error) {
    console.error("deleteTeacher error:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/admin/early-release");
  revalidatePath("/early-release");
  return { success: true };
}
