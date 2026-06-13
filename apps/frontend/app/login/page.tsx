"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Wallet, Eye, EyeOff, Loader2 } from "lucide-react";

/* ── Net-worth counter animation (Option A) ───────────────────── */
function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion.current) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function formatNetWorth(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/* ── Login Page ─────────────────────────────────────────────────── */
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailFilled, setEmailFilled] = useState(false);
  const [passwordFilled, setPasswordFilled] = useState(false);

  const netWorth = useCountUp(47_350_000, 2400);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  // Input state classes
  function inputClasses(
    focused: boolean,
    filled: boolean,
    hasError: boolean
  ) {
    if (hasError) {
      return "border-[#ffb4ab] shadow-[0_0_0_2px_rgba(255,180,171,0.12)]";
    }
    if (focused) {
      return "border-mint shadow-[0_0_0_2px_rgba(74,222,128,0.12)]";
    }
    if (filled) {
      return "border-outline";
    }
    return "border-[#262626]";
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left Panel: Brand ────────────────────────────────────── */}
      {/* Mobile: collapsed header */}
      <div className="lg:hidden flex items-center gap-3 px-6 py-4 bg-surface-low border-b border-divider">
        <Wallet className="size-5 text-mint flex-shrink-0" />
        <span
          className="text-lg font-semibold text-text-primary"
          style={{ fontFamily: "var(--font-hanken)" }}
        >
          Pocket Mint
        </span>
        <span className="ml-auto text-xs text-text-secondary">
          Kendali penuh atas keuanganmu.
        </span>
      </div>

      {/* Desktop: full brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
        style={{ backgroundColor: "#0e0e0e" }}
      >
        {/* Dot-grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #262626 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(74,222,128,0.04) 0%, transparent 60%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-12 xl:px-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-lg bg-mint/10 border border-mint/20">
              <Wallet className="size-6 text-mint" />
            </div>
            <span
              className="text-2xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-hanken)" }}
            >
              Pocket Mint
            </span>
          </div>

          {/* Tagline */}
          <p className="text-base text-text-secondary mb-12 max-w-sm">
            Kendali penuh atas keuanganmu.
          </p>

          {/* Signature Element: Net Worth Counter (Option A) */}
          <div className="space-y-2">
            <div
              className="text-5xl xl:text-6xl font-medium tracking-tight text-mint"
              style={{
                fontFamily: "var(--font-jetbrains)",
                letterSpacing: "0.05em",
              }}
            >
              {formatNetWorth(netWorth)}
            </div>
            <div
              className="text-[11px] tracking-[0.1em] uppercase"
              style={{
                fontFamily: "var(--font-inter)",
                color: "#3d4a3e",
              }}
            >
              Net Worth
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="relative z-10 px-12 xl:px-16 pb-8"
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "11px",
            color: "#3d4a3e",
            letterSpacing: "0.05em",
          }}
        >
          SECURE · SELF-HOSTED · PRIVATE
        </div>
      </div>

      {/* ── Right Panel: Form ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-surface px-6 py-12 lg:px-10">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center text-sm text-text-secondary hover:text-mint transition-colors duration-150 ease-out mb-10"
          >
            ← Kembali ke Beranda
          </Link>

          {/* Heading */}
          <h1
            className="text-[32px] leading-[40px] font-semibold text-text-primary mb-2"
            style={{ fontFamily: "var(--font-hanken)" }}
          >
            Selamat datang kembali
          </h1>
          <p className="text-sm text-text-secondary mb-8">
            Masuk ke akun Pocket Mint kamu
          </p>

          {/* Form */}
          <form action={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm text-text-secondary"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nama@email.com"
                required
                autoComplete="email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                onChange={(e) => setEmailFilled(e.target.value.length > 0)}
                className={`w-full h-12 px-4 rounded-[4px] text-base text-text-primary placeholder:text-outline bg-[#0a0a0a] border outline-none transition-[border-color,box-shadow] duration-150 ease-out ${inputClasses(
                  emailFocused,
                  emailFilled,
                  false
                )}`}
                style={{ fontFamily: "var(--font-inter)" }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm text-text-secondary"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  required
                  autoComplete="current-password"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onChange={(e) =>
                    setPasswordFilled(e.target.value.length > 0)
                  }
                  className={`w-full h-12 px-4 pr-12 rounded-[4px] text-base text-text-primary placeholder:text-outline bg-[#0a0a0a] border outline-none transition-[border-color,box-shadow] duration-150 ease-out ${inputClasses(
                    passwordFocused,
                    passwordFilled,
                    !!error
                  )}`}
                  style={{ fontFamily: "var(--font-inter)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150 ease-out ${
                    showPassword ? "text-mint" : "text-text-secondary"
                  }`}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>

              {/* Inline error */}
              {error && (
                <p className="text-xs text-error mt-1">{error}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-[4px] text-base font-medium transition-all duration-150 ease-out flex items-center justify-center gap-2 ${
                loading
                  ? "bg-surface-high text-outline cursor-not-allowed"
                  : "bg-mint text-on-primary hover:bg-mint-bright active:bg-mint-dim"
              }`}
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {loading && (
                <Loader2 className="size-4 animate-spin text-mint" />
              )}
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          {/* Register link */}
          <p className="text-sm text-text-secondary mt-6 text-center">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-mint font-medium hover:text-mint-bright transition-colors duration-150 ease-out"
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
