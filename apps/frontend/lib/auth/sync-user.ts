import type { User } from "@supabase/supabase-js";

/**
 * Sync a Supabase Auth user into the backend Prisma `users` table.
 * Idempotent — the backend returns the existing record if the email is known.
 * Server-only: uses the backend API key. Never import into client components.
 *
 * Non-throwing: a failed sync must never block auth. Errors are logged and
 * swallowed so signup/OAuth still completes (user exists in Supabase regardless).
 */
export async function syncUserToBackend(params: {
  supabaseId: string;
  email: string;
  name: string;
}): Promise<void> {
  const { supabaseId, email, name } = params;

  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1"}/users/sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.API_KEY || "kunci_rahasia_pocket_mint_2026",
        },
        body: JSON.stringify({ supabaseId, email, name }),
      }
    );
  } catch (syncError) {
    console.error("Failed to sync user to backend:", syncError);
  }
}

/**
 * Derive a display name for a Supabase user. Prefers OAuth/profile metadata,
 * falls back to the email local-part so `/users/sync` (which requires a name)
 * never receives an empty value.
 */
export function resolveUserName(user: User): string {
  const meta = user.user_metadata ?? {};
  const fromMeta = meta.full_name || meta.name;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  const email = user.email ?? "";
  const localPart = email.split("@")[0];
  return localPart || "User";
}
