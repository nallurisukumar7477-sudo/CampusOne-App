import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Inbox,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { specializationsFor } from "@/lib/specializations";

export const Route = createFileRoute("/_authenticated/faculty-panel")({
  component: FacultyPanel,
  head: () => ({
    meta: [
      { title: "Faculty Panel · CampusOne" },
      {
        name: "description",
        content:
          "Faculty overview with today's attendance summary and the full student directory.",
      },
      { property: "og:title", content: "Faculty Panel · CampusOne" },
      {
        property: "og:description",
        content: "Attendance summary and searchable student directory for faculty.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

interface DirectoryStudent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  semester: number | null;
  avatar_url: string | null;
  department: { name: string; code: string } | null;
  section: { name: string } | null;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function FacultyPanel() {
  const { roles, loading } = useAuth();
  const [q, setQ] = useState("");

  const isFaculty = roles.some((r) =>
    ["faculty", "hod", "principal", "admin"].includes(r),
  );

  const { data: students, isLoading } = useQuery({
    enabled: isFaculty,
    queryKey: ["faculty-panel-students"],
    queryFn: async (): Promise<DirectoryStudent[]> => {
      const { data: roleRows, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (rErr) throw rErr;
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, specialization, semester, avatar_url, department:departments(name, code), section:sections(name)",
        )
        .in("id", ids)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DirectoryStudent[];
    },
  });

  const { data: today } = useQuery({
    enabled: isFaculty,
    queryKey: ["faculty-panel-today", todayISO()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("date", todayISO());
      if (error) throw error;
      const present = new Set<string>();
      const absent = new Set<string>();
      for (const r of data ?? []) {
        if (r.status === "present") present.add(r.student_id);
        else absent.add(r.student_id);
      }
      for (const id of present) absent.delete(id);
      return { present: present.size, absent: absent.size };
    },
  });

  const filtered = useMemo(() => {
    const list = students ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((s) =>
      [
        s.full_name,
        s.email,
        s.phone ?? "",
        s.department?.name ?? "",
        s.department?.code ?? "",
        s.section?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [students, q]);

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-3xl" />;
  }

  if (!isFaculty) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-2 text-lg font-semibold">Faculty access only</h1>
        <p className="text-sm text-muted-foreground">
          This area is restricted to faculty and staff accounts.
        </p>
      </div>
    );
  }

  const total = students?.length ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          Faculty panel
        </h1>
        <p className="text-sm text-muted-foreground">
          Today's attendance at a glance and the complete student directory.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total students" value={total} icon={Users} loading={isLoading} />
        <StatCard
          label="Present today"
          value={today?.present ?? 0}
          icon={CheckCircle2}
          loading={!today}
        />
        <StatCard
          label="Absent today"
          value={today?.absent ?? 0}
          icon={UserX}
          loading={!today}
        />
        <StatCard label="Pending requests" value={0} icon={Inbox} hint="Coming soon" />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight">Student directory</h2>
          <Badge variant="secondary" className="rounded-full">
            {filtered.length} {filtered.length === 1 ? "student" : "students"}
          </Badge>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone, department or section…"
            className="h-11 rounded-full border-border/70 bg-card/70 pl-9 shadow-sm backdrop-blur"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {total === 0
                ? "No students have registered yet."
                : "No students match your search."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <DirectoryCard key={s.id} student={s} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-14 rounded-lg" />
      ) : (
        <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
      )}
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function DirectoryCard({ student: s }: { student: DirectoryStudent }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!s.avatar_url) {
        setAvatarUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(s.avatar_url, 3600);
      if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [s.avatar_url]);

  const initials =
    s.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "S";

  const showSpecialization =
    !!s.specialization && specializationsFor(s.department?.code).length > 0;

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:shadow-[var(--shadow-elegant)]">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border border-border">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={s.full_name} />}
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {s.full_name || "(no name)"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {s.department?.name && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {s.department.name}
              </Badge>
            )}
            {s.semester && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                Sem {s.semester}
              </Badge>
            )}
            {s.section?.name && (
              <Badge variant="outline" className="rounded-full text-[10px]">
                Sec {s.section.name}
              </Badge>
            )}
          </div>
          {showSpecialization && (
            <div className="mt-2 text-xs text-muted-foreground">{s.specialization}</div>
          )}
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{s.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{s.phone || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
