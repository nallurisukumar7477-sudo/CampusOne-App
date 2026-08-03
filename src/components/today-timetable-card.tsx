import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coffee,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DAYS, isCurrentSlot, isoDay, slotRange, toMinutes } from "@/lib/timetable";
import { useStudentTimetable } from "@/lib/student-timetable";
import { ClassDetailsDialog, type ClassDetails } from "@/components/class-details-dialog";

export function TodayTimetableCard() {
  const { slots, cells, isPublished, isLoading } = useStudentTimetable();
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
    <div className="rounded-3xl border border-border/60 bg-card/70 shadow-[var(--shadow-elegant)] backdrop-blur-xl transition hover:shadow-lg">
      <div className="flex items-start gap-3 p-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <CalendarDays className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">Today's timetable</div>
          <div className="truncate text-xs text-muted-foreground">
            {dayLabel}
            {isPublished ? "" : " · awaiting published timetable"}
          </div>
        </div>
        <Badge variant="outline" className="rounded-full text-[10px]">
          {classSlots.length} periods
        </Badge>
      </div>

      <div className="space-y-3 px-4 pb-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))
        ) : isSunday ? (
          <EmptyNote text="No classes today — enjoy your Sunday." />
        ) : slots.length === 0 ? (
          <EmptyNote text="No periods configured yet." />
        ) : (
          <>
            {allDone && (
              <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Today's classes are completed.
              </div>
            )}
            {slots.map((slot) => {
              const live = isCurrentSlot(slot, now);
              if (slot.kind !== "class") {
                const Icon = slot.kind === "lunch" ? UtensilsCrossed : Coffee;
                return (
                  <div
                    key={slot.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-dashed p-3 transition",
                      live ? "border-primary bg-primary/5" : "border-border bg-muted/40",
                    )}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/70 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{slot.label}</div>
                      <div className="text-xs text-muted-foreground">{slotRange(slot)}</div>
                    </div>
                    {live && (
                      <Badge className="ml-auto rounded-full text-[10px]">
                        {slot.kind === "lunch" ? "Lunch Break" : "Break Time"}
                      </Badge>
                    )}
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
                      faculty: cell?.faculty ?? null,
                      day: dayLabel,
                      time: slotRange(slot),
                      period: slot.period_no,
                      room: cell?.room ?? null,
                    })
                  }
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border bg-background/50 p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md",
                    live
                      ? "border-primary ring-2 ring-primary/25"
                      : isNext
                        ? "border-primary/40"
                        : "border-border/60",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold",
                      live ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {slot.period_no}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {cell?.subject?.name ?? "Free period"}
                      </span>
                      {live && (
                        <Badge className="rounded-full text-[10px]">Current Class</Badge>
                      )}
                      {!live && isNext && (
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          Next Class
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {slotRange(slot)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {cell?.faculty ?? "Mentor TBA"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}

        <Button asChild variant="outline" className="w-full rounded-full">
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
