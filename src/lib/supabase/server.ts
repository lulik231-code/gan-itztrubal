import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Used inside Server Components, Server Actions, and Route Handlers.
// Reads/writes the auth cookie so the admin's Google session is recognized.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component sometimes, where
            // cookie mutation isn't allowed. Safe to ignore here because
            // middleware refreshes the session on every request.
          }
        },
      },
    }
  );
}
