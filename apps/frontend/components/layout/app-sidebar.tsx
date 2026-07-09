"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CalendarClock,
  Plus,
  User,
} from "lucide-react";
import { PocketMintLogo } from "../Logo";
import {
  Sidebar,
  SidebarBody,
  SidebarLabel,
  SidebarLink,
  SidebarToggle,
  useSidebar,
} from "@/components/ui/sidebar";
import { AccountMenuItems } from "./account-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wallets", href: "/wallets", icon: Wallet },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Installments", href: "/cicilan", icon: CalendarClock },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarBody>
        <SidebarContent />
      </SidebarBody>
    </Sidebar>
  );
}

function SidebarContent() {
  const { open } = useSidebar();
  const pathname = usePathname();

  return (
    <>
      {/* Top: logo + main nav */}
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div className="py-2 text-foreground">
          <PocketMintLogo className="w-6 h-6" showText={open} />
        </div>

        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <SidebarLink
                key={item.href}
                link={{
                  label: item.label,
                  href: item.href,
                  icon: <Icon className="size-5 shrink-0" />,
                }}
                isActive={isActive}
                className={isActive ? "text-primary font-semibold" : ""}
              />
            );
          })}
        </nav>
      </div>

      {/* Bottom: add transaction + help + account */}
      <div className="flex shrink-0 flex-col gap-1">
        <button
          onClick={() => window.dispatchEvent(new Event("fab-add-transaction"))}
          className="flex cursor-pointer items-center justify-start gap-2 rounded-md py-2 text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Add transaction"
        >
          <Plus className="size-5 shrink-0" />
          <SidebarLabel className="font-semibold">Add Transaction</SidebarLabel>
        </button>

        {/* ponytail: Help link removed — /help route doesn't exist yet; re-add when it ships */}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex cursor-pointer items-center justify-start gap-2 rounded-md py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Account menu"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <User className="size-4" />
            </span>
            <SidebarLabel className="text-muted-foreground">Account</SidebarLabel>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <AccountMenuItems />
          </DropdownMenuContent>
        </DropdownMenu>

        <SidebarToggle />
      </div>
    </>
  );
}
