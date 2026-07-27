import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

export interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  roll_number: string | null;
  avatar_url: string | null;
}

interface Props {
  sectionId: string;
  showSearch?: boolean;
  renderRowAction?: (student: StudentRow) => ReactNode;
  emptyLabel?: string;
}

/**
 * Reusable student list, scoped to a section. Reused by Faculty dashboard and
 * available for future modules (Attendance, Notes, Assignments, Meetings, WiFi).
 */
export function StudentList({
  sectionId,
  showSearch = true,
  renderRowAction,
  emptyLabel = "No students in this section yet.",
}: Props) {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["section-students", sectionId],
    queryFn: async (): Promise<StudentRow[]> => {
      const { data: roleRows, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (rErr) throw rErr;
      const studentIds = new Set((roleRows ?? []).map((r) => r.user_id));

      const { data: profs, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, roll_number, avatar_url")
        .eq("section_id", sectionId)
        .order("roll_number", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (profs ?? []).filter((p) => studentIds.has(p.id)) as StudentRow[];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (s) =>
        s.full_name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        (s.roll_number ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, roll no. or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 rounded-full pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[80px_1fr_1fr_auto] gap-4 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Roll</span>
            <span>Name</span>
            <span>Email</span>
            <span className="text-right">Action</span>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((s) => {
              const initials =
                s.full_name
                  ?.split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("") || "S";
              return (
                <li
                  key={s.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[80px_1fr_1fr_auto] sm:gap-4"
                >
                  <span className="hidden text-sm font-mono text-muted-foreground sm:inline">
                    {s.roll_number ?? "—"}
                  </span>
                  <div className="flex items-center gap-3 sm:col-span-1">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {s.full_name || "(no name)"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground sm:hidden">
                        {s.roll_number ?? "—"} · {s.email}
                      </div>
                    </div>
                  </div>
                  <div className="hidden truncate text-sm text-muted-foreground sm:block">
                    {s.email}
                  </div>
                  <div className="justify-self-end">
                    {renderRowAction?.(s) ?? null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
