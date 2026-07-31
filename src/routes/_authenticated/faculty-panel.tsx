import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Layers,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { specializationsFor } from "@/lib/specializations";
import { StudentList } from "@/components/student-list";

export const Route = createFileRoute("/_authenticated/faculty-panel")({
  component: FacultyPanel,
  head: () => ({
    meta: [
      { title: "Faculty Panel · CampusOne" },
      {
        name: "description",
        content:
          "Faculty overview of assigned classes with a searchable, read-only student directory.",
      },
      { property: "og:title", content: "Faculty Panel · CampusOne" },
      {
        property: "og:description",
        content: "Assigned classes and searchable student directory for faculty.",
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

interface AssignmentRow {
  id: string;
  section_id: string;
  section: {
    id: string;
    name: string;
    semester: number;
    course: {
      id: string;
      name: string;
      code: string;
      department: { name: string; code: string } | null;
    } | null;
  } | null;
  subject: { id: string; name: string; code: string } | null;
}

interface ClassGroup {
  key: string;
  sectionId: string;
  departmentName: string;
  courseName: string;
  courseCode: string;
  semester: number;
  sectionName: string;
  subjects: string[];
}

function FacultyPanel() {
  const { user, roles, loading } = useAuth();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ClassGroup | null>(null);

  const isFaculty = roles.some((r) =>
    ["faculty", "hod", "principal", "admin"].includes(r),
  );

  const { data: assignments = [], isLoading: loadingClasses } = useQuery({
    enabled: !!user && isFaculty,
    queryKey: ["faculty-panel-assignments", user?.id],
    queryFn: async (): Promise<AssignmentRow[]> => {
      const { data, error } = await supabase
        .from("faculty_assignments")
        .select(
          "id, section_id, subject:subjects(id, name, code), section:sections(id, name, semester, course:courses(id, name, code, department:departments(name, code)))",
        )
        .eq("faculty_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as AssignmentRow[];
    },
  });

  const groups = useMemo<ClassGroup[]>(() => {
    const map = new Map<string, ClassGroup>();
    for (const a of assignments) {
      if (!a.section?.course) continue;
      const key = a.section.id;
      const subjName = a.subject?.name;
      const existing = map.get(key);
      if (existing) {
        if (subjName && !existing.subjects.includes(subjName)) {
          existing.subjects.push(subjName);
        }
      } else {
        map.set(key, {
          key,
          sectionId: a.section.id,
          departmentName: a.section.course.department?.name ?? "—",
          courseName: a.section.course.name,
          courseCode: a.section.course.code,
          semester: a.section.semester,
          sectionName: a.section.name,
          subjects: subjName ? [subjName] : [],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.courseCode.localeCompare(b.courseCode) ||
        a.semester - b.semester ||
        a.sectionName.localeCompare(b.sectionName),
    );
  }, [assignments]);

  const sectionIds = useMemo(() => groups.map((g) => g.sectionId), [groups]);

  const { data: students, isLoading: loadingStudents } = useQuery({
    enabled: isFaculty && sectionIds.length > 0,
    queryKey: ["faculty-panel-students", sectionIds.join(",")],
    queryFn: async (): Promise<DirectoryStudent[]> => {
      const { data: roleRows, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (rErr) throw rErr;
      const studentIds = new Set((roleRows ?? []).map((r) => r.user_id));
      if (studentIds.size === 0) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, specialization, semester, avatar_url, department:departments(name, code), section:sections(name)",
        )
        .in("section_id", sectionIds)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as DirectoryStudent[]).filter((p) =>
        studentIds.has(p.id),
      );
    },
  });

  const filtered = useMemo(() => {
    const list = students ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return list.filter((s) =>
      [s.full_name, s.email, s.phone ?? ""].join(" ").toLowerCase().includes(term),
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

  if (active) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActive(null)} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to my classes
        </Button>
        <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-elegant)] sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <Badge variant="secondary" className="rounded-full">
              {active.departmentName}
            </Badge>
            <ChevronRight className="h-3 w-3" />
            <span>
              {active.courseName} ({active.courseCode})
            </span>
            <ChevronRight className="h-3 w-3" />
            <span>Semester {active.semester}</span>
            <ChevronRight className="h-3 w-3" />
            <span>Section {active.sectionName}</span>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight">Student list</h2>
          {active.subjects.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Subjects: {active.subjects.join(" · ")}
            </p>
          )}
          <div className="mt-4">
            <StudentList sectionId={active.sectionId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Faculty panel</h1>
        <p className="text-sm text-muted-foreground">
          Your assigned classes and the students who belong to them.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Total students"
          value={students?.length ?? 0}
          icon={Users}
          loading={loadingStudents && sectionIds.length > 0}
        />
        <StatCard
          label="Assigned classes"
          value={groups.length}
          icon={Layers}
          loading={loadingClasses}
        />
        <StatCard
          label="Subjects"
          value={new Set(groups.flatMap((g) => g.subjects)).size}
          icon={BookOpen}
          loading={loadingClasses}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Quick student search</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your students by name, email or phone…"
            className="h-11 rounded-full border-border/70 bg-card/70 pl-9 shadow-sm backdrop-blur"
          />
        </div>
        {q.trim() && (
          <>
            <Badge variant="secondary" className="rounded-full">
              {filtered.length} {filtered.length === 1 ? "result" : "results"}
            </Badge>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No students match your search.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((s) => (
                  <DirectoryCard key={s.id} student={s} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">My classes</h2>
        {loadingClasses ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No classes assigned yet. Ask your administrator to assign you to a section.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <button
                key={g.key}
                onClick={() => setActive(g)}
                className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {g.departmentName}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                </div>
                <div className="mt-3 text-base font-bold sm:text-lg">
                  {g.courseCode} · Sem {g.semester} · Section {g.sectionName}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{g.courseName}</div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>
                    {g.subjects.length > 0 ? g.subjects.join(" · ") : "Class teacher"}
                  </span>
                </div>
              </button>
            ))}
          </div>
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
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
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
          <div className="truncate text-sm font-semibold">{s.full_name || "(no name)"}</div>
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
