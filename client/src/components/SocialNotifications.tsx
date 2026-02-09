import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, UserPlus, MessageCircle, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useParentAuth } from "@/contexts/ParentAuthContext";

interface SocialNotification {
  id: string;
  parentId: string;
  type: string;
  actorId: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    picture: string | null;
  };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Hadda";
  if (diffMins < 60) return `${diffMins} daqiiqo kahor`;
  if (diffHours < 24) return `${diffHours} saac kahor`;
  if (diffDays < 7) return `${diffDays} maalin kahor`;
  return date.toLocaleDateString("so-SO", { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SocialNotifications() {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<SocialNotification[]>({
    queryKey: ["/api/social-notifications"],
    queryFn: async () => {
      const res = await fetch("/api/social-notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!parent,
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/social-notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/social-notifications/unread-count", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!parent,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/social-notifications/mark-read", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-notifications/unread-count"] });
    },
  });

  if (!parent) return null;

  const unreadNotifications = notifications.filter(n => !n.isRead);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_follower":
        return <UserPlus className="w-4 h-4 text-indigo-400" />;
      case "new_message":
        return <MessageCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getNotificationText = (notification: SocialNotification) => {
    switch (notification.type) {
      case "new_follower":
        return `${notification.actor.name} wuu ku follow-gareeye`;
      case "new_message":
        return `${notification.actor.name} fariin ayuu kuu soo diray`;
      default:
        return "Wax cusub";
    }
  };

  const getNotificationLink = (notification: SocialNotification) => {
    switch (notification.type) {
      case "new_follower":
        return `/parent/${notification.actor.id}`;
      case "new_message":
        return `/messages/${notification.actor.id}`;
      default:
        return "#";
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">Faallooyinka Bulsho</h3>
            {unreadCount && unreadCount.count > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount.count}
              </span>
            )}
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAsReadMutation.mutate()}
              disabled={markAsReadMutation.isPending}
              className="text-indigo-400 hover:text-indigo-300 h-8"
            >
              {markAsReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Dhamaan Akhri
                </>
              )}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            Wali faallo ma jirto
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifications.slice(0, 5).map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Link href={getNotificationLink(notification)}>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        !notification.isRead
                          ? "bg-indigo-500/10 hover:bg-indigo-500/20"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                      data-testid={`social-notification-${notification.id}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(notification.actor.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.isRead ? "text-white font-medium" : "text-slate-300"}`}>
                          {getNotificationText(notification)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {getNotificationIcon(notification.type)}
                          <span className="text-xs text-slate-500">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {notifications.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
                    Arag dhammaan ({notifications.length})
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SocialNotificationsBadge() {
  const { parent } = useParentAuth();

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/social-notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/social-notifications/unread-count", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!parent,
    refetchInterval: 30000,
  });

  if (!unreadCount || unreadCount.count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
      {unreadCount.count > 9 ? "9+" : unreadCount.count}
    </span>
  );
}
