import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCog, Save, ShieldAlert, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { DAYS, buildSampleGrid, slotRange, type Slot } from "@/lib/timetable";

export const Route = createFileRoute("/_authenticated/timetable-manage")({
  component: TimetableManage,
  head: () => ({
    meta: [
      { title: "Timetable management · CampusOne" },
      {
        name: "description",
        content: "Faculty tool to build and publish weekly section timetables.",
      },
      { property: "og:title", content: "Timetable management · CampusOne" },
      {
        property: "og:description",
        content: "Assign subjects and mentors to each period, then publish to students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const NONE = "__none__";

function TimetableManage() {
  const { roles } = useAuth();
  const isStaff = roles.some((r) =>
    ["faculty", "hod", "principal", "admin"].includes(r),
  );
  const qc = useQueryClient();

  const [deptId, setDeptId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [day, setDay] = useState<number>(1);
  const [subjectGrid, setSubjectGrid] = useState<Record<string, string>>({});
  const [facultyGrid, setFacultyGrid] = useState<Record<string, string>>({});

  const { data: departments = [] } = useQuery({
    enabled: isStaff,
    queryKey: ["tm-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    enabled: isStaff && !!deptId,
    queryKey: ["tm-courses", deptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("department_id", deptId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sections = [] } = useQuery({
    enabled: isStaff && !!courseId,
    queryKey: ["tm-sections", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, semester")
        .eq("course_id", courseId)
        .order("semester")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    enabled: isStaff,
    queryKey: ["timetable-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("id, position, label, kind, period_no, start_time, end_time")
        .order("position");
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const { data: subjects = [] } = useQuery({
    enabled: isStaff,
    queryKey: ["timetable-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code")
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: facultyList = [] } = useQuery({
    enabled: isStaff,
    queryKey: ["tm-faculty"],
    queryFn: async () => {
      const { data: roleRows, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["faculty", "hod", "principal"]);
      if (error) throw error;
      const ids = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
      if (!ids.length) return [];
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids)
        .order("full_name");
      if (pErr) throw pErr;
      return profs ?? [];
    },
  });

  const { data: timetable, isLoading: ttLoading } = useQuery({
    enabled: isStaff && !!sectionId,
    queryKey: ["tm-timetable", sectionId],
    queryFn: async () => {
      const { data: tt, error } = await supabase
        .from("timetables")
        .select("id, published, published_at")
        .eq("section_id", sectionId)
        .maybeSingle();
      if (error) throw error;
      if (!tt) return { timetable: null, entries: [] as Array<{ day_of_week: number; slot_id: string; subject_id: string | null; faculty_id: string | null }> };
      const { data: rows, error: eErr } = await supabase
        .from("timetable_entries")
        .select("day_of_week, slot_id, subject_id, faculty_id")
        .eq("timetable_id", tt.id);
      if (eErr) throw eErr;
      return { timetable: tt, entries: rows ?? [] };
    },
  });

  // Prime the editable grid whenever a section's stored timetable loads.
  useEffect(() => {
    if (!sectionId) {
      setSubjectGrid({});
      setFacultyGrid({});
      return;
    }
    if (!timetable) return;
    const s: Record<string, string> = {};
    const f: Record<string, string> = {};
    for (const e of timetable.entries) {
      const key = `${e.day_of_week}:${e.slot_id}`;
      if (e.subject_id) s[key] = e.subject_id;
      if (e.faculty_id) f[key] = e.faculty_id;
    }
    setSubjectGrid(s);
    setFacultyGrid(f);
  }, [timetable, sectionId]);

  const teachingSlots = useMemo(
    () => slots.filter((s) => s.kind === "class"),
    [slots],
  );

  const save = useMutation({
    mutationFn: async (publish: boolean | null) => {
      if (!sectionId) throw new Error("Select a section first");

      // Validation is only enforced when publishing to students; drafts can be
      // saved half-finished.
      if (publish === true) {
        const missing: string[] = [];
        for (const d of DAYS) {
          for (const slot of teachingSlots) {
            const key = `${d.value}:${slot.id}`;
            if (!subjectGrid[key]) missing.push(`${d.short} · ${slot.label}`);
          }
        }
        if (missing.length) {
          throw new Error(
            `Assign a subject to every period before publishing. Missing: ${missing
              .slice(0, 4)
              .join(", ")}${missing.length > 4 ? ` +${missing.length - 4} more` : ""}`,
          );
        }
        // Guard against duplicate/overlapping period definitions.
        const seen = new Set<string>();
        for (const d of DAYS) {
          for (const slot of teachingSlots) {
            const k = `${d.value}:${slot.id}`;
            if (seen.has(k)) throw new Error("Overlapping periods detected");
            seen.add(k);
          }
        }
      }
      let ttId = timetable?.timetable?.id;
      if (!ttId) {
        const { data, error } = await supabase
          .from("timetables")
          .insert({ section_id: sectionId, published: publish === true })
          .select("id")
          .single();
        if (error) throw error;
        ttId = data.id;
      } else if (publish !== null) {
        const { error } = await supabase
          .from("timetables")
          .update({
            published: publish,
            published_at: publish ? new Date().toISOString() : null,
          })
          .eq("id", ttId);
        if (error) throw error;
      }

      const rows = [] as Array<{
        timetable_id: string;
        day_of_week: number;
        slot_id: string;
        subject_id: string | null;
        faculty_id: string | null;
      }>;
      for (const d of DAYS) {
        for (const slot of teachingSlots) {
          const key = `${d.value}:${slot.id}`;
          const subject_id = subjectGrid[key] ?? null;
          const faculty_id = facultyGrid[key] ?? null;
          if (!subject_id && !faculty_id) continue;
          rows.push({
            timetable_id: ttId,
            day_of_week: d.value,
            slot_id: slot.id,
            subject_id,
            faculty_id,
          });
        }
      }

      const { error: delErr } = await supabase
        .from("timetable_entries")
        .delete()
        .eq("timetable_id", ttId);
      if (delErr) throw delErr;
      if (rows.length) {
        const { error: insErr } = await supabase
          .from("timetable_entries")
          .insert(rows);
        if (insErr) throw insErr;
      }
      return publish;
    },
    onSuccess: (publish) => {
      toast.success(
        publish === true
          ? "Timetable published — students can see it now"
          : publish === false
            ? "Timetable unpublished"
            : "Timetable saved",
      );
      void qc.invalidateQueries({ queryKey: ["tm-timetable", sectionId] });
      void qc.invalidateQueries({ queryKey: ["published-timetable"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save timetable"),
  });

  if (!isStaff) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-2 text-lg font-semibold">Faculty only</h1>
        <p className="text-sm text-muted-foreground">
          You don't have access to timetable management.
        </p>
      </div>
    );
  }

  const isPublished = !!timetable?.timetable?.published;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          Timetable management
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a class, assign subjects and mentors to each period, then publish.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Department">
            <Select
              value={deptId}
              onValueChange={(v) => {
                setDeptId(v);
                setCourseId("");
                setSectionId("");
              }}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Course">
            <Select
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v);
                setSectionId("");
              }}
              disabled={!deptId}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Section">
            <Select value={sectionId} onValueChange={setSectionId} disabled={!courseId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    Sem {s.semester} · Section {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {sectionId && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge
              variant={isPublished ? "default" : "outline"}
              className="rounded-full"
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                setSubjectGrid(buildSampleGrid(slots, subjects.map((s) => s.id)))
              }
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Fill sample week
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={save.isPending}
              onClick={() => save.mutate(null)}
            >
              <Save className="mr-1.5 h-4 w-4" /> Save draft
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              disabled={save.isPending}
              onClick={() => save.mutate(!isPublished)}
            >
              <Send className="mr-1.5 h-4 w-4" />
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        )}
      </div>

      {!sectionId ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <CalendarCog className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Please select a section.
          </p>
        </div>
      ) : slotsLoading || ttLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <div className="flex min-w-max gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDay(d.value)}
                  className={cn(
                    "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                    d.value === day
                      ? "border-transparent bg-foreground text-background shadow-[var(--shadow-elegant)]"
                      : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d.short}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-3">
            {slots.map((slot) => {
              if (slot.kind !== "class") {
                return (
                  <li
                    key={slot.id}
                    className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm"
                  >
                    <span className="font-semibold">{slot.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {slotRange(slot)}
                    </span>
                  </li>
                );
              }
              const key = `${day}:${slot.id}`;
              return (
                <li
                  key={slot.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {slot.period_no}
                    </span>
                    {slot.label}
                    <span className="text-xs font-normal text-muted-foreground">
                      {slotRange(slot)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Select
                      value={subjectGrid[key] ?? NONE}
                      onValueChange={(v) =>
                        setSubjectGrid((g) => {
                          const next = { ...g };
                          if (v === NONE) delete next[key];
                          else next[key] = v;
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Free period</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={facultyGrid[key] ?? NONE}
                      onValueChange={(v) =>
                        setFacultyGrid((g) => {
                          const next = { ...g };
                          if (v === NONE) delete next[key];
                          else next[key] = v;
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Mentor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Mentor TBA</SelectItem>
                        {facultyList.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.full_name || f.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
