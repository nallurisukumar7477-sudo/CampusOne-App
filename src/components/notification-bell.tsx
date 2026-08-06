import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  PRIORITY_CLASS,
  formatNoticeDate,
  useMarkNoticeRead,
  useNoticeNotifications,
} from "@/lib/notices";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { isStudent, notices, unreadCount, isRead } = useNoticeNotifications();
  const markRead = useMarkNoticeRead();

  if (!isStudent) {
    return (
      <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  const recent = notices.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-[var(--shadow-elegant)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="text-sm font-bold">Notifications</div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-full text-xs"
              onClick={() => {
                notices
                  .filter((n) => !isRead(n.id))
                  .forEach((n) => markRead.mutate(n.id));
              }}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="p-1">
              {recent.map((n) => {
                const unread = !isRead(n.id);
                return (
                  <li key={n.id}>
                    <Link
                      to="/notices"
                      onClick={() => unread && markRead.mutate(n.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-accent/60",
                        unread && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          unread ? "bg-primary" : "bg-transparent",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "shrink-0 rounded-full border-0 text-[10px] capitalize",
                              PRIORITY_CLASS[n.priority],
                            )}
                          >
                            {n.priority}
                          </Badge>
                          <span className="truncate text-sm font-semibold">{n.title}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {n.created_by_name || "Faculty"} · {formatNoticeDate(n.published_at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        <div className="border-t border-border/60 p-2">
          <Button asChild variant="ghost" size="sm" className="w-full rounded-xl text-xs">
            <Link to="/notices">View all notices</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
