import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Coffee,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DAYS, isCurrentSlot, isoDay, slotRange, toMinutes, fmtTime } from "@/lib/timetable";
import { useStudentTimetable } from "@/lib/student-timetable";
import { ClassDetailsDialog, type ClassDetails } from "@/components/class-details-dialog";

/**
 * Shared "Today's timetable" strip — used by both the student and faculty
 * dashboards. Reads from the single published-timetable source
 * (`useStudentTimetable`) so there is never a duplicate timetable source.
 */
export function TodayTimetableStrip() {
  const { slots, cells, isPublished, isLoading, profile } = useStudentTimetable();
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState<ClassDetails | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const today = isoDay(now);
  const isSunday = today === 7;
  const dayLabel =
    DAYS.find((d) => d.value === today)?.label ??
    now.toLocaleDateString(undefined, { weekday: "long" });

  const courseCode = profile?.section?.course?.code ?? null;
  const minutes = now.getHours() * 60 + now.getMinutes();

  const nextClassSlotId = useMemo(() => {
    const upcoming = slots
      .filter((s) => s.kind === "class" && toMinutes(s.start_time) > minutes)
      .sort((a, b) => a.position - b.position);
    return upcoming[0]?.id ?? null;
  }, [slots, minutes]);

  const classSlots = slots.filter((s) => s.kind === "class");
  const lastClassEnd = classSlots.length
    ? Math.max(...classSlots.map((s) => toMinutes(s.end_time)))
    : 0;
  const allDone = !isSunday && classSlots.length > 0 && minutes >= lastClassEnd;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-5 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">Today's timetable</div>
            <div className="truncate text-xs text-muted-foreground">
              {dayLabel}
              {courseCode ? ` · ${courseCode}` : ""}
              {isPublished ? "" : " · awaiting published timetable"}
            </div>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
          {classSlots.length} periods
        </Badge>
      </div>

      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-44 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : isSunday ? (
          <EmptyNote text="No classes today — enjoy your Sunday." />
        ) : slots.length === 0 ? (
          <EmptyNote text="No periods configured yet." />
        ) : (
          <>
            {allDone && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Today's classes are completed.
              </div>
            )}
            <div className="-mx-5 overflow-x-auto px-5 pb-1">
              <div className="flex min-w-max gap-3">
                {slots.map((slot) => {
                  const live = isCurrentSlot(slot, now);

                  if (slot.kind !== "class") {
                    const Icon = slot.kind === "lunch" ? UtensilsCrossed : Coffee;
                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          "flex w-32 shrink-0 flex-col justify-between rounded-2xl border border-dashed p-3 text-center",
                          live ? "border-primary bg-primary/5" : "border-border bg-muted/40",
                        )}
                      >
                        <div className="text-[11px] font-semibold text-muted-foreground">
                          {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                        </div>
                        <Icon className="mx-auto my-2 h-5 w-5 text-muted-foreground" />
                        <div className="truncate text-xs font-semibold">{slot.label}</div>
                      </div>
                    );
                  }

                  const cell = cells.get(`${today}:${slot.id}`);
                  const isNext = slot.id === nextClassSlotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() =>
                        setSelected({
                          subject: cell?.subject?.name ?? "Free period",
                          code: cell?.subject?.code ?? null,
                          course: courseCode,
                          faculty: cell?.faculty ?? null,
                          day: dayLabel,
                          time: slotRange(slot),
                          start: fmtTime(slot.start_time),
                          end: fmtTime(slot.end_time),
                          period: slot.period_no,
                          room: cell?.room ?? null,
                        })
                      }
                      className={cn(
                        "flex w-44 shrink-0 flex-col gap-2 rounded-2xl border bg-background/60 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        live
                          ? "border-primary ring-2 ring-primary/25"
                          : isNext
                            ? "border-primary/40"
                            : "border-border/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}
                        </span>
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold",
                            live
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {slot.period_no}
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="w-fit max-w-full rounded-full text-[10px]"
                      >
                        <span className="truncate">{courseCode ?? "Course TBA"}</span>
                      </Badge>
                      <div className="truncate text-sm font-semibold">
                        {cell?.subject?.name ?? "Free period"}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {cell?.faculty ?? "Mentor TBA"}
                      </div>
                      {live && (
                        <Badge className="w-fit rounded-full text-[10px]">Now</Badge>
                      )}
                      {!live && isNext && (
                        <Badge variant="outline" className="w-fit rounded-full text-[10px]">
                          Next
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <Button asChild variant="outline" className="mt-4 w-full rounded-full">
          <Link to="/timetable">
            View full weekly timetable
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <ClassDetailsDialog details={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
