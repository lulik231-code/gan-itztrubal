import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Handles the redirect back from Google after the admin signs in.
// Supabase's PKCE flow sends a `code` param here; we exchange it for a
// session, which sets the auth cookies, then send the admin onward.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`);
}
