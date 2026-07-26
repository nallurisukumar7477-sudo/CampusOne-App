import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle,
  Loader2,
  Save,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

const REQUIRED_PCT = 75;

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { user, roles, loading } = useAuth();
  const isStaff = roles.some((r: AppRole) =>
    ["faculty", "hod", "principal", "admin"].includes(r),
  );

  if (loading || !user) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Header isStaff={isStaff} />
        {isStaff ? <FacultyAttendance userId={user.id} /> : <StudentAttendance userId={user.id} />}
      </div>
    </AppShell>
  );
}

function Header({ isStaff }: { isStaff: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:p-8">
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{ background: "var(--gradient-mesh)" }}
      />
      <div className="relative">
        <Badge variant="secondary" className="rounded-full bg-background/70 backdrop-blur">
          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
          Attendance
        </Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
          {isStaff ? "Mark & manage class attendance" : "Your attendance at a glance"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {isStaff
            ? "Select a subject, mark students present or absent, and save. You can edit today's records anytime."
            : `Track your presence across subjects and stay above the required ${REQUIRED_PCT}% threshold.`}
        </p>
      </div>
    </div>
  );
}

/* ================= STUDENT VIEW ================= */

type StudentRow = {
  id: string;
  subject_id: string;
  date: string;
  status: "present" | "absent";
  subjects: { id: string; name: string; code: string } | null;
};

function StudentAttendance({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "student", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, subject_id, date, status, subjects(id, name, code)")
        .eq("student_id", userId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StudentRow[];
    },
  });

  if (isLoading) return <StudentSkeleton />;

  const rows = data ?? [];
  const total = rows.length;
  const attended = rows.filter((r) => r.status === "present").length;
  const pct = total ? Math.round((attended / total) * 100) : 0;
  const aboveThreshold = pct >= REQUIRED_PCT;

  // Per-subject aggregation
  const perSubject = new Map<
    string,
    { name: string; code: string; attended: number; total: number }
  >();
  for (const r of rows) {
    const key = r.subject_id;
    const s = perSubject.get(key) ?? {
      name: r.subjects?.name ?? "Unknown",
      code: r.subjects?.code ?? "—",
      attended: 0,
      total: 0,
    };
    s.total += 1;
    if (r.status === "present") s.attended += 1;
    perSubject.set(key, s);
  }
  const subjectList = Array.from(perSubject.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Overall attendance"
          value={`${pct}%`}
          hint={aboveThreshold ? "Above required" : "Below required"}
          tone={aboveThreshold ? "good" : "bad"}
          icon={aboveThreshold ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Classes attended"
          value={attended.toString()}
          hint={`out of ${total}`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Classes missed"
          value={(total - attended).toString()}
          hint={`out of ${total}`}
          icon={XCircle}
        />
        <StatCard
          label="Required threshold"
          value={`${REQUIRED_PCT}%`}
          hint={aboveThreshold ? `${pct - REQUIRED_PCT}% above` : `${REQUIRED_PCT - pct}% below`}
          tone={aboveThreshold ? "good" : "bad"}
          icon={ClipboardCheck}
        />
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">By subject</h2>
            <p className="text-xs text-muted-foreground">Attendance breakdown across your subjects</p>
          </div>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        {subjectList.length === 0 ? (
          <EmptyState text="No attendance recorded yet. Once a faculty member saves attendance, it'll appear here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {subjectList.map((s) => {
              const p = s.total ? Math.round((s.attended / s.total) * 100) : 0;
              const good = p >= REQUIRED_PCT;
              return (
                <div
                  key={s.code}
                  className="rounded-2xl border border-border/60 bg-background/50 p-4 transition hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{s.name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {s.code}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-full",
                        good
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {p}%
                    </Badge>
                  </div>
                  <Progress value={p} className="mt-3 h-1.5" />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {s.attended} / {s.total} classes
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">History</h2>
            <p className="text-xs text-muted-foreground">Most recent classes first</p>
          </div>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </div>
        {rows.length === 0 ? (
          <EmptyState text="No history yet." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">
                      {format(new Date(r.date), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-2.5">{r.subjects?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {r.subjects?.code ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= FACULTY VIEW ================= */

type Dept = { id: string; name: string; code: string };
type Subject = { id: string; name: string; code: string; department_id: string | null };
type Student = { id: string; full_name: string; email: string; identifier: string | null };

function FacultyAttendance({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [deptId, setDeptId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Dept[];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", deptId],
    queryFn: async () => {
      let q = supabase.from("subjects").select("id, name, code, department_id").order("name");
      if (deptId) q = q.eq("department_id", deptId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
    enabled: !!departments,
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", deptId],
    queryFn: async () => {
      if (!deptId) return [] as Student[];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, identifier")
        .eq("department_id", deptId)
        .order("full_name");
      if (error) throw error;
      // Filter to students only via user_roles
      const ids = (data ?? []).map((p) => p.id);
      if (ids.length === 0) return [];
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids)
        .eq("role", "student");
      const studentIds = new Set((roles ?? []).map((r) => r.user_id));
      return (data ?? []).filter((p) => studentIds.has(p.id)) as Student[];
    },
    enabled: !!deptId,
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["attendance", "class", subjectId, date],
    queryFn: async () => {
      if (!subjectId || !date) return [];
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, student_id, status")
        .eq("subject_id", subjectId)
        .eq("date", date);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subjectId && !!date,
  });

  // Prime marks from existing records whenever they change
  useEffect(() => {
    if (!existing) return;
    const next: Record<string, "present" | "absent"> = {};
    for (const r of existing) next[r.student_id] = r.status as "present" | "absent";
    setMarks(next);
  }, [existing]);

  const filteredStudents = (students ?? []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.identifier ?? "").toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!subjectId) throw new Error("Select a subject");
      const rows = (students ?? []).map((s) => ({
        subject_id: subjectId,
        student_id: s.id,
        date,
        status: marks[s.id] ?? "absent",
        marked_by: userId,
      }));
      if (rows.length === 0) throw new Error("No students to save");
      const { error } = await supabase
        .from("attendance_records")
        .upsert(rows, { onConflict: "subject_id,student_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save"),
  });

  const markAll = (status: "present" | "absent") => {
    const next: Record<string, "present" | "absent"> = {};
    for (const s of students ?? []) next[s.id] = status;
    setMarks(next);
  };

  const presentCount = Object.values(marks).filter((v) => v === "present").length;
  const total = students?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Class / Department</label>
            <Select value={deptId} onValueChange={(v) => { setDeptId(v); setSubjectId(""); }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!deptId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={deptId ? "Select a subject" : "Pick a class first"} />
              </SelectTrigger>
              <SelectContent>
                {(subjects ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <Input
              type="date"
              value={date}
              max={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Roster */}
      {!deptId || !subjectId ? (
        <EmptyState text="Pick a class and subject to load the student roster." />
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Roster</h2>
              <p className="text-xs text-muted-foreground">
                {total} students · {presentCount} present · {total - presentCount} absent
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll no…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full pl-9 md:w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => markAll("present")}>
                All present
              </Button>
              <Button variant="outline" size="sm" onClick={() => markAll("absent")}>
                All absent
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || total === 0}
                className="gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
            {studentsLoading || existingLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8">
                <EmptyState text="No students match your filters." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="hidden px-4 py-2.5 md:table-cell">Roll No</th>
                    <th className="px-4 py-2.5 text-right">Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStudents.map((s) => {
                    const current = marks[s.id];
                    return (
                      <tr key={s.id} className="transition hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{s.full_name || s.email}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </td>
                        <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                          {s.identifier ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Tabs
                            value={current ?? ""}
                            onValueChange={(v) =>
                              setMarks((m) => ({ ...m, [s.id]: v as "present" | "absent" }))
                            }
                            className="flex justify-end"
                          >
                            <TabsList className="h-8 rounded-full bg-muted/60 p-0.5">
                              <TabsTrigger
                                value="present"
                                className="rounded-full px-3 text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                              >
                                Present
                              </TabsTrigger>
                              <TabsTrigger
                                value="absent"
                                className="rounded-full px-3 text-xs data-[state=active]:bg-rose-500 data-[state=active]:text-white"
                              >
                                Absent
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SHARED PIECES ================= */

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "grid h-8 w-8 place-items-center rounded-xl",
            tone === "good" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            tone === "bad" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
            !tone && "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: "present" | "absent" }) {
  return status === "present" ? (
    <Badge
      variant="secondary"
      className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    >
      <CheckCircle2 className="mr-1 h-3 w-3" /> Present
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400"
    >
      <XCircle className="mr-1 h-3 w-3" /> Absent
    </Badge>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border/60 bg-background/40 px-4 py-10 text-center">
      <ClipboardCheck className="mb-2 h-6 w-6 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function StudentSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <Skeleton className="h-96 w-full rounded-3xl" />
    </div>
  );
}
