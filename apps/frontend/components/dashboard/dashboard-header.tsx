"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Moon, Sun, PlusCircle, Wallet } from "lucide-react";
import { useState, useEffect } from "react";

export function DashboardHeader() {
  const [isDark, setIsDark] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Check initial theme
    setIsDark(document.documentElement.classList.contains("dark"));

    // Update time every minute
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

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">Pocket Mint</h1>
              <p className="text-[10px] text-muted-foreground leading-none hidden sm:block">{currentTime}</p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Button
              id="add-transaction-btn"
              size="sm"
              className="h-8 gap-1.5 text-xs hidden sm:flex"
            >
              <PlusCircle className="size-3.5" />
              Tambah Transaksi
            </Button>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <Button
              id="notification-btn"
              variant="ghost"
              size="icon"
              className="relative size-8"
              aria-label="Notifikasi"
            >
              <Bell className="size-4" />
              <span className="absolute top-1 right-1 size-2 bg-[var(--expense)] rounded-full" />
            </Button>

            <Button
              id="theme-toggle-btn"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleTheme}
              aria-label={isDark ? "Mode terang" : "Mode gelap"}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            {/* Avatar */}
            <div className="size-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-xs font-bold text-white ml-1">
              AM
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
