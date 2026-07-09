"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { login, signInWithGoogle, signup } from "@/app/actions/auth";
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

type AuthMode = "signin" | "signup";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.74Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

const accessHighlights = [
  {
    label: "Encrypted access",
    value: "Secure email & Google sign-in",
    icon: ShieldCheck,
  },
  {
    label: "Debt visibility",
    value: "Outstanding, limit, utilization",
    icon: Wallet,
  },
  {
    label: "Installment tracking",
    value: "Cicilan status and due flow",
    icon: CalendarClock,
  },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup(formData: FormData): string | null {
  const name = ((formData.get("name") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim();
  const password = (formData.get("password") as string) ?? "";
  const confirm = (formData.get("confirmPassword") as string) ?? "";

  if (!name) return "Please enter your name.";
  if (!emailPattern.test(email)) return "Please enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

function LoginForm() {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignUp = authMode === "signup";
  const searchParams = useSearchParams();

  // Google OAuth runs as a server action that redirects to the provider on
  // success; useActionState lets us surface an initiation error if one occurs.
  const [googleState, googleAction, googlePending] = useActionState(
    async () => (await signInWithGoogle()) ?? null,
    null
  );

  // Show the first available error: a submit/validation error, a Google
  // init error, or an OAuth failure bounced back from /auth/callback (?error=).
  const displayError = error ?? googleState?.error ?? searchParams.get("error");

  function toggleMode() {
    setAuthMode((mode) => (mode === "signin" ? "signup" : "signin"));
    setError(null);
    setShowPassword(false);
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    if (isSignUp) {
      const validationError = validateSignup(formData);
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }

      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
      return;
    }

    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const busy = loading || googlePending;

  return (
    <div className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1440px] overflow-hidden rounded-[28px] border border-white/70 bg-white/66 lg:grid-cols-[minmax(0,1.1fr)_420px]">
        <section className="surface-grid relative order-2 flex flex-col justify-between overflow-hidden px-6 py-6 sm:px-8 lg:order-1 lg:px-10 lg:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,109,54,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(137,80,36,0.12),transparent_22%)]" />

          <div className="relative py-10 lg:py-0">
            <div className="mb-6">
              <PocketMintLogo />
            </div>

            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/12 bg-white/82 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-primary">
                <ShieldCheck className="size-3.5" />
                SECURE FINTECH WORKSPACE
              </div>
              <h1 className="max-w-2xl font-heading text-4xl font-bold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[56px]">
                Enter the private workspace where assets, debt, and cicilan
                stay readable in one system.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Pocket Mint keeps the numbers direct, precise, and always under
                your control — from the first screen onward.
              </p>
            </div>

            <div className="mt-8 grid max-w-3xl gap-4 md:grid-cols-3">
              {accessHighlights.map((highlight) => {
                const Icon = highlight.icon;

                return (
                  <div
                    key={highlight.label}
                    className="surface-card rounded-2xl border border-white/80 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-primary/12 bg-primary/10 p-2 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {highlight.label}
                      </p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {highlight.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
            ENCRYPTED ACCESS | PRIVACY-FIRST | IDR-FIRST FINANCIAL CLARITY
          </div>
        </section>

        <section className="order-1 flex items-center justify-center bg-white/82 px-5 py-8 sm:px-8 lg:order-2">
          <div className="flex w-full max-w-md flex-col gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to landing page
            </Link>
            <Card className="surface-card w-full max-w-md border-white/90 py-0 shadow-none">
              <CardHeader className="border-b border-border/70 px-6 py-6">
                <div className="mb-4 text-primary">
                  <PocketMintLogo className="h-9 w-9" />
                </div>
                <CardTitle className="text-2xl font-semibold text-foreground">
                  {isSignUp ? "Create your account" : "Welcome back"}
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-muted-foreground">
                  {isSignUp
                    ? "Set up your Pocket Mint workspace in a few seconds."
                    : "Enter your credentials to access your workspace."}
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 py-6">
                <form action={handleSubmit} className="space-y-5">
                  {isSignUp ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="name"
                        className="text-sm font-medium text-foreground"
                      >
                        Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Your name"
                        className="h-11 border-border/80 bg-input px-3 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
                    >
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="h-11 border-border/80 bg-input px-3 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={isSignUp ? 8 : undefined}
                        autoComplete={
                          isSignUp ? "new-password" : "current-password"
                        }
                        placeholder={
                          isSignUp ? "At least 8 characters" : "Enter password"
                        }
                        aria-invalid={displayError ? "true" : "false"}
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

                  {isSignUp ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="confirmPassword"
                        className="text-sm font-medium text-foreground"
                      >
                        Confirm password
                      </label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                        aria-invalid={displayError ? "true" : "false"}
                        className="h-11 border-border/80 bg-input px-3 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  ) : null}

                  {displayError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {displayError}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={busy}
                    className="h-11 w-full justify-center bg-primary text-primary-foreground hover:bg-primary/92"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {isSignUp ? "Creating account..." : "Signing in..."}
                      </>
                    ) : isSignUp ? (
                      "Create Account"
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                <div className="mt-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">
                    or continue with
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form action={googleAction} className="mt-5">
                  <Button
                    type="submit"
                    size="lg"
                    variant="outline"
                    disabled={busy}
                    className="h-11 w-full justify-center gap-2 border-border/80 bg-white text-foreground hover:bg-muted"
                  >
                    {googlePending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <GoogleIcon className="size-4" />
                    )}
                    Continue with Google
                  </Button>
                </form>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  {isSignUp
                    ? "Already have an account? "
                    : "Don't have an account? "}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-semibold text-primary transition-colors hover:text-primary/80"
                  >
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </button>
                </p>

                <div className="mt-5 rounded-xl border border-border/70 bg-muted/55 px-4 py-3 text-sm text-muted-foreground">
                  Protected by encrypted sessions. Your financial data stays
                  private and under your control.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
