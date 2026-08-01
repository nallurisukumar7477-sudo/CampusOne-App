// Shared timetable helpers. Slot definitions live in the database
// (public.timetable_slots); these are only formatting + sample helpers.

export interface Slot {
  id: string;
  position: number;
  label: string;
  kind: string; // 'class' | 'break' | 'lunch'
  period_no: number | null;
  start_time: string; // 'HH:MM:SS'
  end_time: string;
}

export const DAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
] as const;

export function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${suffix}`;
}

export function slotRange(s: Slot): string {
  return `${formatTime(s.start_time)} – ${formatTime(s.end_time)}`;
}

/** Minutes since midnight for a 'HH:MM:SS' time string. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** ISO day of week 1..7 (Mon..Sun) for a Date. */
export function isoDay(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

export function isCurrentSlot(s: Slot, now: Date): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= toMinutes(s.start_time) && mins < toMinutes(s.end_time);
}

/**
 * Deterministically distributes subjects across the week's teaching periods.
 * Used to pre-fill a new timetable (faculty side) and as a read-only preview
 * when a section has no published timetable yet.
 */
export function buildSampleGrid(
  slots: Slot[],
  subjectIds: string[],
): Record<string, string> {
  const grid: Record<string, string> = {};
  if (subjectIds.length === 0) return grid;
  const teaching = slots
    .filter((s) => s.kind === "class")
    .sort((a, b) => a.position - b.position);
  let i = 0;
  for (const day of DAYS) {
    // offset each day so subjects rotate naturally instead of repeating
    i = (day.value - 1) * 2;
    for (const slot of teaching) {
      grid[`${day.value}:${slot.id}`] = subjectIds[i % subjectIds.length];
      i += 1;
    }
  }
  return grid;
}
