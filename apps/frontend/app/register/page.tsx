"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Wallet,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const confirmPassword = formData.get("confirmPassword") as string;
    if (password !== confirmPassword) {
      setError("Password dan confirmPassword tidak cocok");
      setLoading(false);
      return;
    }

    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  const passwordChecks = [
    { label: "Minimal 8 karakter", met: password.length >= 8 },
    { label: "Mengandung huruf", met: /[a-zA-Z]/.test(password) },
    { label: "Mengandung angka", met: /\d/.test(password) },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: "#0F172A" }}>
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: "rgba(56,189,248,0.1)" }} />
          <div className="absolute -bottom-40 -left-40 size-96 rounded-full blur-3xl animate-pulse delay-1000" style={{ backgroundColor: "rgba(16,185,129,0.1)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full blur-3xl animate-pulse delay-2000" style={{ backgroundColor: "rgba(56,189,248,0.05)" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16" style={{ color: "#F8FAFC" }}>
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 rounded-full backdrop-blur-md px-4 py-2 text-sm font-medium mb-6"
              style={{
                backgroundColor: "rgba(30,41,59,0.5)",
                border: "1px solid #334155",
                color: "#10B981",
                fontFamily: "var(--font-inter)",
              }}
            >
              <Sparkles className="size-4" />
              <span>Mulai Perjalanan Finansial Anda</span>
            </div>
            <h1
              className="text-5xl xl:text-6xl font-bold tracking-tight mb-6 leading-tight"
              style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
            >
              Kelola Keuangan
              <br />
              <span style={{ color: "#94A3B8" }}>Lebih Cerdas</span>
            </h1>
            <p
              className="text-xl leading-relaxed max-w-md"
              style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}
            >
              Bergabunglah dengan Pocket Mint dan mulai pantau transaksi, analisis pengeluaran, dan buat keputusan finansial yang lebih baik.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4 mt-8">
            {[
              "100% Gratis tanpa biaya tersembunyi",
              "Setup cepat dalam 2 menit",
              "Data terenkripsi dan aman",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3" style={{ color: "#F8FAFC" }}>
                <div
                  className="size-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}
                >
                  <Check className="size-5" style={{ color: "#10B981" }} />
                </div>
                <span className="text-base" style={{ fontFamily: "var(--font-inter)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative" style={{ backgroundColor: "#0F172A" }}>
        {/* Back to Home Button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium transition-all duration-300 group"
          style={{ color: "#94A3B8" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#38BDF8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
        >
          <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
          <span>Kembali ke Beranda</span>
        </Link>

        {/* Background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 size-80 rounded-full blur-3xl" style={{ backgroundColor: "rgba(56,189,248,0.05)" }} />
          <div className="absolute -bottom-40 -left-40 size-80 rounded-full blur-3xl" style={{ backgroundColor: "rgba(16,185,129,0.05)" }} />
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Logo (Mobile only) */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div
              className="p-3 rounded-2xl"
              style={{
                backgroundColor: "rgba(56,189,248,0.1)",
                border: "1px solid rgba(56,189,248,0.2)",
              }}
            >
              <Wallet className="size-8" style={{ color: "#38BDF8" }} />
            </div>
            <div className="text-center">
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
              >
                Pocket Mint
              </h1>
              <p className="text-sm mt-1" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>
                Mulai kelola keuangan Anda
              </p>
            </div>
          </div>

          {/* Form Container */}
          <div
            className="backdrop-blur-md rounded-3xl p-8 sm:p-10"
            style={{
              backgroundColor: "rgba(30,41,59,0.5)",
              border: "1px solid #334155",
            }}
          >
            <div className="text-center mb-8">
              <h2
                className="text-3xl font-bold tracking-tight mb-2"
                style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
              >
                Buat Akun Baru
              </h2>
              <p style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>
                Sudah punya akun?{" "}
                <Link
                  href="/login"
                  className="font-semibold transition-all duration-300"
                  style={{ color: "#38BDF8" }}
                >
                  Masuk di sini
                </Link>
              </p>
            </div>

            <form action={handleSubmit} className="space-y-5">
              {error && (
                <div
                  className="rounded-xl backdrop-blur-md p-4 text-sm text-center animate-shake"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#EF4444",
                  }}
                >
                  {error}
                </div>
              )}

              {[
                { id: "name", label: "Nama Lengkap", type: "text", placeholder: "John Doe", autoComplete: "name" },
                { id: "email", label: "Email", type: "email", placeholder: "nama@email.com", autoComplete: "email" },
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <label
                    htmlFor={field.id}
                    className="text-sm font-medium"
                    style={{ color: "#F8FAFC", fontFamily: "var(--font-inter)" }}
                  >
                    {field.label}
                  </label>
                  <Input
                    id={field.id}
                    name={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    required
                    autoComplete={field.autoComplete}
                    className="h-12"
                    style={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      color: "#F8FAFC",
                      fontFamily: "var(--font-inter)",
                    }}
                  />
                </div>
              ))}

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                  style={{ color: "#F8FAFC", fontFamily: "var(--font-inter)" }}
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Buat password yang kuat"
                    required
                    autoComplete="new-password"
                    className="h-12 pr-11"
                    style={{
                      backgroundColor: "#1E293B",
                      border: "1px solid #334155",
                      color: "#F8FAFC",
                      fontFamily: "var(--font-inter)",
                    }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300"
                    style={{ color: showPassword ? "#38BDF8" : "#64748B" }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>

                {/* Password strength hints */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {passwordChecks.map((check) => (
                      <div key={check.label} className="flex items-center gap-2 text-xs">
                        <Check
                          className="size-3.5 transition-colors duration-300"
                          style={{ color: check.met ? "#10B981" : "#64748B" }}
                        />
                        <span
                          className="transition-colors duration-300"
                          style={{
                            color: check.met ? "#10B981" : "#64748B",
                            fontWeight: check.met ? 500 : 400,
                          }}
                        >
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                  style={{ color: "#F8FAFC", fontFamily: "var(--font-inter)" }}
                >
                  Konfirmasi Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Ulangi password"
                  required
                  autoComplete="new-password"
                  className="h-12"
                  style={{
                    backgroundColor: "#1E293B",
                    border: "1px solid #334155",
                    color: "#F8FAFC",
                    fontFamily: "var(--font-inter)",
                  }}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  backgroundColor: loading ? "#334155" : "#38BDF8",
                  color: "#0F172A",
                  fontFamily: "var(--font-inter)",
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    <span>Mendaftar...</span>
                  </>
                ) : (
                  "Daftar"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>
            Dengan mendaftar, Anda menyetujui{" "}
            <span className="underline cursor-pointer" style={{ color: "#38BDF8" }}>
              Ketentuan Layanan
            </span>{" "}
            dan{" "}
            <span className="underline cursor-pointer" style={{ color: "#38BDF8" }}>
              Kebijakan Privasi
            </span>{" "}
            kami.
          </p>
        </div>
      </div>
    </div>
  );
}
