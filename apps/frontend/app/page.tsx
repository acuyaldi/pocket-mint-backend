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
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "#0F172A", color: "#F8FAFC" }}>
      {/* ── Animated background blobs ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 size-[700px] rounded-full blur-[140px] animate-pulse" style={{ backgroundColor: "rgba(56,189,248,0.04)" }} />
        <div className="absolute top-1/2 -left-40 size-[550px] rounded-full blur-[140px] animate-pulse delay-1000" style={{ backgroundColor: "rgba(56,189,248,0.04)" }} />
        <div className="absolute bottom-0 right-1/3 size-[450px] rounded-full blur-[140px] animate-pulse delay-2000" style={{ backgroundColor: "rgba(56,189,248,0.03)" }} />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ backgroundColor: "rgba(15,23,42,0.8)", borderBottom: "1px solid #334155" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}>
              <Wallet className="size-5" style={{ color: "#38BDF8" }} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}>
              Pocket Mint
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                size="sm"
                className="bg-transparent hover:bg-transparent text-sm font-semibold transition-all duration-300"
                style={{ backgroundColor: "#38BDF8", color: "#0F172A" }}
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
          className="inline-flex items-center gap-2 rounded-full backdrop-blur-md px-5 py-2 text-sm font-medium mb-10"
          style={{ backgroundColor: "rgba(30,41,59,0.6)", border: "1px solid #334155", color: "#38BDF8", fontFamily: "var(--font-inter)" }}
        >
          <Sparkles className="size-4" />
          <span>Self-Hosted · AI-Powered · Privasi Penuh</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-[4.5rem] font-black tracking-tight leading-[1.08] mb-8"
          style={{ fontFamily: "var(--font-hanken)" }}
        >
          <span style={{ color: "#F8FAFC" }}>Semua Akunmu.</span>
          <br />
          <span style={{ color: "#38BDF8" }}>
            Satu Kendali.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-6 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed"
          style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}
        >
          Pantau pemasukan, pengeluaran, saldo, limit kredit, dan cicilan
          paylater secara real-time dalam satu dashboard yang elegan. Catat
          transaksi hanya dengan mengirim pesan WhatsApp —{" "}
          <span className="font-semibold" style={{ color: "#38BDF8" }}>
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
              className="group gap-2 px-10 text-base font-semibold transition-all duration-300"
              style={{ backgroundColor: "#38BDF8", color: "#0F172A" }}
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
              className="gap-2 px-8 text-base backdrop-blur-md font-semibold transition-all duration-300"
              style={{ border: "2px solid #334155", backgroundColor: "rgba(30,41,59,0.5)", color: "#F8FAFC" }}
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
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm"
          style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}
        >
          {trustBadges.map((badge) => (
            <div key={badge} className="flex items-center gap-2">
              <CheckCircle2 className="size-[18px] shrink-0" style={{ color: "#10B981" }} />
              <span>{badge}</span>
            </div>
          ))}
        </motion.div>
      </AnimatedSection>

      {/* ── Accent divider ── */}
      <div className="mx-auto max-w-xs h-px" style={{ background: "linear-gradient(to right, transparent, rgba(56,189,248,0.3), transparent)" }} />

      {/* ── Features ── */}
      <AnimatedSection
        variants={stagger}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28"
      >
        <motion.div variants={fadeUp} className="text-center mb-20">
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5"
            style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
          >
            Fitur Unggulan
          </h2>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>
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
                  hover:-translate-y-3 hover:shadow-2xl
                  ${
                    isHighlight
                      ? "lg:col-span-2"
                      : ""
                  }
                `}
                style={{
                  backgroundColor: isHighlight ? "rgba(30,41,59,0.5)" : "rgba(30,41,59,0.4)",
                  border: isHighlight ? "1px solid rgba(56,189,248,0.2)" : "1px solid #334155",
                }}
              >
                {/* Icon */}
                <div
                  className="size-14 rounded-2xl flex items-center justify-center mb-7 transition-colors duration-500"
                  style={{ backgroundColor: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}
                >
                  <Icon className="size-7" style={{ color: "#38BDF8" }} />
                </div>

                {/* Title */}
                <h3
                  className={`font-bold mb-3 ${
                    isHighlight ? "text-2xl" : "text-xl"
                  }`}
                  style={{ color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  className={`leading-relaxed ${
                    isHighlight ? "text-lg mb-6" : ""
                  }`}
                  style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}
                >
                  {feature.description}
                </p>

                {/* Tags (highlighted card only) */}
                {feature.tags && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium transition-colors duration-300"
                        style={{ backgroundColor: "rgba(30,41,59,0.5)", border: "1px solid #334155", color: "#F8FAFC", fontFamily: "var(--font-inter)" }}
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
      <div className="mx-auto max-w-xs h-px" style={{ background: "linear-gradient(to right, transparent, rgba(56,189,248,0.3), transparent)" }} />

      {/* ── Bottom CTA ── */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div
          className="rounded-3xl backdrop-blur-xl p-12 sm:p-16 lg:p-20 text-center relative overflow-hidden"
          style={{ backgroundColor: "rgba(30,41,59,0.4)", border: "1px solid #334155" }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 size-96 rounded-full blur-[120px]" style={{ backgroundColor: "rgba(56,189,248,0.07)" }} />
            <div className="absolute -bottom-40 -left-40 size-96 rounded-full blur-[120px]" style={{ backgroundColor: "rgba(56,189,248,0.07)" }} />
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
              className="inline-flex items-center gap-2 rounded-full backdrop-blur-md px-5 py-2 text-sm font-medium mb-8"
              style={{ backgroundColor: "rgba(30,41,59,0.5)", border: "1px solid #334155", color: "#F8FAFC", fontFamily: "var(--font-inter)" }}
            >
              <Zap className="size-4" style={{ color: "#38BDF8" }} />
              <span>Mulai Hari Ini</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight"
              style={{ fontFamily: "var(--font-hanken)", color: "#F8FAFC" }}
            >
              Waktunya Mengambil Kendali
              <br />
              <span style={{ color: "#38BDF8" }}>
                atas Keuanganmu.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg max-w-2xl mx-auto mb-12 leading-relaxed"
              style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}
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
                  className="group gap-2 px-12 text-base font-semibold transition-all duration-300"
                  style={{ backgroundColor: "#38BDF8", color: "#0F172A" }}
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
      <footer className="py-12" style={{ borderTop: "1px solid #334155", backgroundColor: "#0F172A" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}>
                <Wallet className="size-5" style={{ color: "#38BDF8" }} />
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}>
                Pocket Mint
              </span>
            </div>
            <p className="text-sm" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>
              © 2026 Pocket Mint — Kelola Keuangan Lebih Cerdas
            </p>
            <p className="text-sm" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>
              Dibangun dengan Next.js & Shadcn/ui
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
