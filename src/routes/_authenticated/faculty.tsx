import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, ChevronRight, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentList } from "@/components/student-list";

export const Route = createFileRoute("/_authenticated/faculty")({
  component: FacultyDashboard,
  head: () => ({
    meta: [
      { title: "Faculty · CampusOne" },
      { name: "description", content: "Faculty classes and student rosters." },
    ],
  }),
});

interface AssignmentRow {
  id: string;
  section_id: string;
  section: {
    id: string;
    name: string;
    semester: number;
    course: { id: string; name: string; code: string; department: { name: string } | null } | null;
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

function FacultyDashboard() {
  const { user, roles } = useAuth();
  const [active, setActive] = useState<ClassGroup | null>(null);

  const isFaculty = roles.some((r) =>
    ["faculty", "hod", "principal"].includes(r),
  );

  const { data: assignments = [], isLoading } = useQuery({
    enabled: !!user && isFaculty,
    queryKey: ["faculty-assignments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faculty_assignments")
        .select(
          "id, section_id, subject:subjects(id, name, code), section:sections(id, name, semester, course:courses(id, name, code, department:departments(name)))",
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
      const existing = map.get(key);
      const subjName = a.subject?.name;
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

  if (!isFaculty) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-2 text-lg font-semibold">Faculty only</h1>
        <p className="text-sm text-muted-foreground">
          You don't have faculty access to this area.
        </p>
      </div>
    );
  }

  if (active) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActive(null)}
          className="-ml-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to my classes
        </Button>
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{active.departmentName}</Badge>
            <ChevronRight className="h-3 w-3" />
            <span>{active.courseName} ({active.courseCode})</span>
            <ChevronRight className="h-3 w-3" />
            <span>Semester {active.semester}</span>
            <ChevronRight className="h-3 w-3" />
            <span>Section {active.sectionName}</span>
          </div>
          <h2 className="mt-2 text-xl font-bold">Student roster</h2>
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
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">My classes</h1>
        <p className="text-sm text-muted-foreground">
          Classes and sections assigned to you. Open one to see the student list.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
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
              className="group text-left rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {g.departmentName}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </div>
              <div className="mt-3 text-lg font-bold">
                {g.courseCode} · Sem {g.semester} · {g.sectionName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{g.courseName}</div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{g.subjects.length > 0 ? g.subjects.join(" · ") : "Class teacher"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
