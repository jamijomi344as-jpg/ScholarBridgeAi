import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * OAuth callback (Google etc.). Supabase redirects the user back here with
 * ?code=... after they authorize. We exchange the code for a session cookie,
 * then send the user into the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Always prefer a real public NEXT_PUBLIC_APP_URL when it is configured —
  // even if the request somehow arrives at a localhost origin. This keeps
  // the user on the production domain.
  const envBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const envIsLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(envBase);
  const appBase = !envIsLocal && envBase ? envBase : origin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && supabaseAnonKey) {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
            // ignore — middleware refreshes the session anyway
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appBase}${next}`);
    }
    console.error("OAuth code exchange error:", error);
  }

  // Fallback: no code / failed exchange → home page (session check decides).
  return NextResponse.redirect(`${appBase}/`);
}
