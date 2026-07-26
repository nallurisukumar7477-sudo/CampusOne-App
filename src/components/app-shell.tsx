import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("shell:collapsed") === "1";
  });

  useEffect(() => {
    window.localStorage.setItem("shell:collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const initials = (user?.email ?? "U")
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[60vh]"
        style={{ background: "var(--gradient-mesh)" }}
      />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col p-4">
                <BrandMark />
                <div className="mt-6 space-y-1">
                  <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} collapsed={false} />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden md:block">
            <BrandMark />
          </div>

          <div className="ml-auto flex flex-1 items-center justify-end gap-2 md:ml-6 md:justify-between">
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search classes, notices, assignments…"
                className="h-10 rounded-full border-border/70 bg-card/60 pl-9 shadow-sm backdrop-blur"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative rounded-full"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
              </Button>
              <button
                className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 py-1 pl-1 pr-3 shadow-sm backdrop-blur transition hover:shadow-md"
                aria-label="Account"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[8rem] truncate text-xs font-medium sm:block">
                  {user?.email}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                aria-label="Sign out"
                className="rounded-full"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto max-w-7xl md:grid md:gap-6 md:px-4 md:py-6 transition-[grid-template-columns] duration-300",
          collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[248px_1fr]",
        )}
      >
        <aside className="hidden md:block">
          <div className="sticky top-24 space-y-2 rounded-3xl border border-border/60 bg-card/70 p-3 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
            <div className="space-y-1">
              <NavLinks isAdmin={isAdmin} onNavigate={() => {}} collapsed={collapsed} />
            </div>
            <div className="mt-2 border-t border-border/60 pt-3">
              {!collapsed && (
                <div className="px-2 pb-2 text-[11px] text-muted-foreground">
                  <div className="truncate font-semibold text-foreground">{user?.email}</div>
                  <div className="mt-0.5">
                    {roles.length
                      ? roles.map((r) => ROLE_LABELS[r]).join(" · ")
                      : "No role assigned"}
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed((c) => !c)}
                className="w-full justify-center rounded-xl text-muted-foreground hover:text-foreground"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </aside>

        <main className="relative px-4 py-4 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        <GraduationCap className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-bold tracking-tight">CampusOne</div>
        <div className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Student Suite
        </div>
      </div>
    </Link>
  );
}

function NavLinks({
  isAdmin,
  onNavigate,
  collapsed,
}: {
  isAdmin: boolean;
  onNavigate: () => void;
  collapsed: boolean;
}) {
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
            title={collapsed ? label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              collapsed && "justify-center px-2",
              active
                ? "bg-foreground text-background shadow-[var(--shadow-elegant)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        );
      })}
    </>
  );
}
