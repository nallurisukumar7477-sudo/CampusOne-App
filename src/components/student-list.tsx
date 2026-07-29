import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

export interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  semester: number | null;
  avatar_url: string | null;
  department: { name: string } | null;
  section: { name: string } | null;
}

interface Props {
  sectionId: string;
  showSearch?: boolean;
  renderRowAction?: (student: StudentRow) => ReactNode;
  emptyLabel?: string;
}

/**
 * Reusable student list, scoped to a section. Used by the Faculty dashboard
 * and available for future modules (Attendance, Notes, Assignments, etc.).
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
        .select(
          "id, full_name, email, phone, specialization, semester, avatar_url, department:departments(name), section:sections(name)",
        )
        .eq("section_id", sectionId)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return ((profs ?? []) as unknown as StudentRow[]).filter((p) =>
        studentIds.has(p.id),
      );
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
        (s.phone ?? "").toLowerCase().includes(term) ||
        (s.specialization ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
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
            placeholder="Search by name, email, phone or specialization…"
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
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <StudentCard key={s.id} student={s} action={renderRowAction?.(s)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentCard({
  student: s,
  action,
}: {
  student: StudentRow;
  action?: ReactNode;
}) {
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

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border border-border">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={s.full_name} />}
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {s.full_name || "(no name)"}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
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
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          {s.specialization && (
            <div className="mt-2 text-xs text-muted-foreground">
              {s.specialization}
            </div>
          )}
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{s.email}</span>
            </div>
            {s.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{s.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
