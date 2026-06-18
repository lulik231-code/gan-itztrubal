import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Verifies the current session belongs to a signed-in, allowlisted admin.
 * Redirects to /admin/login if not signed in, or /admin/unauthorized if
 * signed in with a Google account that isn't on the allowlist.
 *
 * Call this at the top of every admin page (server component) that needs
 * to be protected beyond what the proxy/middleware already guarantees
 * (middleware only checks "is there a session", not "is this email allowed").
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: allowlistEntry } = await supabase
    .from("admin_allowlist")
    .select("email, full_name")
    .eq("email", user.email)
    .maybeSingle();

  if (!allowlistEntry) {
    redirect("/admin/unauthorized");
  }

  return { user, adminProfile: allowlistEntry };
}
