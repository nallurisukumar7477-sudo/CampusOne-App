import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { buildSampleGrid, type Slot } from "@/lib/timetable";

export interface ClassCell {
  subject: { name: string; code: string } | null;
  faculty: string | null;
  room: string | null;
}

export interface StudentProfileInfo {
  section_id: string | null;
  semester: number | null;
  specialization: string | null;
  full_name: string | null;
  department: { name: string; code: string } | null;
  section: { name: string; course: { name: string; code: string } | null } | null;
}

interface EntryRow {
  day_of_week: number;
  slot_id: string;
  faculty_id: string | null;
  room: string | null;
  subject: { id: string; name: string; code: string } | null;
}

/**
 * Single source of truth for the student-facing timetable. Both the dashboard's
 * "Today's timetable" card and the full weekly timetable page read from here so
 * they always agree (same query keys → shared react-query cache).
 */
export function useStudentTimetable() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    enabled: !!user,
    queryKey: ["timetable-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, section_id, semester, specialization, department:departments(name, code), section:sections(name, course:courses(name, code))",
        )
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as StudentProfileInfo | null;
    },
  });

  const slotsQuery = useQuery({
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

  const sectionId = profileQuery.data?.section_id ?? null;

  const publishedQuery = useQuery({
    enabled: !!sectionId,
    queryKey: ["published-timetable", sectionId],
    queryFn: async () => {
      const { data: tt, error } = await supabase
        .from("timetables")
        .select("id, published")
        .eq("section_id", sectionId!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (!tt) return null;
      const { data: rows, error: eErr } = await supabase
        .from("timetable_entries")
        .select("day_of_week, slot_id, faculty_id, room, subject:subjects(id, name, code)")
        .eq("timetable_id", tt.id);
      if (eErr) throw eErr;
      const entries = (rows ?? []) as unknown as EntryRow[];
      const facultyIds = Array.from(
        new Set(entries.map((e) => e.faculty_id).filter(Boolean) as string[]),
      );
      let names: Record<string, string> = {};
      if (facultyIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", facultyIds);
        names = Object.fromEntries(
          (profs ?? []).map((p) => [p.id, p.full_name || "Faculty"]),
        );
      }
      return { entries, names };
    },
  });

  const subjectsQuery = useQuery({
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

  const slots = slotsQuery.data ?? [];
  const published = publishedQuery.data ?? null;

  const cells = useMemo(() => {
    const map = new Map<string, ClassCell>();
    if (published) {
      for (const e of published.entries) {
        map.set(`${e.day_of_week}:${e.slot_id}`, {
          subject: e.subject,
          faculty: e.faculty_id ? published.names[e.faculty_id] ?? null : null,
          room: e.room,
        });
      }
    }
    return map;
  }, [published]);

  return {
    profile: profileQuery.data ?? null,
    slots,
    cells,
    isPublished: !!published,
    isLoading: slotsQuery.isLoading || publishedQuery.isLoading,
  };
}

