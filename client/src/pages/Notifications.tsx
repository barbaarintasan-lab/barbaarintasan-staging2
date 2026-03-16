import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bell, ChevronLeft, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ParentNotification {
  id: string;
  parentId: string;
  title: string;
  body: string;
  type: string;
  payload: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedNotification, setSelectedNotification] = useState<ParentNotification | null>(null);

  const { data: notifications = [], isLoading } = useQuery<ParentNotification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/parent/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/parent/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/parent/notifications/read-all", {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
      toast.success("Dhammaan fariimaha waa la akhriday");
    },
    onError: () => {
      toast.error("Wax khalad ah ayaa dhacay");
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/parent/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete notification");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
      toast.success("Fariinta waa la tirtiray");
    },
    onError: () => {
      toast.error("Wax khalad ah ayaa dhacay");
    },
  });

  const handleNotificationClick = (notification: ParentNotification) => {
    if (!notification.readAt) {
      markAsRead.mutate(notification.id);
    }
    
    let hasUrl = false;
    if (notification.payload) {
      try {
        const payload = JSON.parse(notification.payload);
        if (payload.url) {
          hasUrl = true;
          setLocation(payload.url);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // If no URL, show the notification in a popup dialog
    if (!hasUrl) {
      setSelectedNotification(notification);
    }
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder":
        return <Bell className="w-5 h-5 text-blue-500" />;
      case "announcement":
        return <Bell className="w-5 h-5 text-orange-500" />;
      case "campaign":
        return <Bell className="w-5 h-5 text-purple-500" />;
      case "streak":
        return <Bell className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "reminder":
        return "Xusuusin";
      case "announcement":
        return "Ogeysiis";
      case "campaign":
        return "Olole";
      case "streak":
        return "Streak";
      case "tip":
        return "Talo";
      default:
        return "Fariiin";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white font-body pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-orange-50" data-testid="button-back">
                <ChevronLeft className="w-5 h-5 text-orange-600" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold text-gray-900 font-display">Fariimaha</h1>
              {unreadCount > 0 && (
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Dhamaan Akhri
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-8 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Wali fariiin ma jirto</h3>
              <p className="text-gray-500 mb-6">
                Marka fariimo cusub kuu yimaadaan, halkan ayaad ka arki doontaa.
              </p>
              <Link href="/">
                <Button className="bg-orange-500 hover:bg-orange-600" data-testid="button-go-home">
                  Bogga Guriga
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              {notifications.length} fariimo, {unreadCount} lama akhriyin
            </p>
            
            {notifications.map((notification) => {
              const hasLink = notification.payload && JSON.parse(notification.payload)?.url;
              
              return (
                <Card 
                  key={notification.id} 
                  className={`overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                    !notification.readAt ? 'bg-orange-50 border-orange-200' : 'bg-white'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-card-${notification.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                            {getTypeLabel(notification.type)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {!notification.readAt && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></span>
                          )}
                        </div>
                        <h3 className={`font-bold text-gray-900 mb-1 ${!notification.readAt ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.body}
                        </p>
                        {hasLink && (
                          <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Guji si aad u aragtid
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {!notification.readAt && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full p-2 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead.mutate(notification.id);
                            }}
                            disabled={markAsRead.isPending}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-2 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                          disabled={deleteNotification.isPending}
                          data-testid={`button-delete-notification-${notification.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Notification Detail Popup */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          {selectedNotification && (
            <div className="bg-gradient-to-b from-orange-50 to-white">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-white" />
                </div>
                <span className="inline-block text-xs font-medium text-white/90 bg-white/20 px-3 py-1 rounded-full mb-2">
                  {getTypeLabel(selectedNotification.type)}
                </span>
                <h2 className="text-xl font-bold text-white">
                  {selectedNotification.title}
                </h2>
              </div>
              
              {/* Body */}
              <div className="p-5">
                <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.body}
                </p>
                <p className="text-xs text-gray-400 mt-4 text-center">
                  {formatDistanceToNow(new Date(selectedNotification.createdAt), { addSuffix: true })}
                </p>
              </div>
              
              {/* Footer Button */}
              <div className="p-4 pt-0">
                <Button 
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl shadow-lg"
                  onClick={() => setSelectedNotification(null)}
                  data-testid="button-understand-notification"
                >
                  Waan Fahmay
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
