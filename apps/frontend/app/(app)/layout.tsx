import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0F172A" }}>
      {/* Desktop Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-screen lg:ml-[var(--sidebar-width)]">
        {/* Top Bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 w-full" style={{ padding: "24px 32px 32px" }}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}
