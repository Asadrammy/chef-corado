"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BellIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${session?.user?.id}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}?action=mark-read`, {
        method: 'PATCH',
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const notificationTypeLabel: Record<string, string> = {
    PROPOSAL_RECEIVED: "Requests",
    PROPOSAL_ACCEPTED: "Bookings",
    BOOKING_CREATED: "Bookings",
    PAYMENT_SUCCESS: "Payments",
    MESSAGE: "Messages",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl border border-border/60 bg-background/80 shadow-sm transition-all duration-200 hover:border-border hover:bg-muted/70 hover:shadow-md hover:-translate-y-0.5 relative"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 rounded-2xl border-border/60 bg-popover/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Latest updates across your bookings and messages.</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-6 text-center text-muted-foreground text-sm">
              Loading your updates...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-muted-foreground text-sm">
              All clear. New alerts will appear here.
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  notification.isRead ? "opacity-80" : "bg-primary/5"
                }`}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-2 w-full">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {notificationTypeLabel[notification.type] ?? "Update"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
