import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Megaphone,
  MessagesSquare,
  Plus,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · CampusOne" },
      { name: "description", content: "Your CampusOne student dashboard — attendance, classes, assignments, marks and more." },
      { property: "og:title", content: "CampusOne Student Dashboard" },
      { property: "og:description", content: "Attendance, classes, assignments, marks, notices and events, all in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, department:departments(name, code)")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6 pb-10">
      <HeroBanner
        name={firstName}
        department={
          profile?.department
            ? `${profile.department.name} · ${profile.department.code}`
            : "Department not assigned"
        }
      />

      <QuickActions />

      <section className="grid gap-4 lg:grid-cols-3">
        <AttendanceCard />
        <MarksCard />
        <TodayClassesCard />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <AssignmentsCard />
          <NoticesCard />
          <EventsCard />
          <TimetableCard />
        </div>
        <AiAssistantCard />
      </section>
    </div>
  );
}

/* ---------- Hero ---------- */

function HeroBanner({ name, department }: { name: string; department: string }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border/60 p-6 shadow-[var(--shadow-elegant)] sm:p-8"
      style={{ background: "var(--gradient-primary)" }}
    >
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ background: "var(--gradient-mesh)" }} />
      <div className="relative flex flex-col gap-6 text-primary-foreground sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.18em] opacity-80">
            {today}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Good to see you, {name}.
          </h1>
          <p className="mt-2 max-w-xl text-sm opacity-85 sm:text-base">
            {department}. You have 3 classes, 2 assignments due this week, and a placement talk on Friday.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HeroStat icon={CheckCircle2} label="Attendance" value="86%" />
          <HeroStat icon={TrendingUp} label="CGPA" value="8.4" />
          <HeroStat icon={ClipboardList} label="Pending" value="2" />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-background/15 px-3 py-2 backdrop-blur-md ring-1 ring-white/20">
      <Icon className="h-4 w-4 opacity-80" />
      <div className="leading-tight">
        <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}

/* ---------- Quick actions ---------- */

const QUICK_ACTIONS: { label: string; icon: LucideIcon }[] = [
  { label: "Mark attendance", icon: CheckCircle2 },
  { label: "Submit assignment", icon: UploadCloud },
  { label: "Ask AI tutor", icon: Sparkles },
  { label: "View timetable", icon: Calendar },
  { label: "Message faculty", icon: MessagesSquare },
];

function QuickActions() {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </div>
        {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="rounded-full border-border/70 bg-background/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {label}
          </Button>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Attendance ---------- */

const attendanceTrend = [
  { w: "W1", v: 78 },
  { w: "W2", v: 82 },
  { w: "W3", v: 80 },
  { w: "W4", v: 85 },
  { w: "W5", v: 88 },
  { w: "W6", v: 86 },
  { w: "W7", v: 90 },
];

function AttendanceCard() {
  const pct = 86;
  const dash = 2 * Math.PI * 42;
  return (
    <Card>
      <CardHeader
        icon={CheckCircle2}
        title="Attendance"
        subtitle="This semester · target 85%"
        action={<Badge variant="secondary" className="rounded-full">On track</Badge>}
      />
      <div className="grid grid-cols-[auto_1fr] items-center gap-4 p-5 pt-0">
        <div className="relative grid h-28 w-28 place-items-center">
          <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
            <circle cx="50" cy="50" r="42" stroke="var(--color-muted)" strokeWidth="10" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="var(--color-primary)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={dash * (1 - pct / 100)}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center leading-none">
              <div className="text-2xl font-black tracking-tight">{pct}%</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Present
              </div>
            </div>
          </div>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrend}>
              <defs>
                <linearGradient id="att" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#att)"
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border)" }}
                contentStyle={tooltipStyle}
                labelFormatter={(l) => `Week ${String(l).replace("W", "")}`}
                formatter={(v: number) => [`${v}%`, "Attendance"]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Marks ---------- */

const marksData = [
  { s: "DSA", v: 82 },
  { s: "DBMS", v: 76 },
  { s: "OS", v: 88 },
  { s: "CN", v: 71 },
  { s: "AI", v: 91 },
];

function MarksCard() {
  return (
    <Card>
      <CardHeader
        icon={GraduationCap}
        title="Internal marks"
        subtitle="Mid-sem average · 82/100"
        action={<Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">+4 vs last</Badge>}
      />
      <div className="h-44 p-4 pt-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={marksData} barCategoryGap={18}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="s" tickLine={false} axisLine={false} className="text-xs" stroke="var(--color-muted-foreground)" />
            <YAxis hide domain={[0, 100]} />
            <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={tooltipStyle} formatter={(v: number) => [`${v}/100`, "Marks"]} />
            <Bar dataKey="v" radius={[8, 8, 4, 4]} fill="var(--color-primary)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ---------- Today's classes ---------- */

const todayClasses = [
  { time: "09:00", subject: "Data Structures", room: "CSE-204", faculty: "Dr. Menon", status: "now" as const },
  { time: "11:00", subject: "Database Systems", room: "CSE-107", faculty: "Prof. Rao", status: "next" as const },
  { time: "14:00", subject: "Operating Systems", room: "Lab-3", faculty: "Dr. Iyer", status: "later" as const },
  { time: "16:00", subject: "AI Fundamentals", room: "CSE-301", faculty: "Dr. Kapoor", status: "later" as const },
];

function TodayClassesCard() {
  return (
    <Card>
      <CardHeader
        icon={Clock}
        title="Today's classes"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: "long" })}
        action={
          <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs">
            Full day
          </Button>
        }
      />
      <ul className="divide-y divide-border/60 px-2 pb-2">
        {todayClasses.map((c) => (
          <li key={c.time} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-accent/60">
            <div className="w-12 shrink-0 text-right">
              <div className="text-sm font-bold tabular-nums">{c.time}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">IST</div>
            </div>
            <div
              className={cn(
                "h-10 w-1 shrink-0 rounded-full",
                c.status === "now" && "bg-primary",
                c.status === "next" && "bg-primary/50",
                c.status === "later" && "bg-border",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold">{c.subject}</div>
                {c.status === "now" && (
                  <Badge className="h-4 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary hover:bg-primary/20">
                    LIVE
                  </Badge>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {c.faculty} · Room {c.room}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Assignments ---------- */

const assignments = [
  { title: "DBMS: Normalization worksheet", due: "Tomorrow", progress: 60, subject: "DBMS" },
  { title: "OS Lab: Scheduler simulation", due: "3 days", progress: 20, subject: "OS" },
  { title: "AI: Search algorithms report", due: "Next week", progress: 0, subject: "AI" },
];

function AssignmentsCard() {
  return (
    <Card>
      <CardHeader
        icon={ClipboardList}
        title="Upcoming assignments"
        subtitle={`${assignments.length} due soon`}
        action={<Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"><Plus className="h-3.5 w-3.5" /></Button>}
      />
      <ul className="space-y-2 p-4 pt-0">
        {assignments.map((a) => (
          <li key={a.title} className="rounded-2xl border border-border/60 bg-background/50 p-3 transition hover:shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{a.subject} · due {a.due}</div>
              </div>
              <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">{a.progress}%</Badge>
            </div>
            <Progress value={a.progress} className="mt-2 h-1.5" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Notices ---------- */

const notices = [
  { title: "Mid-sem exam schedule released", time: "2h ago", tag: "Exams" },
  { title: "Guest lecture: Startup building", time: "Yesterday", tag: "Events" },
  { title: "Library timings extended for exams", time: "2 days ago", tag: "Library" },
];

function NoticesCard() {
  return (
    <Card>
      <CardHeader icon={Megaphone} title="Recent notices" subtitle="From your department" />
      <ul className="space-y-1 p-2 pt-0">
        {notices.map((n) => (
          <li key={n.title} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-accent/60">
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{n.title}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{n.time}</span>
                <span>·</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  {n.tag}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Events ---------- */

const events = [
  { d: "26", m: "Jul", title: "Placement talk · Accenture", meta: "Auditorium · 4:00 PM" },
  { d: "29", m: "Jul", title: "Hackathon kickoff", meta: "Innovation Lab · 10:00 AM" },
  { d: "02", m: "Aug", title: "Sports meet registration", meta: "Portal · Deadline" },
];

function EventsCard() {
  return (
    <Card>
      <CardHeader icon={Calendar} title="Upcoming events" subtitle="Campus & department" />
      <ul className="space-y-2 p-4 pt-0">
        {events.map((e) => (
          <li key={e.title} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/50 p-2.5 transition hover:shadow-sm">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
              <div className="text-center leading-none">
                <div className="text-sm font-black">{e.d}</div>
                <div className="text-[9px] font-semibold uppercase tracking-wider">{e.m}</div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{e.title}</div>
              <div className="truncate text-xs text-muted-foreground">{e.meta}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Timetable ---------- */

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const slots = ["9", "11", "1", "3"] as const;
const grid: Record<string, string> = {
  "Mon-9": "DSA", "Mon-11": "DBMS", "Mon-1": "OS", "Mon-3": "AI",
  "Tue-9": "CN", "Tue-11": "DSA", "Tue-1": "Lab", "Tue-3": "AI",
  "Wed-9": "OS", "Wed-11": "AI", "Wed-1": "DBMS", "Wed-3": "DSA",
  "Thu-9": "DBMS", "Thu-11": "CN", "Thu-1": "AI", "Thu-3": "Lab",
  "Fri-9": "AI", "Fri-11": "OS", "Fri-1": "DSA", "Fri-3": "CN",
};
const subjectHue: Record<string, string> = {
  DSA: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  DBMS: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  OS: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  CN: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  AI: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  Lab: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

function TimetableCard() {
  return (
    <Card className="sm:col-span-2">
      <CardHeader
        icon={FileText}
        title="Timetable preview"
        subtitle="This week"
        action={<Button variant="ghost" size="sm" className="h-7 rounded-full text-xs">Open full</Button>}
      />
      <div className="p-4 pt-0">
        <div className="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] gap-1.5 text-[11px]">
          <div />
          {slots.map((s) => (
            <div key={s} className="pb-1 text-center font-semibold text-muted-foreground">
              {s}:00
            </div>
          ))}
          {days.map((d) => (
            <Fragment key={d}>
              <div className="grid place-items-center text-xs font-semibold text-muted-foreground">
                {d}
              </div>
              {slots.map((s) => {
                const sub = grid[`${d}-${s}`];
                return (
                  <div
                    key={`${d}-${s}`}
                    className={cn(
                      "grid h-9 place-items-center rounded-lg text-[11px] font-semibold",
                      subjectHue[sub] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {sub}
                  </div>
                );
              })}
            </Fragment>

          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------- AI assistant ---------- */

function AiAssistantCard() {
  return (
    <Card className="overflow-hidden">
      <div
        className="relative border-b border-border/60 p-5"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ background: "var(--gradient-mesh)" }} />
        <div className="relative flex items-start gap-3 text-primary-foreground">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
              AI Study Assistant
            </div>
            <div className="mt-0.5 text-lg font-bold leading-tight">
              Ready to help you prep for DBMS mid-sem
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {[
          { icon: BookOpen, label: "Summarize today's DBMS lecture" },
          { icon: Users, label: "Practice viva questions" },
          { icon: ClipboardList, label: "Plan a 3-day revision" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/50 p-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="text-xs text-muted-foreground">›</span>
          </button>
        ))}
        <Button className="mt-2 w-full rounded-full" size="sm">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Ask something new
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Shared primitives ---------- */

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-card/70 shadow-[var(--shadow-elegant)] backdrop-blur-xl transition hover:shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  padding: "6px 10px",
  boxShadow: "var(--shadow-elegant)",
  color: "var(--color-popover-foreground)",
};
