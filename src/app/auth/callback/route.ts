import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Handles the redirect back from Google after the admin signs in.
// Supabase's PKCE flow sends a `code` param here; we exchange it for a
// session, which sets the auth cookies, then send the admin onward.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin/dashboard";

  let reason = "no_code";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    reason = error.message;

    // The code may already have been used by a duplicate request (browsers
    // sometimes fire the callback twice). If a valid session exists anyway,
    // just continue to the dashboard.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/admin/login?error=auth_failed&reason=${encodeURIComponent(reason)}`
  );
}
