"use client";

import Link from "next/link";
import { Pencil, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Shared between the desktop sidebar and mobile bottom nav so the account
// menu never drifts between the two surfaces.
export function AccountMenuItems() {
  const handleLogout = async () => {
    // logout() redirects on success; it only returns when signOut failed
    const result = await logout();
    if (result?.error) {
      console.error("Logout failed:", result.error);
      // ponytail: swap for the app toast when one exists — alert is the only
      // feedback channel that survives the menu closing
      window.alert("Logout failed — check your connection and try again.");
    }
  };

  return (
    <>
      <DropdownMenuItem render={<Link href="/profile" />}>
        <Pencil className="text-muted-foreground" />
        Edit Profile
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout}>
        <LogOut className="text-destructive" />
        Logout
      </DropdownMenuItem>
    </>
  );
}
