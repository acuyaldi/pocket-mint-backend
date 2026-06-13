"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  TrendingUp,
  PieChart,
  Shield,
  ArrowRight,
  MessageCircle,
  Sparkles,
  Zap,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
} from "lucide-react";
import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";

/* ──────────────────────────────────────────────
   Animation variants
   ────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1 },
};

/* ──────────────────────────────────────────────
   Reusable Section wrapper with fade-in on scroll
   ────────────────────────────────────────────── */

function AnimatedSection({
  children,
  className = "",
  variants = fadeUp,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ──────────────────────────────────────────────
   Feature card data
   ────────────────────────────────────────────── */

const features = [
  {
    icon: MessageCircle,
    title: "Catat Transaksi Sekejap via WhatsApp",
    description:
      "Kirim pesan biasa ke bot, AI kami langsung memproses, mengkategorikan, dan mencatat ke Pocket Mint secara otomatis.",
    highlighted: true,
    tags: ["🚀 Cepat & Mudah", "🤖 AI Cerdas", "📱 Via WhatsApp"],
  },
  {
    icon: TrendingUp,
    title: "Pantau Semua Aktivitas Real-time",
    description:
      "Lihat pergerakan saldo, sisa limit kredit, dan outstanding cicilan seketika.",
  },
  {
    icon: PieChart,
    title: "Dashboard yang Indah & Mudah Dibaca",
    description:
      "Visualisasi keuangan yang jelas dengan grafik, tren bulanan, dan net worth yang akurat.",
  },
  {
    icon: LayoutDashboard,
    title: "Kelola Semua Akun dalam Satu Layar",
    description:
      "Rekening bank, e-wallet, kartu kredit, hingga paylater — semua terintegrasi rapi.",
  },
  {
    icon: Shield,
    title: "Privasi & Keamanan Tingkat Tinggi",
    description:
      "Self-hosted sepenuhnya. Data tersimpan di server Anda sendiri. Tidak ada cloud pihak ketiga.",
  },
];

const trustBadges = [
  "100% Gratis & Self-Hosted",
  "Setup dalam Hitungan Menit",
  "Privasi Terjamin • Data Milikmu Sepenuhnya",
];

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 overflow-x-hidden">
      {/* ── Animated background blobs ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 size-[700px] rounded-full bg-emerald-500/[0.04] blur-[140px] animate-pulse" />
        <div className="absolute top-1/2 -left-40 size-[550px] rounded-full bg-teal-500/[0.04] blur-[140px] animate-pulse delay-1000" />
        <div className="absolute bottom-0 right-1/3 size-[450px] rounded-full bg-emerald-500/[0.03] blur-[140px] animate-pulse delay-2000" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Wallet className="size-5 text-emerald-500" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-50">
              Pocket Mint
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:scale-105 transition-all duration-300 font-semibold"
              >
                Buka Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 px-5 py-2 text-sm font-medium text-emerald-400 mb-10"
        >
          <Sparkles className="size-4" />
          <span>Self-Hosted · AI-Powered · Privasi Penuh</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-[4.5rem] font-black tracking-tight leading-[1.08] mb-8"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          <span className="text-zinc-50">Semua Akunmu.</span>
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent animate-gradient">
            Satu Kendali.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed"
        >
          Pantau pemasukan, pengeluaran, saldo, limit kredit, dan cicilan
          paylater secara real-time dalam satu dashboard yang elegan. Catat
          transaksi hanya dengan mengirim pesan WhatsApp —{" "}
          <span className="font-semibold text-emerald-400">
            AI akan mengerjakan sisanya
          </span>
          .
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/login">
            <Button
              size="lg"
              className="group gap-2 px-10 text-base bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 hover:shadow-[0_0_32px_rgba(16,185,129,0.45)] transition-all duration-300 font-semibold"
            >
              Buka Dashboard
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
          <Link
            href="https://github.com/pocket-mint/pocket-mint"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="lg"
              className="gap-2 px-8 text-base border-2 border-zinc-800 bg-zinc-900/50 backdrop-blur-md text-zinc-50 hover:border-emerald-500/60 hover:text-emerald-400 transition-all duration-300 font-semibold"
            >
              <ExternalLink className="size-5" />
              Lihat Source Code
            </Button>
          </Link>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-zinc-500"
        >
          {trustBadges.map((badge) => (
            <div key={badge} className="flex items-center gap-2">
              <CheckCircle2 className="size-[18px] text-emerald-500 shrink-0" />
              <span>{badge}</span>
            </div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* ── Accent divider ── */}
      <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      {/* ── Features ── */}
      <AnimatedSection
        variants={stagger}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28"
      >
        <motion.div variants={fadeUp} className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-50 mb-5">
            Fitur Unggulan
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Semua yang Anda butuhkan untuk mengelola keuangan pribadi dengan
            mudah dan cerdas
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isHighlight = feature.highlighted;

            return (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`
                  group rounded-3xl backdrop-blur-md p-8 sm:p-10 transition-all duration-500 ease-out
                  hover:-translate-y-3 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10
                  ${
                    isHighlight
                      ? "lg:col-span-2 bg-zinc-900/50 border border-emerald-500/20"
                      : "bg-zinc-900/40 border border-zinc-800/80"
                  }
                `}
              >
                {/* Icon */}
                <div
                  className={`
                  size-14 rounded-2xl flex items-center justify-center mb-7 transition-colors duration-500
                  ${
                    isHighlight
                      ? "bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/15"
                      : "bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/15"
                  }
                `}
                >
                  <Icon className="size-7 text-emerald-500" />
                </div>

                {/* Title */}
                <h3
                  className={`font-bold text-zinc-50 mb-3 ${
                    isHighlight ? "text-2xl" : "text-xl"
                  }`}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  className={`text-zinc-400 leading-relaxed ${
                    isHighlight ? "text-lg mb-6" : ""
                  }`}
                >
                  {feature.description}
                </p>

                {/* Tags (highlighted card only) */}
                {feature.tags && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-4 py-2 rounded-full bg-zinc-800/50 backdrop-blur-md border border-zinc-700/60 text-sm font-medium text-zinc-300 transition-colors duration-300 group-hover:border-emerald-500/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </AnimatedSection>

      {/* ── Accent divider ── */}
      <div className="mx-auto max-w-xs h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      {/* ── Bottom CTA ── */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="rounded-3xl bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/70 p-12 sm:p-16 lg:p-20 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 size-96 rounded-full bg-emerald-500/[0.07] blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-teal-500/[0.07] blur-[120px]" />
            {/* Subtle grid accent */}
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-800/50 backdrop-blur-md border border-zinc-700/60 px-5 py-2 text-sm font-medium text-zinc-300 mb-8"
            >
              <Zap className="size-4 text-emerald-500" />
              <span>Mulai Hari Ini</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-50 mb-5 leading-tight"
            >
              Waktunya Mengambil Kendali
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent animate-gradient">
                atas Keuanganmu.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Mulai bangun sistem keuangan pribadi yang jauh lebih tertata dan
              sadar. Tanpa iklan. Tanpa tracking. Hanya milikmu.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Link href="/login">
                <Button
                  size="lg"
                  className="group gap-2 px-12 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.45)] transition-all duration-300"
                >
                  Buka Dashboard
                  <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60 py-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Wallet className="size-5 text-emerald-500" />
              </div>
              <span className="text-lg font-bold tracking-tight text-zinc-50">
                Pocket Mint
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              © 2026 Pocket Mint — Kelola Keuangan Lebih Cerdas
            </p>
            <p className="text-sm text-zinc-600">
              Dibangun dengan Next.js & Shadcn/ui
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
