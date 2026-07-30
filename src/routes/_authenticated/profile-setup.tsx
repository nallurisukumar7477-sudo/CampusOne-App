import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { specializationsFor } from "@/lib/specializations";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [specialization, setSpecialization] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
    setPhone(profile.phone ?? "");
    setDepartmentId(profile.department_id ?? "");
    setSpecialization((profile as { specialization?: string | null }).specialization ?? "");
    setCourseId(profile.course_id ?? "");
    setSemester(profile.semester ? String(profile.semester) : "");
    setSectionId(profile.section_id ?? "");
  }, [profile, navigate]);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const activeDept = departments.find((d) => d.id === departmentId);
  const specOptions = specializationsFor(activeDept?.code);
  const needsSpec = specOptions.length > 0;

  // Course is derived from the department (one program per department for V1).
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

  const derivedCourseId = courses[0]?.id ?? "";
  useEffect(() => {
    if (derivedCourseId && derivedCourseId !== courseId) setCourseId(derivedCourseId);
  }, [derivedCourseId, courseId]);

  const semCount = (courses[0]?.duration_years ?? 4) * 2;

  const { data: sections = [] } = useQuery({
    enabled: !!derivedCourseId && !!semester,
    queryKey: ["sections", derivedCourseId, semester],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, name")
        .eq("course_id", derivedCourseId)
        .eq("semester", Number(semester))
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const onPickPhoto = (f: File) => {
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  };

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10;

  const save = useMutation({
    mutationFn: async () => {
      if (!user) return;
      let avatar_url: string | undefined;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw upErr;
        avatar_url = path;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          department_id: departmentId,
          specialization: needsSpec ? specialization : null,
          course_id: courseId,
          semester: Number(semester),
          section_id: sectionId,
          profile_completed: true,
          ...(avatar_url ? { avatar_url } : {}),
        } as never)
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
    phone.trim() &&
    departmentId &&
    (!needsSpec || specialization) &&
    courseId &&
    semester &&
    sectionId;

  const initials =
    fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";

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
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 border border-border shadow-sm">
              {avatarPreview && <AvatarImage src={avatarPreview} alt={fullName} />}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 right-0 grid h-8 w-8 place-items-center rounded-full border border-border bg-background shadow-md hover:bg-accent"
              aria-label="Choose photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickPhoto(f);
              }}
            />
          </div>
          <div className="text-center sm:text-left">
            <div className="text-sm font-semibold">Profile photo</div>
            <div className="text-xs text-muted-foreground">
              Optional. You can change this any time.
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Email address">
            <Input value={user?.email ?? ""} readOnly disabled />
          </Field>
          <Field label="Phone number">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              type="tel"
              required
            />
          </Field>
          <Field label="Department">
            <Select
              value={departmentId}
              onValueChange={(v) => {
                setDepartmentId(v);
                setSpecialization("");
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
          {needsSpec && (
            <Field label="Specialization" className="sm:col-span-2">
              <Select value={specialization} onValueChange={setSpecialization}>
                <SelectTrigger><SelectValue placeholder="Choose specialization" /></SelectTrigger>
                <SelectContent>
                  {specOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Semester">
            <Select
              value={semester}
              onValueChange={(v) => {
                setSemester(v);
                setSectionId("");
              }}
              disabled={!departmentId}
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
        </div>

        <p className="text-xs text-muted-foreground">
          Department, specialization, course, semester, and section can only be
          edited by an administrator after this. You can still update your phone
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
