# Frontend migration to JWT-only authentication (Sprint 3I)

**Breaking change.** The backend now authenticates **only** with a verified
Supabase JWT. The legacy shared API key + self-asserted `x-user-id` path has been
removed. Any request without a valid `Authorization: Bearer <token>` gets a
uniform `401`.

This guide is for the `pocket-mint-fe` client. The backend change and this
frontend change are **not** deployable atomically — deploy and verify the
frontend Bearer support **first** (see the rollout plan), then deploy the
JWT-only backend.

## What every protected request must send

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

Nothing else conveys identity. **Stop sending**:

- `x-user-id`
- `x-user-email`
- `x-api-key` (and remove the hardcoded key value from the frontend source)

## 1. Read the access token from the Supabase session

The access token — not `session.user.id` — is what the backend verifies.

```ts
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token; // undefined when logged out
```

## 2. Attach it on every request

Replace the current `x-user-id` / `x-api-key` interceptor in `lib/api.ts` with a
Bearer attach. Illustrative (adapt to the real client):

```ts
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  // Do NOT set x-user-id / x-user-email / x-api-key anymore.
  return config;
});
```

## 3. `/users/sync` uses the same Bearer auth

`POST /users/sync` is now a verified-JWT bootstrap. Send the Bearer token; the
backend derives the identity from the token's `sub` and ignores any `supabaseId`
in the body (a caller can only ever sync themselves). Body carries profile
metadata only:

```ts
await fetch(`${API_URL}/users/sync`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ name }), // email is taken from the verified claim; no supabaseId, no x-api-key
});
```

Because sync now requires a token, it must run where a session exists:

- **Email/password signup** with email confirmation OFF, **OAuth callback**, and
  **login** all have a session — sync works there.
- **Signup with email confirmation ON** has no session until the user confirms;
  rely on the existing login-time self-heal (idempotent sync) to provision the
  local user on first authenticated visit.

## 4. Session refresh

Keep using the Supabase client's automatic token refresh (`autoRefreshToken`).
Reading the token via `getSession()` immediately before each request means an
expired token is refreshed transparently. Follow the app's established
auth-refresh policy — no custom retry loop is required by the backend.

## 5. Handle the uniform 401

Every auth failure returns exactly:

```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Invalid or missing authentication credentials" }
}
```

The body never distinguishes *why* (missing vs expired vs wrong signature). On a
`401`, refresh the session once and retry per the app's policy; if it still
fails, return the user to login.

## 6. CORS / preflight expectations

The backend now advertises only `Authorization` and `Content-Type` as allowed
request headers. A preflight requesting `x-user-id` / `x-api-key` will no longer
list them as allowed. Requesting only `Authorization, Content-Type` keeps
preflight valid. Allowed origins and methods are unchanged; unknown origins are
still rejected.

## Do not

- Do not send real tokens or keys in committed code, logs, or fixtures.
- Do not reintroduce a shared-key fallback "just in case" — the backend has none.
