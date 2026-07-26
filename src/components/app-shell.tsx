import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { GraduationCap, LayoutDashboard, ShieldCheck, LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const nav = (
    <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="mt-6 space-y-1">{nav}</div>
            </SheetContent>
          </Sheet>

          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="truncate font-bold">CampusOne</span>
          </Link>

          <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl md:grid md:grid-cols-[220px_1fr] md:gap-6 md:px-4 md:py-6">
        <aside className="hidden md:block">
          <div className="sticky top-20 space-y-1 rounded-2xl border border-border bg-card p-3">
            {nav}
            <div className="mt-3 border-t border-border pt-3 px-2 text-xs text-muted-foreground">
              <div className="truncate font-medium text-foreground">{user?.email}</div>
              <div className="mt-1">
                {roles.length
                  ? roles.map((r) => ROLE_LABELS[r]).join(" · ")
                  : "No role assigned"}
              </div>
            </div>
          </div>
        </aside>

        <main className="px-4 py-4 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}

function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate: () => void }) {
  const { location } = useRouterState();
  const items = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];
  return (
    <>
      {items.map(({ to, label, icon: Icon }) => {
        const active = location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
