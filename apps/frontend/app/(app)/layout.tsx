import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div className="lg:ml-60 flex flex-col min-h-screen">
        {/* Top Bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-6 pb-20 lg:pb-6 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}
