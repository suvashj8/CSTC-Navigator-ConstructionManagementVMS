import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar — fixed width */}
      <aside className="hidden shrink-0 lg:block">
        <AppSidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        {/* Mobile / tablet top bar only (sidebar hidden) */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md sm:px-4 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[min(100vw-2rem,18rem)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
            >
              <AppSidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">Vehicle Management System</p>
          </div>
        </header>

        <main className="mesh-bg min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
