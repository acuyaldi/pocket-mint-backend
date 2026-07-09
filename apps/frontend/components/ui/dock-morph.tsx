"use client";

import Link from "next/link";
import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";

import { cn } from "@/lib/utils";

export interface DockMorphItemData {
  key: React.Key;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  renderTrigger?: (api: DockMorphItemRenderArgs) => React.ReactNode;
}

export interface DockMorphProps {
  items?: DockMorphItemData[];
  children?: React.ReactNode;
  /**
   * Applies to the outer placement wrapper so callers can own visibility,
   * safe-area padding, and mobile-only positioning.
   */
  wrapperClassName?: string;
  className?: string;
  itemClassName?: string;
  "aria-label"?: string;
}

export interface DockMorphItemProps extends Omit<DockMorphItemData, "key"> {
  className?: string;
}

export interface DockMorphItemRenderArgs {
  content: React.ReactNode;
  defaultTrigger: React.ReactNode;
  active: boolean;
  reduceMotion: boolean;
}

function useCanHover() {
  const [canHover, setCanHover] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);

    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return canHover;
}

const liftTransition: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.7,
};

const getMotionTransition = (reduceMotion: boolean): Transition => {
  if (reduceMotion) {
    return { duration: 0 };
  }

  return liftTransition;
};

const dockSurfaceShadow =
  "shadow-[0_14px_32px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)]";

const dockPillShadow =
  "shadow-[0_10px_24px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]";

const DockMorphItemContent = ({
  icon,
  isActive,
}: Pick<DockMorphItemData, "icon" | "isActive">) => {
  const active = Boolean(isActive);

  return (
    <span
      className={cn(
        "relative z-10 inline-flex items-center justify-center rounded-full px-1 py-1 text-[13px] font-medium text-foreground transition-colors sm:px-1.5 sm:py-1.5",
        active ? "font-semibold" : "font-medium"
      )}
    >
      <span
        className={cn(
          "inline-flex size-8.5 shrink-0 items-center justify-center rounded-full border bg-background shadow-[inset_0_1px_0_var(--color-background)] transition-colors sm:size-9",
          active
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground"
        )}
      >
        {icon}
      </span>
    </span>
  );
};

export const DockMorphItem = ({
  className,
  label,
  icon,
  isActive,
  href,
  onClick,
  renderTrigger,
}: DockMorphItemProps) => {
  const reduceMotion = useReducedMotion();
  const canHover = useCanHover();
  const transition = getMotionTransition(Boolean(reduceMotion));
  const active = Boolean(isActive);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const content = (
    <DockMorphItemContent
      icon={icon}
      isActive={isActive}
    />
  );
  const sharedMotionProps = {
    initial: false,
    animate: {
      y: 0,
      scale: 1,
    },
    whileHover: reduceMotion ? undefined : { y: -1, scale: 1.01 },
    whileTap: reduceMotion ? undefined : { y: 0, scale: 0.985 },
    transition,
  } as const;
  const defaultTrigger = href ? (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group relative z-10 inline-flex items-center justify-center rounded-full px-0 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "group relative z-10 inline-flex items-center justify-center rounded-full px-0 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {content}
    </button>
  );
  const trigger = renderTrigger
    ? renderTrigger({
        content,
        defaultTrigger,
        active,
        reduceMotion: Boolean(reduceMotion),
      })
    : defaultTrigger;
  const showLabel = canHover ? isHovered || isFocused : active;

  return (
    <motion.div
      className={cn("relative isolate", className)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
      {...sharedMotionProps}
    >
      <AnimatePresence initial={false}>
        {showLabel ? (
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, y: 4, scale: 0.96 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/85 bg-[color:color-mix(in_srgb,var(--color-card)_94%,transparent)] px-2.5 py-1 text-[11px] font-medium text-foreground shadow-[0_12px_24px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)] backdrop-blur-md"
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
      {active ? (
        <motion.span
          layoutId="dock-morph-active-pill"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full border border-primary/20 bg-primary/10",
            dockPillShadow
          )}
          transition={transition}
        />
      ) : null}
      {trigger}
    </motion.div>
  );
};

export const DockMorph = ({
  items,
  children,
  wrapperClassName,
  className,
  itemClassName,
  "aria-label": ariaLabel = "Primary navigation",
}: DockMorphProps) => {
  const reduceMotion = useReducedMotion();
  const transition = getMotionTransition(Boolean(reduceMotion));

  return (
    <div className={cn("inline-flex", wrapperClassName)}>
      <motion.nav
        aria-label={ariaLabel}
        initial={false}
        whileHover={reduceMotion ? undefined : { y: -1 }}
        transition={transition}
        className={cn(
          "max-w-full rounded-full border border-border/70 bg-[color:color-mix(in_srgb,var(--color-surface-container-highest)_84%,transparent)] px-1 py-1 text-foreground shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-background)_72%,transparent)] backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-[color:color-mix(in_srgb,var(--color-surface-container-highest)_72%,transparent)] sm:px-1.5 sm:py-1.5",
          dockSurfaceShadow,
          className
        )}
      >
        <div className="flex min-w-0 items-center justify-center gap-1 sm:gap-1.5">
          {items
            ? items.map(({ key, ...item }) => (
                <DockMorphItem key={key} className={itemClassName} {...item} />
              ))
            : children}
        </div>
      </motion.nav>
    </div>
  );
};
