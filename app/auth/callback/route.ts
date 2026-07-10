import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveUserName, syncUserToBackend } from "@/lib/auth/sync-user";

/**
 * OAuth callback — Supabase redirects here with `?code` after Google consent.
 * Exchanges the code for a session (sets auth cookies), syncs the user into the
 * backend Prisma table, then forwards to the app.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent("Missing authorization code.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // Ensure the OAuth user exists in the backend (they never hit signup()).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    await syncUserToBackend({
      supabaseId: user.id,
      email: user.email,
      name: resolveUserName(user),
    });
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
