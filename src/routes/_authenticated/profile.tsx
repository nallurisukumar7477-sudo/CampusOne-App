import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABELS } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "My profile · CampusOne" },
      { name: "description", content: "Manage your CampusOne profile, phone number and profile photo." },
    ],
  }),
});

interface FullProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  semester: number | null;
  avatar_url: string | null;
  department: { name: string } | null;
  course: { name: string; code: string } | null;
  section: { name: string } | null;
}

function ProfilePage() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id],
    queryFn: async (): Promise<FullProfile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, specialization, semester, avatar_url, department:departments(name), course:courses(name, code), section:sections(name)",
        )
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FullProfile;
    },
  });

  useEffect(() => {
    if (profile) setPhone(profile.phone ?? "");
  }, [profile]);

  // Load signed URL for avatar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profile?.avatar_url) {
        setAvatarPreview(null);
        return;
      }
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 3600);
      if (!cancelled) setAvatarPreview(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_url]);

  const savePhone = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ phone: phone.trim() })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Phone number updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile photo updated");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  const initials =
    profile.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">My profile</h1>
        <p className="text-sm text-muted-foreground">
          Update your phone number and profile photo. Academic details are managed by
          the administrator.
        </p>
      </div>

      <div className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)] md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border border-border shadow-sm">
              {avatarPreview && <AvatarImage src={avatarPreview} alt={profile.full_name} />}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-2xl font-bold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-input"
              className="absolute -bottom-1 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border bg-background shadow-md hover:bg-accent"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </label>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f);
              }}
            />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground">
              {roles.map((r) => ROLE_LABELS[r]).join(" · ") || "Student"}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <ReadOnly label="Full name" value={profile.full_name} />
          <ReadOnly label="Email" value={profile.email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label="Department" value={profile.department?.name ?? "—"} locked />
            <ReadOnly label="Specialization" value={profile.specialization ?? "—"} locked />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ReadOnly
              label="Course"
              value={profile.course ? `${profile.course.name} (${profile.course.code})` : "—"}
              locked
            />
            <ReadOnly label="Semester" value={profile.semester ? `Sem ${profile.semester}` : "—"} locked />
            <ReadOnly label="Section" value={profile.section?.name ? `Section ${profile.section.name}` : "—"} locked />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePhone.mutate();
            }}
            className="space-y-2 border-t border-border pt-4"
          >
            <Label htmlFor="phone">Phone number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
              <Button type="submit" disabled={savePhone.isPending}>
                {savePhone.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ReadOnly({ label, value, locked }: { label: string; value: string; locked?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {locked && <Lock className="h-3 w-3" aria-label="Admin only" />}
      </div>
      <div className="mt-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
        {value}
      </div>
    </div>
  );
}
