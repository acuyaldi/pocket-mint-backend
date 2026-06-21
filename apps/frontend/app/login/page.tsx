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
      return "border-[#EF4444] shadow-[0_0_0_2px_rgba(239,68,68,0.12)]";
    }
    if (focused) {
      return "border-[#38BDF8] shadow-[0_0_0_2px_rgba(56,189,248,0.12)]";
    }
    if (filled) {
      return "border-[#334155]";
    }
    return "border-[#334155]";
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left Panel: Brand ────────────────────────────────────── */}
      {/* Mobile: collapsed header */}
      <div className="lg:hidden flex items-center gap-3 px-6 py-4" style={{ backgroundColor: "#1E293B", borderBottom: "1px solid #334155" }}>
        <Wallet className="size-5 flex-shrink-0" style={{ color: "#38BDF8" }} />
        <span
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
        >
          Pocket Mint
        </span>
        <span className="ml-auto text-xs" style={{ color: "#94A3B8" }}>
          Kendali penuh atas keuanganmu.
        </span>
      </div>

      {/* Desktop: full brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden"
        style={{ backgroundColor: "#0F172A" }}
      >
        {/* Dot-grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #334155 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(56,189,248,0.04) 0%, transparent 60%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-12 xl:px-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
              <Wallet className="size-6" style={{ color: "#38BDF8" }} />
            </div>
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
            >
              Pocket Mint
            </span>
          </div>

          {/* Tagline */}
          <p className="text-base mb-12 max-w-sm" style={{ color: "#94A3B8" }}>
            Kendali penuh atas keuanganmu.
          </p>

          {/* Signature Element: Net Worth Counter (Option A) */}
          <div className="space-y-2">
            <div
              className="text-5xl xl:text-6xl font-medium tracking-tight"
              style={{
                fontFamily: "var(--font-jetbrains)",
                letterSpacing: "0.05em",
                color: "#38BDF8",
              }}
            >
              {formatNetWorth(netWorth)}
            </div>
            <div
              className="text-[11px] tracking-[0.1em] uppercase"
              style={{
                fontFamily: "var(--font-inter)",
                color: "#64748B",
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
            color: "#64748B",
            letterSpacing: "0.05em",
          }}
        >
          SECURE · SELF-HOSTED · PRIVATE
        </div>
      </div>

      {/* ── Right Panel: Form ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-10" style={{ backgroundColor: "#0F172A" }}>
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center text-sm transition-colors duration-150 ease-out mb-10"
            style={{ color: "#94A3B8" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#38BDF8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
          >
            ← Kembali ke Beranda
          </Link>

          {/* Heading */}
          <h1
            className="text-[32px] leading-[40px] font-semibold mb-2"
            style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
          >
            Selamat datang kembali
          </h1>
          <p className="text-sm mb-8" style={{ color: "#94A3B8" }}>
            Masuk ke akun Pocket Mint kamu
          </p>

          {/* Form */}
          <form action={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm"
                style={{ color: "#94A3B8" }}
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
                className={`w-full h-12 px-4 rounded-[4px] text-base outline-none transition-[border-color,box-shadow] duration-150 ease-out ${inputClasses(
                  emailFocused,
                  emailFilled,
                  false
                )}`}
                style={{ fontFamily: "var(--font-inter)", color: "#F8FAFC", backgroundColor: "#1E293B", border: "1px solid #334155" }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm"
                style={{ color: "#94A3B8" }}
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
                  className={`w-full h-12 px-4 pr-12 rounded-[4px] text-base outline-none transition-[border-color,box-shadow] duration-150 ease-out ${inputClasses(
                    passwordFocused,
                    passwordFilled,
                    !!error
                  )}`}
                  style={{ fontFamily: "var(--font-inter)", color: "#F8FAFC", backgroundColor: "#1E293B", border: "1px solid #334155" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150 ease-out ${
                    showPassword ? "" : ""
                  }`}
                  style={{ color: showPassword ? "#38BDF8" : "#94A3B8" }}
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
                <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{error}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-[4px] text-base font-medium transition-all duration-150 ease-out flex items-center justify-center gap-2 ${
                loading
                  ? "cursor-not-allowed"
                  : "hover:opacity-90 active:opacity-80"
              }`}
              style={{
                fontFamily: "var(--font-inter)",
                backgroundColor: loading ? "#334155" : "#38BDF8",
                color: "#0F172A",
              }}
            >
              {loading && (
                <Loader2 className="size-4 animate-spin" style={{ color: "#0F172A" }} />
              )}
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          {/* Register link */}
          <p className="text-sm mt-6 text-center" style={{ color: "#94A3B8" }}>
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-medium transition-colors duration-150 ease-out"
              style={{ color: "#38BDF8" }}
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
