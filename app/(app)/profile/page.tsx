"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialState: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Auth session — the login provider drives the conditional UI below ─────
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      setAuthUser(user);
      setAuthLoading(false);
      if (!user) router.replace("/login");
    });
    return () => {
      active = false;
    };
  }, [router]);

  // Supabase records the sign-in method in app_metadata.provider
  // ("email" for manual register, "google" for Google OAuth).
  const provider = authUser?.app_metadata?.provider ?? "email";
  const isGoogleUser = provider === "google";
  const accountName =
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    "—";
  const accountEmail = authUser?.email ?? "—";

  const passwordStrength = useMemo(() => {
    if (form.newPassword.length >= 12) return "Strong";
    if (form.newPassword.length >= 8) return "Good";
    if (form.newPassword.length > 0) return "Weak";
    return "Pending";
  }, [form.newPassword]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Lengkapi semua field password terlebih dahulu.");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmasi password baru belum cocok.");
      return;
    }

    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setLoading(false);
    setSuccess("Form perubahan password sudah siap digunakan.");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-[11px] tracking-[0.08em] text-primary">
            <ShieldCheck className="size-3.5" />
            ACCOUNT SECURITY
          </div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Edit Profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Kelola kredensial akun dengan surface yang ringkas, kontras tinggi,
            dan mudah dibaca.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
            LOGIN METHOD
          </p>
          <p className="mt-2 text-sm text-primary">
            {authLoading
              ? "…"
              : isGoogleUser
                ? "Google Auth"
                : "Email & Password"}
          </p>
        </div>
      </div>

      {/* Account identity — readonly, shown for every login method */}
      <Card className="surface-card mb-6 max-w-2xl border border-white/80 py-0 shadow-none">
        <CardHeader className="border-b border-border px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <UserRound className="size-4" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">
                Account Identity
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {isGoogleUser
                  ? "Data ini terhubung langsung dengan akun Google kamu."
                  : "Detail akun yang saat ini kamu gunakan untuk masuk."}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="accountEmail"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <Input
                id="accountEmail"
                readOnly
                aria-readonly="true"
                value={accountEmail}
                className="h-11 cursor-default border-border bg-muted px-3 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="accountName"
                className="text-sm font-medium text-foreground"
              >
                {isGoogleUser ? "Name" : "Username / Name"}
              </label>
              <Input
                id="accountName"
                readOnly
                aria-readonly="true"
                value={accountName}
                className="h-11 cursor-default border-border bg-muted px-3 text-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditional password surface — form for email users, notice for Google */}
      {authLoading ? (
        <Card className="surface-card max-w-2xl border border-white/80 py-0 shadow-none">
          <CardContent className="flex items-center gap-2 px-6 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat metode login...
          </CardContent>
        </Card>
      ) : isGoogleUser ? (
        <Card className="surface-card max-w-2xl border border-warning/40 py-0 shadow-none">
          <CardHeader className="border-b border-warning/30 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-warning">
                <Info className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">
                  Change Password
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kredensial dikelola oleh penyedia Google Auth.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 py-6">
            <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="text-sm font-semibold text-foreground">
                Password cannot be changed because you are logged in using Google
                Auth.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="surface-card max-w-2xl border border-white/80 py-0 shadow-none">
          <CardHeader className="border-b border-border px-6 py-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                <KeyRound className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">
                  Change Password
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gunakan password yang unik untuk menjaga akses tetap aman.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 py-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5">
                <div className="space-y-2">
                  <label
                    htmlFor="currentPassword"
                    className="text-sm font-medium text-foreground"
                  >
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    className="h-11 border-border bg-input px-3 text-foreground placeholder:text-muted-foreground"
                    placeholder="Masukkan password saat ini"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="newPassword"
                      className="text-sm font-medium text-foreground"
                    >
                      New Password
                    </label>
                    <span className="font-mono text-[11px] tracking-[0.08em] text-primary">
                      {passwordStrength}
                    </span>
                  </div>
                  <Input
                    id="newPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    className="h-11 border-border bg-input px-3 text-foreground placeholder:text-muted-foreground"
                    placeholder="Minimal 8 karakter"
                  />
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
                    type="password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className="h-11 border-border bg-input px-3 text-foreground placeholder:text-muted-foreground"
                    placeholder="Ulangi password baru"
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  <CheckCircle2 className="size-4" />
                  {success}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Perubahan disiapkan dengan validasi dasar sebelum dihubungkan ke
                  aksi backend.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="h-11 min-w-48 justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
