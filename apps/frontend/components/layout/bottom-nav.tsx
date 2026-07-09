"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarClock,
  Target,
  User,
} from "lucide-react";
import { AccountMenuItems } from "./account-menu";
import { DockMorph, type DockMorphItemData } from "@/components/ui/dock-morph";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Labels and order mirror the desktop sidebar (app-sidebar.tsx) — same
// vocabulary on both surfaces so wayfinding transfers between devices
const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Installments", href: "/cicilan", icon: CalendarClock },
];

export function BottomNav() {
  const pathname = usePathname();
  const items = React.useMemo<DockMorphItemData[]>(() => {
    const navItems: DockMorphItemData[] = NAV_ITEMS.map((item) => {
      const isActive =
        pathname === item.href || pathname.startsWith(item.href + "/");
      const Icon = item.icon;

      return {
        key: item.href,
        label: item.label,
        href: item.href,
        isActive,
        icon: <Icon className="size-[18px]" />,
      };
    });

    navItems.push({
      key: "account",
      label: "Account",
      icon: <User className="size-[18px]" />,
      renderTrigger: ({ defaultTrigger }) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={defaultTrigger as React.ReactElement} />
          <DropdownMenuContent side="top" align="end" sideOffset={10}>
            <AccountMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });

    return navItems;
  }, [pathname]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 px-3 md:hidden"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)",
      }}
    >
      <DockMorph
        aria-label="Main"
        items={items}
        wrapperClassName="w-full justify-center"
        className="w-full max-w-[min(100%,22rem)]"
      />
    </div>
  );
}
