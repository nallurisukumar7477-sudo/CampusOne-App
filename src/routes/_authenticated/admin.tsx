import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin · CampusOne" },
      { name: "description", content: "Manage departments, users, and roles." },
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
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage departments, users, and role assignments.
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="departments" className="mt-4">
          <DepartmentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------------- Departments ----------------------------- */

function DepartmentsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const { data: departments = [], isLoading } = useQuery({
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

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("departments")
        .insert({ name: name.trim(), code: code.trim().toUpperCase() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department added");
      setName("");
      setCode("");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Department removed");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name && code) create.mutate();
        }}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_140px_auto]"
      >
        <div className="space-y-1">
          <Label htmlFor="dept-name">Name</Label>
          <Input
            id="dept-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Physics"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dept-code">Code</Label>
          <Input
            id="dept-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PHY"
            required
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : departments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No departments yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {departments.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.code}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Delete department "${d.name}"?`)) remove.mutate(d.id);
                  }}
                  aria-label={`Delete ${d.name}`}
                >
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
  department_id: string | null;
}

function UsersPanel() {
  const qc = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, department_id")
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

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of rolesRows) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  }

  const setDept = useMutation({
    mutationFn: async ({ id, dept }: { id: string; dept: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ department_id: dept })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-profiles"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("Role added");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading users…</p>;
  if (profiles.length === 0)
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No users yet. Users appear here once they sign up.
      </p>
    );

  return (
    <div className="space-y-3">
      {profiles.map((p) => {
        const userRoles = rolesByUser.get(p.id) ?? [];
        return (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {p.full_name || "(no name)"}
                </div>
                <div className="truncate text-xs text-muted-foreground">{p.email}</div>
              </div>
              <div className="sm:w-56">
                <Select
                  value={p.department_id ?? "none"}
                  onValueChange={(v) =>
                    setDept.mutate({ id: p.id, dept: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Roles
              </div>
              <div className="flex flex-wrap gap-2">
                {userRoles.length === 0 && (
                  <span className="text-xs text-muted-foreground">No roles</span>
                )}
                {userRoles.map((r) => (
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
              </div>

              <div className="mt-3 flex gap-2">
                <Select
                  onValueChange={(v) =>
                    addRole.mutate({ userId: p.id, role: v as AppRole })
                  }
                >
                  <SelectTrigger className="max-w-[220px]">
                    <SelectValue placeholder="Add role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.filter((r) => !userRoles.includes(r)).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
