import { Clock, DoorOpen, User, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export interface ClassDetails {
  subject: string;
  code?: string | null;
  faculty: string | null;
  day: string;
  time: string;
  period?: number | null;
  room?: string | null;
}

/**
 * Minimal read-only class details panel. Intentionally shows only the class
 * context — never faculty contact info, rosters, marks or attendance.
 */
export function ClassDetailsDialog({
  details,
  onOpenChange,
}: {
  details: ClassDetails | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!details} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-left text-lg font-bold">
            {details?.subject ?? "Class"}
            {details?.code && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {details.code}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-left">
            {details?.period ? `Period ${details.period}` : "Class details"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Row icon={User} label="Faculty" value={details?.faculty ?? "Mentor TBA"} />
          <Row icon={CalendarDays} label="Day" value={details?.day ?? "—"} />
          <Row icon={Clock} label="Time" value={details?.time ?? "—"} />
          {details?.room && <Row icon={DoorOpen} label="Room" value={details.room} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/50 p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
