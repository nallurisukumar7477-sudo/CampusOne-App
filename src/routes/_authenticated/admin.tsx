import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";
import { specializationsFor } from "@/lib/specializations";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin · CampusOne" },
      { name: "description", content: "Manage departments, courses, sections, users, and assignments." },
    ],
  }),
});

const ALL_ROLES: AppRole[] = [
  "student",
  "faculty",
  "hod",
  "principal",
  "admin",
  "placement_cell",
  "library_staff",
];

function AdminPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-2 text-lg font-semibold">Admins only</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You don't have access to this area.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Admin panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the academic structure, users, roles, and faculty assignments.
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
        <TabsContent value="departments" className="mt-4"><DepartmentsPanel /></TabsContent>
        <TabsContent value="courses" className="mt-4"><CoursesPanel /></TabsContent>
        <TabsContent value="sections" className="mt-4"><SectionsPanel /></TabsContent>
        <TabsContent value="assignments" className="mt-4"><AssignmentsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------------------- shared queries --------------------------- */

function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useCourses() {
  return useQuery({
    queryKey: ["courses-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, duration_years, department_id, department:departments(name)")
        .order("name");
      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        name: string;
        code: string;
        duration_years: number;
        department_id: string;
        department: { name: string } | null;
      }>;
    },
  });
}

function useSections() {
  return useQuery({
    queryKey: ["sections-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name, semester, course_id, course:courses(name, code, department:departments(name))")
        .order("semester");
      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        name: string;
        semester: number;
        course_id: string;
        course: { name: string; code: string; department: { name: string } | null } | null;
      }>;
    },
  });
}

/* ----------------------------- Departments ----------------------------- */

function DepartmentsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const { data: departments = [], isLoading } = useDepartments();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["departments"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("departments")
        .insert({ name: name.trim(), code: code.trim().toUpperCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department added");
      setName(""); setCode(""); invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase
        .from("departments")
        .update({ name: editName.trim(), code: editCode.trim().toUpperCase() })
        .eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department updated"); setEditId(null); invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Department removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name && code) create.mutate(); }}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_140px_auto]"
      >
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Computer Science" required />
        </div>
        <div className="space-y-1">
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSE" required />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-10"/>)}</div>
        ) : departments.length === 0 ? (
          <EmptyState label="No departments yet." />
        ) : (
          <ul className="divide-y divide-border">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.code}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditId(d.id); setEditName(d.name); setEditCode(d.code); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${d.name}"? This also removes its courses.`)) remove.mutate(d.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit department</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>Code</Label><Input value={editCode} onChange={(e) => setEditCode(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------- Courses ------------------------------- */

function CoursesPanel() {
  const qc = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { data: courses = [], isLoading } = useCourses();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [deptId, setDeptId] = useState<string>("");
  const [dur, setDur] = useState<string>("4");
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState({ name: "", code: "", department_id: "", duration_years: 4 });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["courses-all"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        department_id: deptId,
        duration_years: Number(dur),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Course added"); setName(""); setCode(""); setDeptId(""); setDur("4"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editId) return;
      const { error } = await supabase.from("courses").update({
        name: editState.name.trim(),
        code: editState.code.trim().toUpperCase(),
        department_id: editState.department_id,
        duration_years: editState.duration_years,
      }).eq("id", editId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Course updated"); setEditId(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Course removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (name && code && deptId) create.mutate(); }}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_120px_120px_auto]"
      >
        <div className="space-y-1">
          <Label>Department</Label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Course name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="B.Tech" required />
        </div>
        <div className="space-y-1">
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BTECH" required />
        </div>
        <div className="space-y-1">
          <Label>Years</Label>
          <Input type="number" min={1} max={6} value={dur} onChange={(e) => setDur(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>
        ) : courses.length === 0 ? (
          <EmptyState label="No courses yet." />
        ) : (
          <ul className="divide-y divide-border">
            {courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="secondary">{c.code}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.department?.name ?? "—"} · {c.duration_years} yrs ({c.duration_years * 2} sem)
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditId(c.id);
                    setEditState({ name: c.name, code: c.code, department_id: c.department_id, duration_years: c.duration_years });
                  }}><Pencil className="h-4 w-4"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete course "${c.name}"?`)) remove.mutate(c.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit course</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Department</Label>
              <Select value={editState.department_id} onValueChange={(v) => setEditState((s) => ({ ...s, department_id: v }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Name</Label><Input value={editState.name} onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))} /></div>
            <div><Label>Code</Label><Input value={editState.code} onChange={(e) => setEditState((s) => ({ ...s, code: e.target.value }))} /></div>
            <div><Label>Duration (years)</Label>
              <Input type="number" min={1} max={6} value={editState.duration_years}
                onChange={(e) => setEditState((s) => ({ ...s, duration_years: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
            <Button onClick={() => update.mutate()} disabled={update.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------- Sections ------------------------------ */

function SectionsPanel() {
  const qc = useQueryClient();
  const { data: courses = [] } = useCourses();
  const { data: sections = [], isLoading } = useSections();
  const [courseId, setCourseId] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [name, setName] = useState("");

  const activeCourse = courses.find((c) => c.id === courseId);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["sections-all"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sections").insert({
        course_id: courseId,
        semester: Number(semester),
        name: name.trim().toUpperCase(),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Section added"); setName(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Section removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (courseId && semester && name) create.mutate(); }}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_160px_120px_auto]"
      >
        <div className="space-y-1">
          <Label>Course</Label>
          <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSemester(""); }}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Semester</Label>
          <Select value={semester} onValueChange={setSemester} disabled={!activeCourse}>
            <SelectTrigger><SelectValue placeholder="Sem" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: (activeCourse?.duration_years ?? 4) * 2 }, (_, i) => i + 1).map((n) =>
                <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Section</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="A" required />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>
        ) : sections.length === 0 ? (
          <EmptyState label="No sections yet." />
        ) : (
          <ul className="divide-y divide-border">
            {sections.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {s.course?.code ?? "—"} · Sem {s.semester} · Section {s.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.course?.department?.name ?? ""} · {s.course?.name ?? ""}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete Section ${s.name}?`)) remove.mutate(s.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Users -------------------------------- */

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  department_id: string | null;
  course_id: string | null;
  section_id: string | null;
  semester: number | null;
}

function UsersPanel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"students" | "faculty">("students");
  const [q, setQ] = useState("");
  const [editUser, setEditUser] = useState<ProfileRow | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, specialization, department_id, course_id, section_id, semester")
        .order("full_name");
      if (error) throw error;
      return data as ProfileRow[];
    },
  });

  const { data: rolesRows = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data as { user_id: string; role: AppRole }[];
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, AppRole[]>();
    for (const r of rolesRows) {
      const list = m.get(r.user_id) ?? [];
      list.push(r.role);
      m.set(r.user_id, list);
    }
    return m;
  }, [rolesRows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const wantStudent = tab === "students";
    return profiles.filter((p) => {
      const rs = rolesByUser.get(p.id) ?? [];
      const isStudent = rs.includes("student");
      const isFaculty = rs.some((r) => ["faculty", "hod", "principal"].includes(r));
      const matches = wantStudent ? isStudent : isFaculty;
      if (!matches) return false;
      if (!term) return true;
      return (
        p.full_name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        (p.phone ?? "").toLowerCase().includes(term) ||
        (p.specialization ?? "").toLowerCase().includes(term)
      );
    });
  }, [profiles, rolesByUser, tab, q]);

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => { toast.success("Role added"); qc.invalidateQueries({ queryKey: ["admin-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role removed"); qc.invalidateQueries({ queryKey: ["admin-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile deleted");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${tab}…`} className="h-10 rounded-full pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState label={`No ${tab} found.`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const rs = rolesByUser.get(p.id) ?? [];
            return (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{p.full_name || "(no name)"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.email}
                      {p.phone ? ` · ${p.phone}` : ""}
                      {p.specialization ? ` · ${p.specialization}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditUser(p)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${p.full_name || p.email}? This removes their profile.`)) {
                          deleteProfile.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {rs.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                  {rs.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => removeRole.mutate({ userId: p.id, role: r })}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium hover:bg-destructive/10 hover:text-destructive"
                      title="Click to remove"
                    >
                      {ROLE_LABELS[r]}
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ))}
                  <Select onValueChange={(v) => addRole.mutate({ userId: p.id, role: v as AppRole })}>
                    <SelectTrigger className="h-8 max-w-[180px] text-xs"><SelectValue placeholder="Add role…" /></SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.filter((r) => !rs.includes(r)).map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
    </div>
  );
}

function EditUserDialog({ user, onClose }: { user: ProfileRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: departments = [] } = useDepartments();
  const { data: courses = [] } = useCourses();
  const { data: allSections = [] } = useSections();

  const [state, setState] = useState<ProfileRow | null>(null);

  useMemo(() => setState(user), [user]);

  const activeCourse = courses.find((c) => c.id === state?.course_id);
  const semCount = (activeCourse?.duration_years ?? 4) * 2;
  const filteredSections = allSections.filter(
    (s) => s.course_id === state?.course_id && s.semester === state?.semester,
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!state) return;
      const { error } = await supabase.from("profiles").update({
        full_name: state.full_name.trim(),
        phone: state.phone?.trim() || null,
        specialization: state.specialization?.trim() || null,
        department_id: state.department_id,
        course_id: state.course_id,
        section_id: state.section_id,
        semester: state.semester,
        profile_completed: true,
      } as never).eq("id", state.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!state) return null;

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Full name</Label>
            <Input value={state.full_name} onChange={(e) => setState({ ...state, full_name: e.target.value })} /></div>
          <div><Label>Phone</Label>
            <Input value={state.phone ?? ""} onChange={(e) => setState({ ...state, phone: e.target.value })} /></div>
          <div><Label>Department</Label>
            <Select value={state.department_id ?? ""} onValueChange={(v) => setState({ ...state, department_id: v, specialization: null, course_id: null, section_id: null })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <SpecializationField state={state} setState={setState} departments={departments} />
          <div><Label>Course</Label>
            <Select value={state.course_id ?? ""} onValueChange={(v) => setState({ ...state, course_id: v, section_id: null })} disabled={!state.department_id}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {courses.filter((c) => c.department_id === state.department_id).map((c) =>
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Semester</Label>
            <Select value={state.semester ? String(state.semester) : ""} onValueChange={(v) => setState({ ...state, semester: Number(v), section_id: null })} disabled={!state.course_id}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: semCount }, (_, i) => i + 1).map((n) =>
                  <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Section</Label>
            <Select value={state.section_id ?? ""} onValueChange={(v) => setState({ ...state, section_id: v })} disabled={!state.semester}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {filteredSections.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No sections for this course/semester.</div>
                ) : filteredSections.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Assignments ------------------------------ */

function AssignmentsPanel() {
  const qc = useQueryClient();
  const { data: sections = [] } = useSections();

  const { data: facultyList = [] } = useQuery({
    queryKey: ["faculty-list"],
    queryFn: async () => {
      const { data: rs, error: rErr } = await supabase
        .from("user_roles").select("user_id").in("role", ["faculty", "hod", "principal"]);
      if (rErr) throw rErr;
      const ids = Array.from(new Set((rs ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [] as { id: string; full_name: string; email: string }[];
      const { data, error } = await supabase
        .from("profiles").select("id, full_name, email").in("id", ids).order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, name, code").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faculty_assignments")
        .select("id, faculty_id, section_id, subject_id, faculty:profiles!faculty_assignments_faculty_id_fkey(full_name, email), section:sections(name, semester, course:courses(name, code)), subject:subjects(name)")
        .order("created_at", { ascending: false });
      if (error) {
        // fall back without the FK alias (in case constraint name differs)
        const { data: d2, error: e2 } = await supabase
          .from("faculty_assignments")
          .select("id, faculty_id, section_id, subject_id, section:sections(name, semester, course:courses(name, code)), subject:subjects(name)");
        if (e2) throw e2;
        return (d2 ?? []) as unknown as AssignmentRow[];
      }
      return data as unknown as AssignmentRow[];
    },
  });

  const [facultyId, setFacultyId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["assignments-all"] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("faculty_assignments").insert({
        faculty_id: facultyId,
        section_id: sectionId,
        subject_id: subjectId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment added"); setSubjectId(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faculty_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assignment removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (facultyId && sectionId) create.mutate(); }}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <div className="space-y-1">
          <Label>Faculty</Label>
          <Select value={facultyId} onValueChange={setFacultyId}>
            <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
            <SelectContent>
              {facultyList.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Assign a faculty role first.</div>
              ) : facultyList.map((f) => <SelectItem key={f.id} value={f.id}>{f.full_name || f.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.course?.code} · Sem {s.semester} · {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Subject (optional)</Label>
          <Select value={subjectId || "none"} onValueChange={(v) => setSubjectId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Class teacher (no subject)</SelectItem>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-12"/>)}</div>
        ) : assignments.length === 0 ? (
          <EmptyState label="No assignments yet." />
        ) : (
          <ul className="divide-y divide-border">
            {assignments.map((a) => {
              const facultyName = facultyList.find((f) => f.id === a.faculty_id);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {facultyName?.full_name || facultyName?.email || "Faculty"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.section?.course?.code} · Sem {a.section?.semester} · Section {a.section?.name}
                      {a.subject?.name ? ` · ${a.subject.name}` : " · Class teacher"}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remove this assignment?")) remove.mutate(a.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface AssignmentRow {
  id: string;
  faculty_id: string;
  section_id: string;
  subject_id: string | null;
  section: { name: string; semester: number; course: { name: string; code: string } | null } | null;
  subject: { name: string } | null;
}

/* --------------------------------- misc -------------------------------- */

function EmptyState({ label }: { label: string }) {
  return <p className="p-6 text-center text-sm text-muted-foreground">{label}</p>;
}

function SpecializationField({
  state,
  setState,
  departments,
}: {
  state: ProfileRow;
  setState: (p: ProfileRow) => void;
  departments: Array<{ id: string; name: string; code: string }>;
}) {
  const dept = departments.find((d) => d.id === state.department_id);
  const options = specializationsFor(dept?.code);
  if (options.length === 0) return null;
  return (
    <div>
      <Label>Specialization</Label>
      <Select
        value={state.specialization ?? ""}
        onValueChange={(v) => setState({ ...state, specialization: v })}
      >
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {options.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
