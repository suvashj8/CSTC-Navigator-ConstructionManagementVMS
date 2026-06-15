import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead, markNotificationsReadBulk, unreadCount } from "@/api/notifications";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["notifications"], queryFn: listNotifications });

  const readMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readAllMut = useMutation({
    mutationFn: () => markNotificationsReadBulk([]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = unreadCount(data);

  return (
    <PageShell
      title="Notifications"
      description="In-app alerts for allocations, insurance, and license expiry."
      actions={
        unread > 0 ? (
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={readAllMut.isPending}
            onClick={() => readAllMut.mutate()}
          >
            {readAllMut.isPending ? "Marking…" : "Mark all read"}
          </Button>
        ) : undefined
      }
    >
      <Card>
        <CardContent className="divide-y p-0">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          {!isLoading && data.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No notifications.</p>
          )}
          {data.map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between",
                !n.read && "bg-accent/20"
              )}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.read && <Badge>New</Badge>}
                  <Badge variant="outline" className="capitalize">
                    {n.channel.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(n.sent_at).toLocaleString()}</p>
              </div>
              {!n.read && (
                <Button
                  variant="outline"
                  className="w-full shrink-0 sm:w-auto"
                  disabled={readMut.isPending}
                  onClick={() => readMut.mutate(n.id)}
                >
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
