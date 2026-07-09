"use client";
import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const RAIL_WIDTH = 60;
const EXPANDED_WIDTH = 300;

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

// Exits run shorter than entrances; reduced-motion collapses both to instant
const useSidebarTransition = (expanding: boolean): Transition => {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return { duration: 0 };
  return { duration: expanding ? 0.2 : 0.15, ease: EASE_OUT_QUART };
};

interface Links {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pinned: boolean;
  setPinned: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  // pinned keeps the sidebar open without hover — the only path for
  // touch-only devices (iPad at md+) and a persistence choice for mouse users
  const [pinned, setPinned] = useState(false);
  const open = pinned || (openProp !== undefined ? openProp : openState);
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, pinned, setPinned, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return <DesktopSidebar {...props} />;
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, pinned, animate } = useSidebar();
  const transition = useSidebarTransition(open);

  return (
    <motion.div
      // z above page content, below dropdowns (z-50) and the mobile bar's z-20
      // never coexists with this md+-only rail
      className="relative z-30 hidden h-full shrink-0 md:block"
      initial={false}
      // layout width only moves on pin — one user-triggered reflow, never per-hover
      animate={{ width: !animate || pinned ? EXPANDED_WIDTH : RAIL_WIDTH }}
      transition={transition}
      onMouseEnter={() => {
        if (!pinned) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
      onFocusCapture={() => {
        if (!pinned) setOpen(true);
      }}
      onBlurCapture={(e: React.FocusEvent<HTMLDivElement>) => {
        if (!pinned && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      {/* Hover expansion happens on this absolute panel, overlaying the page
          instead of resizing it — the width tween never reflows main content */}
      <motion.div
        className={cn(
          "surface-panel absolute inset-y-0 left-0 flex h-full flex-col overflow-hidden border-r border-border/80 px-4 py-4 backdrop-blur",
          className
        )}
        initial={false}
        animate={{
          width: !animate || open ? EXPANDED_WIDTH : RAIL_WIDTH,
          // brand-ink shadow silhouettes the panel only while it overlays content
          boxShadow:
            open && !pinned
              ? "8px 0 24px rgba(11,28,48,0.12)"
              : "8px 0 24px rgba(11,28,48,0)",
        }}
        transition={transition}
        {...props}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Shared label treatment for everything in the rail: fades with the expansion,
// and flips visibility only after the fade-out completes so collapsed labels
// leave the accessibility tree without an abrupt display:none snap
export const SidebarLabel = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const { open, animate } = useSidebar();
  const visible = !animate || open;
  const transition = useSidebarTransition(visible);

  return (
    <motion.span
      initial={false}
      animate={
        visible
          ? { opacity: 1, visibility: "visible" as const }
          : { opacity: 0, transitionEnd: { visibility: "hidden" as const } }
      }
      transition={transition}
      className={cn("inline-block text-sm whitespace-pre", className)}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {children}
    </motion.span>
  );
};

export const SidebarLink = ({
  link,
  className,
  isActive,
  ...props
}: {
  link: Links;
  className?: string;
  isActive?: boolean;
} & Omit<LinkProps, "href">) => {
  return (
    <Link
      href={link.href}
      aria-label={link.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center justify-start gap-2 rounded-md py-2 text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className
      )}
      {...props}
    >
      {link.icon}
      <SidebarLabel className="group-hover/sidebar:translate-x-1 transition duration-150">
        {link.label}
      </SidebarLabel>
    </Link>
  );
};

export const SidebarToggle = ({ className }: { className?: string }) => {
  const { open, setOpen, pinned, setPinned } = useSidebar();
  const label = pinned ? "Collapse sidebar" : "Keep sidebar open";
  const Icon = pinned ? PanelLeftClose : PanelLeftOpen;

  return (
    <button
      type="button"
      onClick={() => {
        const next = !pinned;
        setPinned(next);
        setOpen(next);
      }}
      aria-expanded={open}
      aria-label={label}
      className={cn(
        "flex items-center justify-start gap-2 rounded-md py-2 text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className
      )}
    >
      <Icon className="size-5 shrink-0" />
      <SidebarLabel>{label}</SidebarLabel>
    </button>
  );
};
