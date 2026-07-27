import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <ProfileGate>
        <Outlet />
      </ProfileGate>
    </AppShell>
  ),
});

function ProfileGate({ children }: { children: React.ReactNode }) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isStudent = roles.includes("student");
  const isStaff = roles.some((r) =>
    ["faculty", "hod", "principal", "admin", "placement_cell", "library_staff"].includes(r),
  );

  const { data: profile } = useQuery({
    enabled: !!user && isStudent && !isStaff,
    queryKey: ["profile-completed", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (loading || !user || !isStudent || isStaff) return;
    if (!profile) return;
    const onSetup = location.pathname === "/profile-setup";
    if (!profile.profile_completed && !onSetup) {
      void navigate({ to: "/profile-setup", replace: true });
    } else if (profile.profile_completed && onSetup) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [profile, isStudent, isStaff, location.pathname, loading, user, navigate]);

  return <>{children}</>;
}
