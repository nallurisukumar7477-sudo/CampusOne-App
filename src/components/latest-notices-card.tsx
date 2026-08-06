import { Link } from "@tanstack/react-router";
import { Megaphone, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIORITY_CLASS, formatNoticeDate, useNoticeReads, useNotices } from "@/lib/notices";
import { cn } from "@/lib/utils";

export function LatestNoticesCard() {
  const { data: notices = [], isLoading } = useNotices();
  const { data: readSet } = useNoticeReads();
  const latest = notices.slice(0, 5);

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 shadow-[var(--shadow-elegant)] backdrop-blur-xl transition hover:shadow-lg">
      <div className="flex items-start gap-3 p-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Megaphone className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">Latest notices</div>
          <div className="truncate text-xs text-muted-foreground">From your department & faculty</div>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-7 rounded-full text-xs">
          <Link to="/notices">
            View all
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
            No notices yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {latest.map((n) => {
              const unread = readSet ? !readSet.has(n.id) : false;
              return (
                <li key={n.id}>
                  <Link
                    to="/notices"
                    className={cn(
                      "block rounded-2xl border border-border/60 bg-background/50 p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-sm",
                      unread && "ring-1 ring-primary/25",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          "shrink-0 rounded-full border-0 text-[10px] capitalize",
                          PRIORITY_CLASS[n.priority],
                        )}
                      >
                        {n.priority}
                      </Badge>
                      <div className="truncate text-sm font-semibold">{n.title}</div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
                    <div className="mt-1.5 truncate text-[11px] text-muted-foreground">
                      {n.created_by_name || "Faculty"} · {formatNoticeDate(n.published_at)}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
