"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logout } from "@/app/actions/auth";
import { Bell, Wallet, LogOut, Loader2, Mail, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardHeaderProps {
  userName?: string;
  userEmail?: string;
}

export function DashboardHeader({
  userName,
  userEmail = "user@pocketmint.com",
}: DashboardHeaderProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail
    ? userEmail[0].toUpperCase()
    : "U";

  return (
    <header className="bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Wallet className="size-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-50 tracking-tight">
                Pocket Mint
              </h1>
              <p className="text-[10px] text-zinc-400 leading-none hidden sm:block">
                {currentTime}
              </p>
            </div>
          </motion.div>

          {/* Right Actions */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all duration-200"
              aria-label="Notifikasi"
            >
              <Bell className="size-[18px]" />
              <span className="absolute top-1.5 right-1.5 size-2 bg-rose-500 rounded-full ring-2 ring-zinc-950" />
            </Button>

            <Separator
              orientation="vertical"
              className="h-6 bg-zinc-800/80"
            />

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800/50 transition-all duration-200 focus:outline-none cursor-pointer"
              >
                <span className="hidden sm:block text-xs font-medium text-zinc-300">
                  {userName || "User"}
                </span>
                <div className="size-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-emerald-500/20">
                  {initials}
                </div>
                <ChevronDown
                  className={`size-3.5 text-zinc-500 transition-transform duration-200 hidden sm:block ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/40 overflow-hidden z-50"
                  >
                    {/* User Info */}
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-50">
                        {userName || "User"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Mail className="size-3 text-zinc-500" />
                        <p className="text-xs text-zinc-400 truncate">
                          {userEmail}
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-zinc-800" />

                    {/* Logout Button */}
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
                      >
                        {loggingOut ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <LogOut className="size-4" />
                        )}
                        {loggingOut ? "Memproses..." : "Keluar"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
