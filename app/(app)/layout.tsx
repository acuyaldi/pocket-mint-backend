import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-8">
        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col rounded-[28px] border border-white/70 bg-white/42 p-4 sm:p-5 md:p-6">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
