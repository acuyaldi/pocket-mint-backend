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
      setError("Password dan konfirmasi password tidak cocok");
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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-zinc-900">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-96 rounded-full bg-teal-500/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-teal-500/5 blur-3xl animate-pulse delay-2000" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-zinc-50">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800/50 backdrop-blur-md border border-zinc-700 px-4 py-2 text-sm font-medium text-emerald-500 mb-6">
              <Sparkles className="size-4" />
              <span>Mulai Perjalanan Finansial Anda</span>
            </div>
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Kelola Keuangan
              <br />
              <span className="text-zinc-400">Lebih Cerdas</span>
            </h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-md">
              Bergabunglah dengan Pocket Mint dan mulai pantau transaksi, analisis pengeluaran, dan buat keputusan finansial yang lebih baik.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="size-5 text-emerald-500" />
              </div>
              <span className="text-base">100% Gratis tanpa biaya tersembunyi</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="size-5 text-emerald-500" />
              </div>
              <span className="text-base">Setup cepat dalam 2 menit</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="size-5 text-emerald-500" />
              </div>
              <span className="text-base">Data terenkripsi dan aman</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center bg-zinc-950 px-4 py-12 relative">
        {/* Back to Home Button */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-emerald-500 transition-all duration-300 group"
        >
          <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
          <span>Kembali ke Beranda</span>
        </Link>

        {/* Background decoration */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 size-80 rounded-full bg-teal-500/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-emerald-500/5 blur-3xl" />
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Logo (Mobile only) */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Wallet className="size-8 text-emerald-500" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
                Pocket Mint
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Mulai kelola keuangan Anda
              </p>
            </div>
          </div>

          {/* Form Container with Glassmorphism */}
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-zinc-800 p-8 sm:p-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-50 mb-2">
                Buat Akun Baru
              </h2>
              <p className="text-zinc-400">
                Sudah punya akun?{" "}
                <Link
                  href="/login"
                  className="text-emerald-500 font-semibold hover:text-emerald-400 hover:underline transition-all duration-300"
                >
                  Masuk di sini
                </Link>
              </p>
            </div>

            <form action={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-950/50 backdrop-blur-md border border-red-900/50 p-4 text-sm text-red-400 text-center animate-shake">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-semibold text-zinc-50"
                >
                  Nama Lengkap
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  autoComplete="name"
                  className="h-12 bg-zinc-900/50 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-zinc-50"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                  className="h-12 bg-zinc-900/50 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-zinc-50"
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
                    className="h-12 pr-11 bg-zinc-900/50 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-500 transition-colors duration-300"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>

                {/* Password strength hints */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Check
                          className={`size-3.5 transition-colors duration-300 ${
                            check.met
                              ? "text-emerald-500"
                              : "text-zinc-600"
                          }`}
                        />
                        <span
                          className={`transition-colors duration-300 ${
                            check.met
                              ? "text-emerald-400 font-medium"
                              : "text-zinc-500"
                          }`}
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
                  className="text-sm font-semibold text-zinc-50"
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
                  className="h-12 bg-zinc-900/50 border-zinc-800 text-zinc-50 placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 hover:-translate-y-0.5"
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

          <p className="text-center text-xs text-zinc-500">
            Dengan mendaftar, Anda menyetujui{" "}
            <span className="underline cursor-pointer hover:text-emerald-500 transition-colors duration-300">
              Ketentuan Layanan
            </span>{" "}
            dan{" "}
            <span className="underline cursor-pointer hover:text-emerald-500 transition-colors duration-300">
              Kebijakan Privasi
            </span>{" "}
            kami.
          </p>
        </div>
      </div>
    </div>
  );
}
