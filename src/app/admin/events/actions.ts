"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface EventActionResult {
  error?: string;
}

export async function createEventAction(formData: FormData): Promise<EventActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const eventDate = formData.get("event_date") as string;
  const consentText = (formData.get("consent_text") as string)?.trim();
  const requiresHealthDeclaration = formData.get("requires_health_declaration") === "on";

  if (!title) {
    return { error: "שם האירוע הוא שדה חובה." };
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      description: description || null,
      event_date: eventDate || null,
      consent_text: consentText || undefined,
      requires_health_declaration: requiresHealthDeclaration,
      created_by: user.email,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createEventAction error:", error);
    return { error: "שגיאה ביצירת האירוע. נסו שוב." };
  }

  revalidatePath("/admin/dashboard");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<EventActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const eventDate = formData.get("event_date") as string;
  const consentText = (formData.get("consent_text") as string)?.trim();
  const requiresHealthDeclaration = formData.get("requires_health_declaration") === "on";
  const isActive = formData.get("is_active") === "on";

  if (!title) {
    return { error: "שם האירוע הוא שדה חובה." };
  }

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description: description || null,
      event_date: eventDate || null,
      consent_text: consentText || undefined,
      requires_health_declaration: requiresHealthDeclaration,
      is_active: isActive,
    })
    .eq("id", eventId);

  if (error) {
    console.error("updateEventAction error:", error);
    return { error: "שגיאה בעדכון האירוע. נסו שוב." };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/events/${eventId}`);
  return {};
}

export async function deleteEventAction(eventId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId);
  revalidatePath("/admin/dashboard");
  redirect("/admin/dashboard");
}
