import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, ClipboardCheck, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudentList } from "@/components/student-list";

export const Route = createFileRoute("/_authenticated/faculty-attendance")({
  component: FacultyAttendancePage,
  head: () => ({
    meta: [
      { title: "Attendance · Faculty · CampusOne" },
      { name: "description", content: "Mark daily attendance for an assigned class." },
    ],
  }),
});

type Dept = { id: string; name: string; code: string };
type Course = { id: string; name: string; code: string; department_id: string };
type Section = { id: string; name: string; semester: number; course_id: string };

function FacultyAttendancePage() {
  const { user, roles } = useAuth();
  const isFaculty = roles.some((r) => ["faculty", "hod", "principal"].includes(r));

  const [deptId, setDeptId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [date] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));

  const { data: departments, isLoading: departmentsLoading } = useQuery({
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

  const { data: courses, isLoading: coursesLoading } = useQuery({
    enabled: !!deptId,
    queryKey: ["courses", deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, department_id")
        .eq("department_id", deptId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    enabled: !!courseId,
    queryKey: ["sections", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, semester, course_id")
        .eq("course_id", courseId)
        .order("semester")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Section[];
    },
  });

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

  return (
    <div className="space-y-6">
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
            Mark class attendance
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Select the department, course, and section. Today's date is selected automatically.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Department</label>
            <Select
              value={deptId}
              onValueChange={(v) => {
                setDeptId(v);
                setCourseId("");
                setSectionId("");
              }}
              disabled={departmentsLoading}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select department" />
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
            <label className="text-xs font-medium text-muted-foreground">Course</label>
            <Select
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v);
                setSectionId("");
              }}
              disabled={!deptId || coursesLoading}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={deptId ? "Select course" : "Pick a department"} />
              </SelectTrigger>
              <SelectContent>
                {(courses ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Section</label>
            <Select
              value={sectionId}
              onValueChange={(v) => setSectionId(v)}
              disabled={!courseId || sectionsLoading}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={courseId ? "Select section" : "Pick a course"} />
              </SelectTrigger>
              <SelectContent>
                {(sections ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Sem {s.semester} · Section {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                readOnly
                className="h-10 rounded-xl border-border/70 bg-background/50 pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Student list</h2>
            <p className="text-xs text-muted-foreground">
              {sectionId
                ? "Students enrolled in the selected class appear below."
                : "Select a section to load the student list."}
            </p>
          </div>
        </div>

        {sectionId ? (
          <StudentList
            sectionId={sectionId}
            emptyLabel="No students found for this class."
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a department, course, and section to view the student list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}
