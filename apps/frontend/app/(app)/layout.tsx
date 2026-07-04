import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-[#131313] text-[#e5e2e1] overflow-hidden">
      <AppSidebar />

      <main className="flex-1 min-w-0 overflow-y-auto p-6 md:p-8">
        <div className="w-full max-w-7xl mx-auto flex flex-col">
          <TopBar />
          <div className="flex flex-col flex-1 min-h-screen">
            {children}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}