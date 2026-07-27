import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/profile-setup")({
  component: ProfileSetupPage,
  head: () => ({
    meta: [
      { title: "Complete your profile · CampusOne" },
      { name: "description", content: "Finish setting up your CampusOne student profile." },
    ],
  }),
});

function ProfileSetupPage() {
  const { user, refreshRoles } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [phone, setPhone] = useState("");

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile-setup", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    if (profile.profile_completed) {
      void navigate({ to: "/dashboard", replace: true });
      return;
    }
    setFullName(profile.full_name ?? "");
    setRollNumber(profile.roll_number ?? "");
    setDepartmentId(profile.department_id ?? "");
    setCourseId(profile.course_id ?? "");
    setSemester(profile.semester ? String(profile.semester) : "");
    setSectionId(profile.section_id ?? "");
    setPhone(profile.phone ?? "");
  }, [profile, navigate]);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: courses = [] } = useQuery({
    enabled: !!departmentId,
    queryKey: ["courses-by-dept", departmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, code, duration_years")
        .eq("department_id", departmentId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const activeCourse = courses.find((c) => c.id === courseId);
  const semCount = (activeCourse?.duration_years ?? 4) * 2;

  const { data: sections = [] } = useQuery({
    enabled: !!courseId && !!semester,
    queryKey: ["sections", courseId, semester],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name")
        .eq("course_id", courseId)
        .eq("semester", Number(semester))
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          roll_number: rollNumber.trim(),
          department_id: departmentId,
          course_id: courseId,
          semester: Number(semester),
          section_id: sectionId,
          phone: phone.trim(),
          profile_completed: true,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Profile completed");
      await refreshRoles();
      void navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    fullName.trim() &&
    rollNumber.trim() &&
    departmentId &&
    courseId &&
    semester &&
    sectionId &&
    phone.trim();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground shadow-[var(--shadow-glow)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Welcome to CampusOne
          </h1>
          <p className="text-sm text-muted-foreground">
            Finish setting up your student profile to continue.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) save.mutate();
        }}
        className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Roll number">
            <Input
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 22CSE001"
              required
            />
          </Field>
          <Field label="Department">
            <Select
              value={departmentId}
              onValueChange={(v) => {
                setDepartmentId(v);
                setCourseId("");
                setSemester("");
                setSectionId("");
              }}
            >
              <SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Course">
            <Select
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v);
                setSemester("");
                setSectionId("");
              }}
              disabled={!departmentId}
            >
              <SelectTrigger><SelectValue placeholder="Choose course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Semester">
            <Select
              value={semester}
              onValueChange={(v) => {
                setSemester(v);
                setSectionId("");
              }}
              disabled={!courseId}
            >
              <SelectTrigger><SelectValue placeholder="Choose semester" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: semCount }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>Semester {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Section">
            <Select value={sectionId} onValueChange={setSectionId} disabled={!semester}>
              <SelectTrigger><SelectValue placeholder="Choose section" /></SelectTrigger>
              <SelectContent>
                {sections.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No sections yet. Ask your admin to add one.
                  </div>
                ) : sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone number" className="sm:col-span-2">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              type="tel"
              required
            />
          </Field>
        </div>

        <p className="text-xs text-muted-foreground">
          Roll number, department, course, semester, and section can only be edited by
          an administrator after this. You will still be able to update your phone
          number and profile photo any time.
        </p>

        <Button
          type="submit"
          disabled={!canSubmit || save.isPending}
          className="w-full sm:w-auto"
        >
          {save.isPending ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save and continue"
          )}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
