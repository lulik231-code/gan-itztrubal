import { createClient } from "@supabase/supabase-js";
import type { StoredAttachment, ScheduleEntry, ReleaseType } from "@/lib/standingRelease";

export interface InspectorView {
  id: string;
  child_id: string;
  child_name: string;
  class_name: string | null;
  kindergarten_name: string;
  release_type: ReleaseType;
  reason_text: string | null;
  schedule: ScheduleEntry[];
  start_date: string;
  notes: string | null;
  parent1_name: string;
  parent1_signature: string | null;
  parent2_name: string | null;
  parent2_signature: string | null;
  attachments: StoredAttachment[];
  pdf_storage_path: string;
  package_storage_path: string;
  submitted_at: string;
  expires_at: string;
}

export const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

export function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

/** Null when the link is unknown, expired, or the form has already been signed. */
export async function loadInspectorView(token: string): Promise<InspectorView | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const { data, error } = await anonClient().rpc("get_standing_release_for_inspector", { p_token: token });
  if (error || !data) return null;
  return data as InspectorView;
}
