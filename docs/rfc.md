📑 RFC: Tech Stack, Design System & AI Workflow Selection

1. Pemilihan Framework (The Stack)

Mengingat kamu berlatar belakang Frontend yang mau ekspansi ke Backend, kita pilih stack yang modern, type-safe (meminimalisir bug), dan memiliki ekosistem AI-tooling yang sangat kuat.
A. Frontend: Next.js (App Router) + TypeScript

    Kenapa? Next.js adalah standar industri saat ini. Karena kamu sudah biasa dengan frontend, Next.js memberikan struktur proyek yang opiniated (teratur) dan mendukung Server Components yang efisien.

    Keuntungan AI: AI sangat pintar menulis komponen React + TypeScript karena pola kodenya yang terstruktur.

B. Backend: Node.js + NestJS (atau Express + TypeScript)

    Opsi A (Rekomendasi untuk Belajar Terstruktur): NestJS.

        Kenapa? NestJS menggunakan TypeScript secara native dan punya arsitektur yang mirip dengan Angular/Spring Boot (ada Controller, Service, Module). Ini bakal bikin portofoliomu terlihat sangat mature dan paham arsitektur backend standar enterprise.

    Opsi B (Rekomendasi untuk Cepat): Express.js + TypeScript.

        Kenapa? Jauh lebih minimalis dan tanpa aturan ketat.

    Keputusan: Kita pilih Express + TypeScript dulu agar kurva belajarnya tidak terlalu terjal, tapi tetap aman dengan TypeScript.

C. Database: PostgreSQL + Prisma ORM

    Kenapa Prisma? Prisma adalah ORM (Object-Relational Mapping) yang sangat ramah frontend. Kamu mendefinisikan tabel database dalam bentuk skema file teks, dan Prisma akan otomatis menghasilkan fungsi auto-complete (IntelliSense) di kodemu. AI juga sangat jago membaca dan menulis skema Prisma.

2. Perlukan Penambahan Design System?

Ya, sangat perlu, tapi jangan bikin dari nol (Scratches).
Sebagai proyek portofolio, recruiter ingin melihat efisiensi dan kemampuanmu beradaptasi dengan alat standar industri. Bikin design system dari nol akan memakan waktu terlalu lama.
Strategi Design System (Hybrid Approach):

    Fondasi: Tailwind CSS (Untuk utilitas styling yang cepat).

    Komponen UI: Shadcn/ui atau Radix UI.

        Kenapa? Shadcn/ui sangat marak karena dia bukan library yang di-install sebagai dependency kaku, melainkan komponen yang langsung di-copy-paste ke dalam folder proyekmu.

        Keuntungan AI: Kamu bisa menyuruh Claude/Gemini: "Tolong modifikasi komponen Button dari Shadcn ini agar memiliki animasi loading khusus." Kamu punya kontrol penuh atas kodenya.

    Design Tokens (Warna & Tipografi): Kita akan tentukan tema finansial yang bersih (misal: Slate untuk netral, Emerald untuk pemasukan, dan Rose untuk pengeluaran).

3. Strategi Kolaborasi dengan AI (Claude/Gemini)

Untuk mempercepat pengerjaan proyek dan meningkatkan skill-mu, kita akan bagi tugas dengan AI menggunakan metode berikut:

    AI sebagai Arsitek & Reviewer: Sebelum kamu push code ke GitHub, kamu bisa paste kodemu ke AI dan tanya: "Saya baru bikin fungsi backend untuk tambah transaksi ini, apakah ada celah keamanan atau cara optimasi kodenya?" (Ini cara terbaik menaikkan skill backend-mu).

    AI sebagai Dokumentator (.md): File README.md, panduan instalasi, dan dokumentasi API (API.md) bisa kamu generate lewat AI dengan memberikan struktur kode yang sudah kamu buat.

    AI sebagai Generator Test Case: Menulis unit test di backend seringkali membosankan. Kamu bisa suruh AI untuk membuatkan test case pakai Jest atau Vitest.
