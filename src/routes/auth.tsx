import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff, GraduationCap, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in · CampusOne" },
      { name: "description", content: "Sign in or create your CampusOne account." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupRole, setSignupRole] = useState<"student" | "faculty">("student");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const pwChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const pwScore = Object.values(pwChecks).filter(Boolean).length;
  const pwStrength =
    password.length === 0
      ? null
      : pwScore <= 2
        ? { label: "Weak", tone: "bg-destructive", text: "text-destructive", width: "w-1/3" }
        : pwScore <= 4
          ? { label: "Medium", tone: "bg-amber-500", text: "text-amber-600", width: "w-2/3" }
          : { label: "Strong", tone: "bg-emerald-500", text: "text-emerald-600", width: "w-full" };

  const landingFor = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const list = (data ?? []).map((r) => r.role as string);
    const isStaff = list.some((r) =>
      ["faculty", "hod", "principal", "placement_cell", "library_staff"].includes(r),
    );
    return isStaff && !list.includes("student") ? "/faculty-panel" : "/dashboard";
  };

  const goToLanding = async (userId: string) => {
    const to = await landingFor(userId);
    void navigate({ to, replace: true });
  };

  useEffect(() => {
    if (!loading && session?.user) void goToLanding(session.user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        if (data.user) await goToLanding(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role: signupRole },
          },
        });
        if (error) throw error;
        toast.success("Account created");
        if (data.user) await goToLanding(data.user.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">CampusOne</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <TabsContent value="signup" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    required={mode === "signup"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "signup" ? 8 : 6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {mode === "signup" && (
                  <div className="space-y-2 pt-1">
                    {pwStrength && (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              pwStrength.tone,
                              pwStrength.width,
                            )}
                          />
                        </div>
                        <div className={cn("text-xs font-medium", pwStrength.text)}>
                          {pwStrength.label} password
                        </div>
                      </div>
                    )}
                    <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <ReqItem ok={pwChecks.length} label="At least 8 characters" />
                      <ReqItem ok={pwChecks.upper} label="One uppercase letter" />
                      <ReqItem ok={pwChecks.lower} label="One lowercase letter" />
                      <ReqItem ok={pwChecks.number} label="One number" />
                      <ReqItem ok={pwChecks.symbol} label="One symbol" />
                    </ul>
                  </div>
                )}
              </div>


              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
              </Button>

              {mode === "signup" && (
                <p className="text-center text-xs text-muted-foreground">
                  New accounts start as <strong>Student</strong>. An admin can
                  assign other roles.
                </p>
              )}
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ReqItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5", ok && "text-emerald-600")}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-muted-foreground/60" />}
      <span>{label}</span>
    </li>
  );
}
