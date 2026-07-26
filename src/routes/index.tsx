import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { GraduationCap, ShieldCheck, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "CampusOne — Your campus, one place" },
      {
        name: "description",
        content:
          "One login for students, faculty, HOD, principal, placement cell, library staff, and admins.",
      },
      { property: "og:title", content: "CampusOne — Your campus, one place" },
      {
        property: "og:description",
        content:
          "One login for students, faculty, HOD, principal, placement cell, library staff, and admins.",
      },
    ],
  }),
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">CampusOne</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
        <section className="text-center">
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            Your campus, unified.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            One login for students, faculty, department heads, placement cell, library
            staff and administrators. Built mobile-first for how your campus actually
            works.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Role-based access", desc: "Every user sees only what their role allows." },
            { icon: ShieldCheck, title: "Secure by default", desc: "Row-level security on every record." },
            { icon: BookOpen, title: "Department-aware", desc: "Structured around your college's departments." },
            { icon: GraduationCap, title: "Built for campus", desc: "Designed for the people who run it." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        CampusOne · V1
      </footer>
    </div>
  );
}
