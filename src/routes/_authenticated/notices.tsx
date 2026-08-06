import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Megaphone,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  NOTICE_CATEGORIES,
  NOTICE_PRIORITIES,
  PRIORITY_CLASS,
  formatNoticeDate,
  useMarkNoticeRead,
  useNoticeReads,
  useNotices,
  type Notice,
  type NoticeCategory,
  type NoticePriority,
} from "@/lib/notices";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notices")({
  component: NoticesPage,
  head: () => ({
    meta: [
      { title: "Notices · CampusOne" },
      {
        name: "description",
        content:
          "College notices and announcements for your department, course and section on CampusOne.",
      },
      { property: "og:title", content: "CampusOne Notices" },
      {
        property: "og:description",
        content: "Publish and read college notices, announcements and alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const NONE = "__none__";

interface FormState {
  id: string | null;
  title: string;
  description: string;
  category: NoticeCategory;
  priority: NoticePriority;
  department_id: string;
  course_id: string;
  section_id: string;
  attachment_name: string;
}

const emptyForm: FormState = {
  id: null,
  title: "",
  description: "",
  category: "general",
  priority: "normal",
  department_id: NONE,
  course_id: NONE,
  section_id: NONE,
  attachment_name: "",
};

function NoticesPage() {
  const { user, roles } = useAuth();
  const isFaculty = roles.some((r) => ["faculty", "hod", "principal", "admin"].includes(r));
  const { data: notices = [], isLoading } = useNotices();
  const { data: readSet } = useNoticeReads();
  const markRead = useMarkNoticeRead();
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: departments = [] } = useQuery({
    queryKey: ["notice-departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name, code").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["notice-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, department_id")
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["notice-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, semester, course_id")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: myProfile } = useQuery({
    enabled: !!user,
    queryKey: ["notice-author-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const filteredCourses = useMemo(
    () =>
      form.department_id === NONE
        ? courses
        : courses.filter((c) => c.department_id === form.department_id),
    [courses, form.department_id],
  );
  const filteredSections = useMemo(
    () => (form.course_id === NONE ? [] : sections.filter((s) => s.course_id === form.course_id)),
    [sections, form.course_id],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notices;
    return notices.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.category.includes(q) ||
        (n.created_by_name ?? "").toLowerCase().includes(q),
    );
  }, [notices, query]);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        title: f.title.trim(),
        description: f.description.trim(),
        category: f.category,
        priority: f.priority,
        department_id: f.department_id === NONE ? null : f.department_id,
        course_id: f.course_id === NONE ? null : f.course_id,
        section_id: f.section_id === NONE ? null : f.section_id,
        attachment_name: f.attachment_name.trim() || null,
        published: true,
      };
      if (f.id) {
        const { error } = await supabase.from("notices").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notices").insert({
          ...payload,
          created_by: user!.id,
          created_by_name: myProfile?.full_name || user?.email || "Faculty",
        });
        if (error) throw error;
      }
    },
    onSuccess: (_d, f) => {
      toast.success(f.id ? "Notice updated" : "Notice published");
      setDialogOpen(false);
      setForm(emptyForm);
      void qc.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice deleted");
      void qc.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (n: Notice) => {
    setForm({
      id: n.id,
      title: n.title,
      description: n.description,
      category: n.category,
      priority: n.priority,
      department_id: n.department_id ?? NONE,
      course_id: n.course_id ?? NONE,
      section_id: n.section_id ?? NONE,
      attachment_name: n.attachment_name ?? "",
    });
    setDialogOpen(true);
  };

  const canSubmit = form.title.trim().length > 2 && form.description.trim().length > 0;

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Notices</h1>
            <p className="text-sm text-muted-foreground">
              {isFaculty
                ? "Publish announcements to students by department, course and section."
                : "Announcements from your department and faculty."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notices…"
              className="h-10 rounded-full pl-9"
            />
          </div>
          {isFaculty && (
            <Button onClick={openCreate} className="h-10 shrink-0 rounded-full">
              <Plus className="mr-1.5 h-4 w-4" />
              New notice
            </Button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl border border-border/60 bg-card/50" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No notices yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isFaculty
              ? "Publish your first notice to reach students."
              : "You'll see notices here as soon as your faculty publishes them."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((n) => {
            const unread = !isFaculty && readSet ? !readSet.has(n.id) : false;
            return (
              <li
                key={n.id}
                onMouseEnter={() => unread && markRead.mutate(n.id)}
                className={cn(
                  "group rounded-3xl border border-border/60 bg-card/70 p-5 shadow-[var(--shadow-elegant)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-lg",
                  unread && "ring-1 ring-primary/30",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn(
                          "rounded-full border-0 text-[10px] capitalize",
                          PRIORITY_CLASS[n.priority],
                        )}
                      >
                        {n.priority}
                      </Badge>
                      <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                        {n.category}
                      </Badge>
                      {unread && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          New
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-bold tracking-tight">{n.title}</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {n.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {n.created_by_name || "Faculty"}
                      </span>
                      <span>{formatNoticeDate(n.published_at)}</span>
                      {n.department && <span>· {n.department.code}</span>}
                      {n.course && <span>· {n.course.code}</span>}
                      {n.section && <span>· Section {n.section.name}</span>}
                      {n.attachment_name && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" />
                          {n.attachment_name}
                        </span>
                      )}
                    </div>
                  </div>
                  {isFaculty && n.created_by === user?.id && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label="Edit notice"
                        onClick={() => openEdit(n)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                        aria-label="Delete notice"
                        onClick={() => remove.mutate(n.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit notice" : "New notice"}</DialogTitle>
            <DialogDescription>
              Students matching the selected department, course and section will receive this notice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notice-title">Title</Label>
              <Input
                id="notice-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Mid-sem exam schedule released"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-desc">Description</Label>
              <Textarea
                id="notice-desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Add the full details of this notice…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as NoticeCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTICE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as NoticePriority }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTICE_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={form.department_id}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, department_id: v, course_id: NONE, section_id: NONE }))
                }
              >
                <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.code} · {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Course / specialization</Label>
                <Select
                  value={form.course_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, course_id: v, section_id: NONE }))}
                >
                  <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All courses</SelectItem>
                    {filteredCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Section (optional)</Label>
                <Select
                  value={form.section_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, section_id: v }))}
                  disabled={form.course_id === NONE}
                >
                  <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All sections</SelectItem>
                    {filteredSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        Sem {s.semester} · Section {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-attach">Attachment (placeholder)</Label>
              <Input
                id="notice-attach"
                value={form.attachment_name}
                onChange={(e) => setForm((f) => ({ ...f, attachment_name: e.target.value }))}
                placeholder="e.g. exam-schedule.pdf"
              />
              <p className="text-[11px] text-muted-foreground">
                File uploads arrive later — the file name is shown with the notice for now.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={!canSubmit || save.isPending}
              onClick={() => save.mutate(form)}
            >
              {save.isPending ? "Saving…" : form.id ? "Save changes" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
