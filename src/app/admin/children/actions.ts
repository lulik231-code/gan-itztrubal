"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";

export interface ChildImportRow {
  full_name: string;
  class_name?: string;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  error?: string;
}

/** Bulk-imports children parsed from an uploaded Excel/CSV file. */
export async function importChildrenAction(rows: ChildImportRow[]): Promise<ImportResult> {
  await requireAdmin();
  const supabase = await createClient();

  const validRows = rows
    .map((r) => ({ full_name: r.full_name?.trim(), class_name: r.class_name?.trim() || null }))
    .filter((r) => r.full_name);

  if (validRows.length === 0) {
    return { inserted: 0, skipped: rows.length, error: "לא נמצאו שורות תקינות בקובץ." };
  }

  const { error, count } = await supabase
    .from("children")
    .insert(
      validRows.map((r) => ({ full_name: r.full_name, class_name: r.class_name, is_active: true })),
      { count: "exact" }
    )
    .select("id");

  if (error) {
    console.error("importChildrenAction error:", error);
    return { inserted: 0, skipped: rows.length, error: "שגיאה בייבוא הרשימה. נסו שוב." };
  }

  revalidatePath("/admin/children");
  return { inserted: count ?? validRows.length, skipped: rows.length - validRows.length };
}

export async function addChildAction(fullName: string, className: string): Promise<{ error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  if (!fullName.trim()) {
    return { error: "שם הילד/ה הוא שדה חובה." };
  }

  const { error } = await supabase
    .from("children")
    .insert({ full_name: fullName.trim(), class_name: className.trim() || null, is_active: true });

  if (error) {
    console.error("addChildAction error:", error);
    return { error: "שגיאה בהוספת הילד/ה." };
  }

  revalidatePath("/admin/children");
  return {};
}

export async function toggleChildActiveAction(childId: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("children").update({ is_active: isActive }).eq("id", childId);
  revalidatePath("/admin/children");
}

export async function deleteChildAction(childId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("children").delete().eq("id", childId);
  revalidatePath("/admin/children");
}
