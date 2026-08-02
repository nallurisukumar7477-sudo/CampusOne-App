import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, Coffee, UtensilsCrossed, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DAYS, isCurrentSlot, isoDay, slotRange } from "@/lib/timetable";
import { useStudentTimetable } from "@/lib/student-timetable";
import {
  ClassDetailsDialog,
  type ClassDetails,
} from "@/components/class-details-dialog";

export const Route = createFileRoute("/_authenticated/timetable")({
  component: TimetablePage,
  head: () => ({
    meta: [
      { title: "Timetable \u00b7 CampusOne" },
      {
        name: "description",
        content: "Your weekly class timetable with periods, subjects and mentors.",
      },
      { property: "og:title", content: "Timetable \u00b7 CampusOne" },
      {
        property: "og:description",
        content: "Weekly Monday\u2013Saturday class schedule for CampusOne students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function TimetablePage() {
  const { profile, slots, cells, isSample, isLoading: loading } = useStudentTimetable();
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<ClassDetails | null>(null);
  const [day, setDay] = useState<number>(() => {
    const d = isoDay(new Date());
    return d > 6 ? 1 : d;
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const today = isoDay(now);
  const dayLabel = DAYS.find((d) => d.value === day)?.label ?? "";

  const sectionLabel = profile?.section
    ? `${profile.section.course?.code ?? ""} · Sem ${profile.semester ?? "—"} · Section ${profile.section.name}`
    : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Timetable</h1>
          {isSample && (
            <Badge variant="outline" className="rounded-full text-[10px]">
              Sample schedule
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {sectionLabel
            ? `${sectionLabel} · Monday to Saturday`
            : "Your weekly class schedule, Monday to Saturday."}
        </p>
      </div>

      {/* Day selector */}
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-2">
          {DAYS.map((d) => {
            const active = d.value === day;
            const isToday = d.value === today;
            return (
              <button
                key={d.value}
                onClick={() => setDay(d.value)}
                className={cn(
                  "flex min-w-[76px] flex-col items-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-transparent bg-foreground text-background shadow-[var(--shadow-elegant)]"
                    : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{d.short}</span>
                <span
                  className={cn(
                    "mt-1 text-[10px] font-medium uppercase tracking-wide",
                    isToday
                      ? active
                        ? "text-background/80"
                        : "text-primary"
                      : "opacity-0",
                  )}
                >
                  Today
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {slots.map((slot) => {
            const cell = cells.get(`${day}:${slot.id}`);
            const live = day === today && isCurrentSlot(slot, now);
            if (slot.kind !== "class") {
              const Icon = slot.kind === "lunch" ? UtensilsCrossed : Coffee;
              return (
                <li
                  key={slot.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-dashed p-4",
                    live
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/40",
                  )}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background/70 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{slot.label}</div>
                    <div className="text-xs text-muted-foreground">{slotRange(slot)}</div>
                  </div>
                  {live && (
                    <Badge className="ml-auto rounded-full text-[10px]">Now</Badge>
                  )}
                </li>
              );
            }
            return (
              <li key={slot.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelected({
                      subject: cell?.subject?.name ?? "Free period",
                      code: cell?.subject?.code ?? null,
                      faculty: cell?.faculty ?? null,
                      day: dayLabel,
                      time: slotRange(slot),
                      period: slot.period_no,
                      room: cell?.room ?? null,
                    })
                  }
                  className={cn(
                    "w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    live
                      ? "border-primary ring-2 ring-primary/25 shadow-[var(--shadow-elegant)]"
                      : "border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold",
                        live
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {slot.period_no}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {cell?.subject?.name ?? "Free period"}
                        </span>
                        {cell?.subject?.code && (
                          <Badge variant="secondary" className="rounded-full text-[10px]">
                            {cell.subject.code}
                          </Badge>
                        )}
                        {live && <Badge className="rounded-full text-[10px]">Now</Badge>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> {slotRange(slot)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3 w-3" /> {cell?.faculty ?? "Mentor TBA"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3 w-3" /> {slot.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {isSample && !loading && slots.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          This is a sample schedule. It will update automatically once your faculty
          publishes the official timetable.
        </p>
      )}

      <ClassDetailsDialog
        details={selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}


function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">
        No periods configured yet.
      </p>
    </div>
  );
}
