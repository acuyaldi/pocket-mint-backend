"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PocketMintLogo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Landing page for the password-reset email link. Supabase's browser client
 * (PKCE, `detectSessionInUrl`) exchanges the recovery code in the URL for a
 * short-lived session on mount, which authorizes the `updateUser` call below.
 * After a successful update we sign the recovery session out and bounce the
 * user back to /login so they re-authenticate with the new password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks whether a valid recovery session was detected from the URL.
  const [sessionReady, setSessionReady] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    // The recovery code is exchanged asynchronously; both the immediate
    // session check and the PASSWORD_RECOVERY event cover the timing.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        setSessionReady(true);
        setVerifying(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) setSessionReady(true);
      setVerifying(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Same lightweight validation convention used across the auth pages:
    // valid input is a password of at least 8 characters that matches confirm.
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Force a clean re-login with the new credentials.
    await supabase.auth.signOut();
    router.replace(
      `/login?message=${encodeURIComponent(
        "Password updated. Please sign in with your new password."
      )}`
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>

        <Card className="surface-card w-full border-white/90 py-0 shadow-none">
          <CardHeader className="border-b border-border/70 px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <PocketMintLogo className="h-6 w-6" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-white/82 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-primary">
                <ShieldCheck className="size-3.5" />
                SECURE RESET
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              Set a new password
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-muted-foreground">
              Choose a new password for your Pocket Mint account. Use at least 8
              characters.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 py-6">
            {verifying ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Verifying your reset link...
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {!sessionReady ? (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                    This reset link is invalid or has expired. Request a new link
                    from the login page.
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label
                    htmlFor="newPassword"
                    className="text-sm font-medium text-foreground"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      aria-invalid={error ? "true" : "false"}
                      className="h-11 border-border/80 bg-input px-3 pr-11 text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-foreground"
                  >
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter new password"
                    aria-invalid={error ? "true" : "false"}
                    className="h-11 border-border/80 bg-input px-3 text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !sessionReady}
                  className="h-11 w-full justify-center bg-primary text-primary-foreground hover:bg-primary/92"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="size-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
