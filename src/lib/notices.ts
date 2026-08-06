import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type NoticeCategory =
  | "general"
  | "academic"
  | "exam"
  | "holiday"
  | "placement"
  | "event";
export type NoticePriority = "normal" | "important" | "urgent";

export const NOTICE_CATEGORIES: { value: NoticeCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic" },
  { value: "exam", label: "Exam" },
  { value: "holiday", label: "Holiday" },
  { value: "placement", label: "Placement" },
  { value: "event", label: "Event" },
];

export const NOTICE_PRIORITIES: { value: NoticePriority; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
];

export const PRIORITY_CLASS: Record<NoticePriority, string> = {
  normal: "bg-muted text-muted-foreground",
  important: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  urgent: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

export interface Notice {
  id: string;
  title: string;
  description: string;
  category: NoticeCategory;
  priority: NoticePriority;
  department_id: string | null;
  course_id: string | null;
  section_id: string | null;
  attachment_name: string | null;
  published: boolean;
  published_at: string;
  created_by: string;
  created_by_name: string;
  department?: { name: string; code: string } | null;
  course?: { name: string; code: string } | null;
  section?: { name: string } | null;
}

const SELECT =
  "id, title, description, category, priority, department_id, course_id, section_id, attachment_name, published, published_at, created_by, created_by_name, department:departments(name, code), course:courses(name, code), section:sections(name)";

/** Notices visible to the current user (RLS handles the dept/course/section filtering). */
export function useNotices() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["notices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select(SELECT)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Notice[];
    },
  });
}

/** Notice ids the current user has already opened. */
export function useNoticeReads() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["notice-reads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notice_reads")
        .select("notice_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.notice_id));
    },
  });
}

export function useMarkNoticeRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noticeId: string) => {
      if (!user) return;
      await supabase
        .from("notice_reads")
        .upsert({ notice_id: noticeId, user_id: user.id }, { onConflict: "notice_id,user_id" });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notice-reads"] });
    },
  });
}

/** Student-facing notifications: unread notices, newest first. */
export function useNoticeNotifications() {
  const { roles } = useAuth();
  const isStudent = roles.includes("student");
  const notices = useNotices();
  const reads = useNoticeReads();

  const list = isStudent ? (notices.data ?? []) : [];
  const readSet = reads.data ?? new Set<string>();
  const unread = list.filter((n) => !readSet.has(n.id));

  return {
    isStudent,
    notices: list,
    unread,
    unreadCount: unread.length,
    isRead: (id: string) => readSet.has(id),
    loading: notices.isLoading || reads.isLoading,
  };
}

export function formatNoticeDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
