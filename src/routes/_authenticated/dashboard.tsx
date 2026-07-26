import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · CampusOne" },
      { name: "description", content: "Your CampusOne dashboard." },
    ],
  }),
});

function Dashboard() {
  const { user, roles, loading } = useAuth();

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, department:departments(name, code)")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's a snapshot of your account.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Email" value={profile?.email ?? user?.email ?? "—"} />
        <InfoCard
          label="Department"
          value={
            profile?.department
              ? `${profile.department.name} (${profile.department.code})`
              : "Not assigned"
          }
        />
        <InfoCard
          label="Roles"
          value={
            loading
              ? "Loading..."
              : roles.length
                ? roles.map((r) => ROLE_LABELS[r]).join(" · ")
                : "No role assigned"
          }
        />
        <InfoCard label="Account" value="Active" />
      </div>

      <RoleCards roles={roles} />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

const ROLE_HINTS: Record<AppRole, string> = {
  student: "Access your courses, attendance, and results.",
  faculty: "Manage your classes and student records.",
  hod: "Oversee your department, faculty, and students.",
  principal: "College-wide visibility and approvals.",
  admin: "Manage departments, users, and role assignments.",
  placement_cell: "Post opportunities and track placements.",
  library_staff: "Manage the catalog, loans, and returns.",
};

function RoleCards({ roles }: { roles: AppRole[] }) {
  if (!roles.length) return null;
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Your access
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((r) => (
          <div key={r} className="rounded-2xl border border-border bg-card p-4">
            <div className="font-semibold">{ROLE_LABELS[r]}</div>
            <div className="mt-1 text-sm text-muted-foreground">{ROLE_HINTS[r]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
