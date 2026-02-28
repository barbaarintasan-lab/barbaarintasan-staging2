import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { 
  ArrowLeft,
  Plus,
  Loader2,
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  X,
  MoreVertical,
  Trash2,
  Globe,
  Users,
  Lock,
  ChevronLeft,
  ChevronRight,
  Send,
  Pencil,
  UserPlus,
  UserMinus,
  MessageSquare,
  Minimize2,
  GraduationCap,
  Clock,
  Star,
  BookOpen,
  Ban,
  Flag,
  Shield,
  Settings,
  Mic,
  Square,
  Headphones
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ShareButton } from "@/components/engagement";
import { CommunityAudioPlayer } from "@/components/CommunityAudioPlayer";

interface PostImage {
  id: string;
  postId: string;
  imageUrl: string;
  storageKey: string | null;
  altText: string | null;
  displayOrder: number;
}

interface PostAuthor {
  id: string;
  name: string | null;
  picture: string | null;
}

interface ParentPost {
  id: string;
  parentId: string;
  title: string;
  content: string;
  audioUrl: string | null;
  visibility: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string | null;
  author: PostAuthor;
  images: PostImage[];
}

interface Course {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  isLive: boolean;
  isFree: boolean;
  duration: string | null;
  order: number;
  priceOneTime: number | null;
  priceMonthly: number | null;
  priceYearly: number | null;
}

function CourseAdsBanner({ 
  courses, 
  selectedCourseIds, 
  getGoogleDriveImageUrl,
  adMessage
}: { 
  courses: Course[]; 
  selectedCourseIds?: string | null; 
  getGoogleDriveImageUrl: (url: string) => string;
  adMessage?: string | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const selectedIds = selectedCourseIds ? selectedCourseIds.split(',').filter(Boolean) : [];
  const displayCourses = courses.filter(c => selectedIds.includes(c.id));
  
  useEffect(() => {
    if (displayCourses.length <= 2) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 2) % displayCourses.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [displayCourses.length]);

  if (displayCourses.length === 0 && !adMessage) return null;

  const visibleCourses = displayCourses.length <= 2 
    ? displayCourses 
    : [
        displayCourses[currentIndex % displayCourses.length],
        displayCourses[(currentIndex + 1) % displayCourses.length]
      ];

  return (
    <motion.div 
      className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-lg"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="py-3 px-4">
        {adMessage && (
          <div className="overflow-hidden mb-2">
            <motion.p 
              className="text-sm font-bold text-white drop-shadow-sm whitespace-nowrap"
              animate={{ x: ["100%", "-100%"] }}
              transition={{ 
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              {adMessage}
            </motion.p>
          </div>
        )}
        {displayCourses.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <BookOpen className="w-4 h-4 text-white" />
            </motion.div>
            <span className="text-xs font-semibold text-white tracking-wide">✨ Koorsooyinka Cusub</span>
          </div>
        )}
        {displayCourses.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              className="flex gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {visibleCourses.map((course) => (
                <Link 
                  key={course.id}
                  href={`/course/${course.courseId}`}
                  className="flex-1 group"
                >
                  <motion.div 
                    className="flex items-center gap-2 bg-white/95 hover:bg-white rounded-xl p-2.5 shadow-md border-2 border-white/50 hover:border-white transition-all cursor-pointer"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {course.imageUrl && (
                      <img 
                        src={getGoogleDriveImageUrl(course.imageUrl)}
                        alt={course.title}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-sm"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                        {course.title}
                      </p>
                      {course.isFree ? (
                        <span className="text-xs text-emerald-600 font-bold">🎁 Bilaash</span>
                      ) : (
                        <span className="text-xs text-orange-600 font-medium">${course.priceYearly || course.priceOneTime}/sannad</span>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

export default function ParentFeed() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ParentPost | null>(null);
  const [selectedPost, setSelectedPost] = useState<ParentPost | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();

  // Check if user has accepted community terms (App Store compliance)
  const { data: termsStatus, isLoading: termsLoading } = useQuery<{ hasAccepted: boolean }>({
    queryKey: ["/api/community-terms-status"],
    queryFn: async () => {
      const res = await fetch("/api/community-terms-status", { credentials: "include" });
      if (!res.ok) return { hasAccepted: false };
      return res.json();
    },
    enabled: !!parent,
  });

  // Redirect to terms page if not accepted
  useEffect(() => {
    if (!termsLoading && termsStatus && !termsStatus.hasAccepted && parent) {
      setLocation("/parent-community-terms");
    }
  }, [termsStatus, termsLoading, parent, setLocation]);

  const { data: posts, isLoading, error } = useQuery<ParentPost[]>({
    queryKey: ["/api/social-posts"],
    queryFn: async () => {
      const res = await fetch("/api/social-posts?limit=50");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      return data.posts;
    },
    refetchInterval: 30000,
  });

  const { data: communitySettings } = useQuery<Record<string, string | null>>({
    queryKey: ["/api/parent-community-settings"],
    queryFn: async () => {
      const res = await fetch("/api/parent-community-settings");
      if (!res.ok) return {};
      return res.json();
    },
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const bannerImageUrl = communitySettings?.banner_image_url || "/attached_assets/waalidka_1768927285032.png";
  const bannerTitle = communitySettings?.banner_title || "Baraha Waalidiinta";
  const bannerSubtitle = communitySettings?.banner_subtitle || "Bulsho Hagaasan oo Soomaali ah";

  // Block user state and mutation (App Store compliance)
  const [userToBlock, setUserToBlock] = useState<{ id: string; name: string } | null>(null);
  const [postToReport, setPostToReport] = useState<ParentPost | null>(null);
  const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
  
  const blockUserMutation = useMutation({
    mutationFn: async (blockedId: string) => {
      const res = await fetch(`/api/block-user/${blockedId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to block user");
      return res.json();
    },
    onSuccess: () => {
      toast.success("User-ka waa la xiray. Posts-kiisa kuguma muuqan doono.");
      setUserToBlock(null);
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-users"] });
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay xirista user-ka.");
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (blockedId: string) => {
      const res = await fetch(`/api/block-user/${blockedId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unblock user");
      return res.json();
    },
    onSuccess: () => {
      toast.success("User-ka waa la furay.");
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay furista user-ka.");
    },
  });

  const { data: blockedUsers } = useQuery<{ id: string; name: string; picture: string | null }[]>({
    queryKey: ["/api/blocked-users"],
    queryFn: async () => {
      const res = await fetch("/api/blocked-users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!parent,
  });

  // Report post state and mutation (App Store compliance)
  const [reportReason, setReportReason] = useState<string>("");
  const [reportDescription, setReportDescription] = useState("");
  
  const reportPostMutation = useMutation({
    mutationFn: async (data: { postId: string; authorId: string; reason: string; description: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportType: "social_post",
          contentId: data.postId,
          reportedUserId: data.authorId,
          reason: data.reason,
          description: data.description || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to report post");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Warbixintaada waa la diray. Mahadsanid!");
      setPostToReport(null);
      setReportReason("");
      setReportDescription("");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay. Fadlan isku day mar kale.");
    },
  });

  const getGoogleDriveImageUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      const fileId = url.match(/[-\w]{25,}/)?.[0];
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      }
    }
    return url;
  };

  const handleBack = () => {
    setLocation("/");
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-3 h-3 text-muted-foreground" />;
      case "followers":
        return <Users className="w-3 h-3 text-muted-foreground" />;
      case "private":
        return <Lock className="w-3 h-3 text-muted-foreground" />;
      default:
        return <Globe className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "Hadda";
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center overflow-x-hidden">
        <Card className="max-w-md mx-4">
          <CardContent className="py-8 text-center">
            <p className="text-red-500 mb-4">Khalad ayaa dhacay</p>
            <Button onClick={() => window.location.reload()}>Isku day mar kale</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const liveCourses = courses?.filter(c => c.isLive) || [];

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <div className="max-w-7xl mx-auto lg:px-8">
        {/* Top Action Bar - Facebook style */}
        <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="rounded-full hover:bg-gray-100"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-bold text-lg text-gray-800">{bannerTitle}</h1>
            </div>
            <div className="flex items-center gap-1 relative">
              {parent && (
                <Button 
                  size="icon"
                  onClick={() => setIsCreateOpen(true)}
                  className="rounded-full bg-primary hover:bg-primary/90 h-9 w-9"
                  data-testid="button-create-post"
                  title="Geli post cusub"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              )}
              {parent && (
                <div className="relative">
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="rounded-full hover:bg-gray-100 h-9 w-9"
                    data-testid="button-messenger"
                    title="Fariimaha"
                    onClick={() => setIsMessengerOpen(!isMessengerOpen)}
                  >
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </Button>
                  {isMessengerOpen && <MessengerDropdown onClose={() => setIsMessengerOpen(false)} />}
                </div>
              )}
              <Button 
                size="icon"
                variant="ghost"
                className="rounded-full hover:bg-gray-100 h-9 w-9"
                data-testid="button-close"
                title="Xir"
                onClick={handleBack}
              >
                <X className="w-5 h-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky Banner Section - stays on top when scrolling */}
        <div className="sticky top-[52px] z-30 bg-blue-50 px-4 pt-4 pb-2">
          {/* Animated Banner - Light Blue with Animated Black Text */}
          <motion.div 
            className="relative rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-blue-100 via-sky-50 to-blue-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 opacity-30">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </div>
            <div className="relative py-8 px-4">
              <motion.h1 
                className="text-2xl sm:text-3xl font-bold text-gray-900 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                {bannerTitle}
              </motion.h1>
              <motion.p
                className="text-sm text-gray-700 text-center mt-2 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {bannerSubtitle}
              </motion.p>
              <motion.div
                className="mt-4 text-center"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.p
                  className="text-lg sm:text-xl font-bold text-gray-900"
                  animate={{ 
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  ✨ Ku soo biir bulshada waalidiinta Soomaaliyeed ✨
                </motion.p>
              </motion.div>
            </div>
          </motion.div>

          {/* Animated Course Ads Banner */}
          <div className="mt-2">
            <CourseAdsBanner courses={liveCourses} selectedCourseIds={communitySettings?.course_ads_ids} getGoogleDriveImageUrl={getGoogleDriveImageUrl} adMessage={communitySettings?.ad_message} />
          </div>
        </div>

        {/* Posts Section - scrolls under banner */}
        <div className="px-4 pb-4">

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                currentParentId={parent?.id}
                onSelect={() => {
                  setSelectedPost(post);
                  setCurrentImageIndex(0);
                }}
                onEdit={(p) => setEditingPost(p)}
                onBlockUser={() => setUserToBlock({ id: post.author.id, name: post.author.name || "User" })}
                onReportPost={() => setPostToReport(post)}
                getVisibilityIcon={getVisibilityIcon}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Wali ma jiraan qoraal
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Noqo qofka ugu horeeya ee wax qora!
              </p>
              {parent && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Qor Qoraal Cusub
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      <CreatePostDialog 
        open={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
      />

      <EditPostDialog 
        post={editingPost}
        onClose={() => setEditingPost(null)}
      />

      <PostDetailModal 
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        currentImageIndex={currentImageIndex}
        setCurrentImageIndex={setCurrentImageIndex}
        getVisibilityIcon={getVisibilityIcon}
        formatTimeAgo={formatTimeAgo}
      />

      {/* Block User Confirmation Dialog (App Store Compliance) */}
      <Dialog open={!!userToBlock} onOpenChange={() => setUserToBlock(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              Xir User-kan?
            </DialogTitle>
            <DialogDescription>
              Ma hubtaa inaad rabto inaad xirto <strong>{userToBlock?.name}</strong>?
              <br /><br />
              Marka la xiro:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Posts-kiisa kuguma muuqan doonaan</li>
                <li>Comments-kiisa kuguma muuqan doonaan</li>
                <li>Kuguma awoodi doonaan inay kula xiriiraan</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setUserToBlock(null)}
              className="flex-1"
            >
              Jooji
            </Button>
            <Button 
              variant="destructive"
              onClick={() => userToBlock && blockUserMutation.mutate(userToBlock.id)}
              disabled={blockUserMutation.isPending}
              className="flex-1"
              data-testid="confirm-block-user"
            >
              {blockUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Xir
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked Users Settings Dialog */}
      <Dialog open={isBlockedUsersOpen} onOpenChange={setIsBlockedUsersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Users-ka La Xiray
            </DialogTitle>
            <DialogDescription>
              Qofka aad xirtay, posts-kiisa iyo comments-kiisa kuguma muuqan doonaan.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            {blockedUsers && blockedUsers.length > 0 ? (
              <div className="space-y-2">
                {blockedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.picture || undefined} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {(user.name || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unblockUserMutation.mutate(user.id)}
                      disabled={unblockUserMutation.isPending}
                      data-testid={`unblock-user-${user.id}`}
                    >
                      {unblockUserMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Fur"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Ma jiraan users aad xirtay.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Post Dialog (App Store Compliance) */}
      <Dialog open={!!postToReport} onOpenChange={() => { setPostToReport(null); setReportReason(""); setReportDescription(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500" />
              Ka warbixin Post-kan
            </DialogTitle>
            <DialogDescription>
              Fadlan sheeg sababta aad u soo warbixinayso post-kan. Tiimkeena moderation ayaa dib u eegi doona.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Sababta</label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Dooro sababta..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hate_speech">Nacaybka iyo takoorka</SelectItem>
                  <SelectItem value="harassment">Dhibaateynta</SelectItem>
                  <SelectItem value="violence">Rabshadaha</SelectItem>
                  <SelectItem value="misinformation">Xog been ah</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harmful_to_children">Waxyaabaha carruurta u daran</SelectItem>
                  <SelectItem value="other">Kuwo kale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Faahfaahin (ikhtiyaari)</label>
              <Textarea 
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Qor faahfaahin dheeraad ah haddii aad rabto..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => { setPostToReport(null); setReportReason(""); setReportDescription(""); }}
              className="flex-1"
            >
              Jooji
            </Button>
            <Button 
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => postToReport && reportPostMutation.mutate({
                postId: postToReport.id,
                authorId: postToReport.author.id,
                reason: reportReason,
                description: reportDescription,
              })}
              disabled={reportPostMutation.isPending || !reportReason}
              data-testid="submit-report"
            >
              {reportPostMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Dir Warbixinta
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings button to access blocked users */}
      {parent && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            size="icon"
            variant="outline"
            className="rounded-full h-12 w-12 bg-white shadow-lg hover:bg-gray-50"
            onClick={() => setIsBlockedUsersOpen(true)}
            data-testid="button-blocked-users-settings"
            title="Settings - Blocked Users"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface PostCardProps {
  post: ParentPost;
  currentParentId?: string;
  onSelect: () => void;
  onEdit?: (post: ParentPost) => void;
  onBlockUser?: () => void;
  onReportPost?: () => void;
  getVisibilityIcon: (v: string) => React.ReactNode;
  formatTimeAgo: (d: string) => string;
}

function PostCard({ post, currentParentId, onSelect, onEdit, onBlockUser, onReportPost, getVisibilityIcon, formatTimeAgo }: PostCardProps) {
  const queryClient = useQueryClient();
  const isAuthor = currentParentId === post.parentId;
  const isLoggedIn = !!currentParentId;
  const [showComments, setShowComments] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);
  const contentLimit = 200;

  // Auto-scroll to comments when toggling
  const handleToggleComments = () => {
    setShowComments(!showComments);
    if (!showComments) {
      setTimeout(() => {
        commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  // Check if current user follows this author
  const { data: followStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: [`/api/parents/${post.author.id}/follow-status`],
    enabled: isLoggedIn && !isAuthor && !!post.author.id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parents/${post.author.id}/follow`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to follow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${post.author.id}/follow-status`] });
      toast.success("Waxaad raacday!");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parents/${post.author.id}/follow`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unfollow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${post.author.id}/follow-status`] });
      toast.success("Waxaad ka tagay");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/social-posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast.success("Qoraalka waa la tirtiray");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay");
    },
  });

  const handleDelete = () => {
    if (confirm("Ma hubtaa inaad tiritireyso qoraalkan?")) {
      deleteMutation.mutate();
    }
  };

  const handleFollowToggle = () => {
    if (followStatus?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`card-post-${post.id}`}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/parent/${post.author.id}`}>
                <Avatar className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  {post.author.picture ? (
                    <AvatarImage src={post.author.picture} alt={post.author.name || ""} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {post.author.name?.charAt(0) || "W"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link href={`/parent/${post.author.id}`}>
                  <p className="font-medium text-sm hover:text-primary cursor-pointer transition-colors">
                    {post.author.name || "Waalid"}
                  </p>
                </Link>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{formatTimeAgo(post.createdAt)}</span>
                  <span>·</span>
                  {getVisibilityIcon(post.visibility)}
                </div>
              </div>
              {isLoggedIn && !isAuthor && (
                <Button
                  variant={followStatus?.isFollowing ? "outline" : "default"}
                  size="sm"
                  className="h-7 text-xs ml-2"
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {followMutation.isPending || unfollowMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : followStatus?.isFollowing ? (
                    <>
                      <UserMinus className="w-3 h-3 mr-1" />
                      Ka tag
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Raac
                    </>
                  )}
                </Button>
              )}
            </div>
            {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAuthor ? (
                    <>
                      <DropdownMenuItem onClick={() => onEdit?.(post)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Wax ka bedel
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Tirtir
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={onBlockUser}
                        data-testid={`block-user-${post.author.id}`}
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Xir User-kan
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-orange-500 focus:text-orange-500"
                        onClick={onReportPost}
                        data-testid={`report-post-${post.id}`}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Ka warbixin Post-kan
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <h3 className="font-semibold text-base mb-2">{post.title}</h3>
          <div className="mb-3">
            <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${!isContentExpanded && post.content.length > contentLimit ? 'line-clamp-3' : ''}`}>
              {isContentExpanded ? post.content : post.content.length > contentLimit ? post.content.substring(0, contentLimit) + '...' : post.content}
            </p>
            {post.content.length > contentLimit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsContentExpanded(!isContentExpanded);
                }}
                className="text-primary text-sm font-medium mt-1 hover:underline"
                data-testid={`button-expand-content-${post.id}`}
              >
                {isContentExpanded ? 'Yareey' : 'Wada-arag'}
              </button>
            )}
          </div>
          
          {post.images && post.images.length > 0 && (
            <div 
              className="relative rounded-lg overflow-hidden mb-3 cursor-pointer"
              onClick={onSelect}
            >
              <img 
                src={post.images[0].imageUrl} 
                alt={post.images[0].altText || post.title}
                className="w-full h-48 object-cover"
              />
              {post.images.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  +{post.images.length - 1}
                </div>
              )}
            </div>
          )}

          {post.audioUrl && (
            <div className="mb-3">
              <CommunityAudioPlayer
                audioUrl={post.audioUrl}
                title={post.title || undefined}
                description={post.content || undefined}
                authorName={post.author?.name || undefined}
              />
            </div>
          )}

          <PostReactionsBar postId={post.id} likeCount={post.likeCount} isLoggedIn={isLoggedIn} />
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              <button 
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                onClick={handleToggleComments}
                data-testid={`button-comments-${post.id}`}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{post.commentCount} Faallo</span>
              </button>
            </div>
            <button
              onClick={async () => {
                const shareData = { title: post.title, text: post.content.substring(0, 100), url: `/waalid/feed#post-${post.id}` };
                if (navigator.share && navigator.canShare?.(shareData)) {
                  try { await navigator.share(shareData); } catch {}
                } else {
                  await navigator.clipboard.writeText(shareData.url);
                  toast.success("Linkiga waa la koobiyay!");
                }
              }}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-sm"
              data-testid={`button-share-${post.id}`}
            >
              <Share2 className="w-4 h-4" />
              <span>La Wadaag</span>
            </button>
          </div>

          {/* Comments Section - Always visible */}
          <div className="border-t pt-3 mt-3" ref={commentsRef}>
            <PostCommentsSection postId={post.id} currentParentId={currentParentId} showExpanded={showComments} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
}

function CreatePostDialog({ open, onClose }: CreatePostDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      toast.error("Microphone-ka lama helin. Fadlan oggolow access-ka.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  }, []);

  const removeRecording = useCallback(() => {
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingDuration(0);
  }, [recordedAudioUrl]);

  const uploadAudio = async (): Promise<string | null> => {
    if (!recordedAudioBlob) return null;
    const formData = new FormData();
    formData.append('audio', recordedAudioBlob, 'recording.webm');
    const res = await fetch('/api/social-posts/upload-audio', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error("Audio upload failed");
    const data = await res.json();
    return data.audioUrl;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 4) {
      toast.error("Ugu badnaan 4 sawir ayaad soo gelin kartaa");
      return;
    }
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setSelectedImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (postId: string) => {
    const uploadedUrls: string[] = [];
    
    for (const file of selectedImages) {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch('/api/social-posts/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        uploadedUrls.push(data.imageUrl);
        
        await fetch(`/api/social-posts/${postId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            imageUrl: data.imageUrl,
            displayOrder: uploadedUrls.length - 1
          }),
        });
      }
    }
    
    return uploadedUrls;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let audioUrlFinal: string | null = null;
      if (recordedAudioBlob) {
        audioUrlFinal = await uploadAudio();
      }

      const res = await fetch("/api/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title || "", content: content || "", visibility, audioUrl: audioUrlFinal }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create post");
      }
      return res.json();
    },
    onSuccess: async (post) => {
      if (selectedImages.length > 0) {
        try {
          await uploadImages(post.id);
        } catch (err) {
          console.error("Image upload error:", err);
        }
      }
      setIsUploading(false);
      
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast.success("Qoraalkaaga waa la soo dhigay!");
      setTitle("");
      setContent("");
      setVisibility("public");
      setSelectedImages([]);
      setImagePreviews([]);
      removeRecording();
      onClose();
    },
    onError: (err: Error) => {
      setIsUploading(false);
      toast.error(err.message || "Khalad ayaa dhacay");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = title.trim() || content.trim();
    const hasAudio = !!recordedAudioBlob;
    if (!hasText && !hasAudio) {
      toast.error("Fadlan buuxi qoraalka ama duub codkaaga");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Qor Qoraal Cusub</DialogTitle>
          <DialogDescription>
            La wadaag fikirkaaga waalidiinta kale
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Cinwaanka qoraalka..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              data-testid="input-post-title"
            />
          </div>
          <div>
            <Textarea
              placeholder="Maxaad doonaysaa inaad la wadaagto?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
              data-testid="input-post-content"
            />
          </div>

          {/* Image picker */}
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              multiple
              className="hidden"
              data-testid="input-post-images"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              disabled={selectedImages.length >= 4}
            >
              <ImageIcon className="w-5 h-5" />
              <span>Ku dar sawir (max 4)</span>
            </button>
            
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden">
                    <img src={preview} alt="" className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audio Recording */}
          <div className="space-y-2">
            {!recordedAudioUrl && !isRecording && (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-500 transition-colors"
                data-testid="button-start-audio-recording"
              >
                <Mic className="w-5 h-5" />
                <span>Duub codkaaga</span>
              </button>
            )}

            {isRecording && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm text-red-600 font-medium flex-1">
                  Waa la duubayaa... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  data-testid="button-stop-audio-recording"
                >
                  <Square className="w-3 h-3 text-white fill-white" />
                </button>
              </div>
            )}

            {recordedAudioUrl && (
              <div className="relative">
                <div className="rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">Audio waa la duubay</p>
                      <p className="text-xs text-gray-500">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')} daqiiqo</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeRecording}
                      className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center hover:bg-red-200 transition-colors"
                      data-testid="button-remove-audio-recording"
                    >
                      <X className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <audio src={recordedAudioUrl} controls className="w-full mt-2 h-8" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-40" data-testid="select-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Dadka oo dhan
                  </div>
                </SelectItem>
                <SelectItem value="followers">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Raacayaashayda
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Aniga kaliya
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || isUploading || (!title.trim() && !content.trim() && !recordedAudioBlob)}
              data-testid="button-submit-post"
            >
              {createMutation.isPending || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isUploading ? "Sawir la geliyay..." : "..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Soo Dir
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditPostDialogProps {
  post: ParentPost | null;
  onClose: () => void;
}

function EditPostDialog({ post, onClose }: EditPostDialogProps) {
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [visibility, setVisibility] = useState(post?.visibility || "public");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<PostImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Update form when post changes
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setVisibility(post.visibility);
      setExistingImages(post.images || []);
      setSelectedImages([]);
      setImagePreviews([]);
    }
  }, [post]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + selectedImages.length + files.length;
    if (totalImages > 4) {
      toast.error("Ugu badnaan 4 sawir ayaad soo gelin kartaa");
      return;
    }
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setSelectedImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageId: string) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const uploadImages = async (postId: string) => {
    for (const file of selectedImages) {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch('/api/social-posts/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        await fetch(`/api/social-posts/${postId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            imageUrl: data.imageUrl,
            displayOrder: existingImages.length + selectedImages.indexOf(file)
          }),
        });
      }
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/social-posts/${post?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, content, visibility }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update post");
      }
      return res.json();
    },
    onSuccess: async () => {
      if (selectedImages.length > 0 && post) {
        setIsUploading(true);
        try {
          await uploadImages(post.id);
        } catch (err) {
          console.error("Image upload error:", err);
        }
        setIsUploading(false);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast.success("Qoraalka waa la cusbooneysiiyay!");
      setSelectedImages([]);
      setImagePreviews([]);
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Khalad ayaa dhacay");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Fadlan buuxi cinwaanka iyo qoraalka");
      return;
    }
    updateMutation.mutate();
  };

  const totalImages = existingImages.length + selectedImages.length;

  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Wax ka bedel Qoraalka</DialogTitle>
          <DialogDescription>
            Cusboonaysii qoraalkaaga
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Cinwaanka qoraalka..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              data-testid="input-edit-title"
            />
          </div>
          <div>
            <Textarea
              placeholder="Qoraalka..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
              data-testid="input-edit-content"
            />
          </div>

          {/* Image picker */}
          <div className="space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              multiple
              className="hidden"
              data-testid="input-edit-images"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              disabled={totalImages >= 4}
            >
              <ImageIcon className="w-5 h-5" />
              <span>Ku dar sawir ({totalImages}/4)</span>
            </button>
            
            {/* Existing images */}
            {existingImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative rounded-lg overflow-hidden">
                    <img src={img.imageUrl} alt="" className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New image previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden border-2 border-dashed border-blue-300">
                    <img src={preview} alt="" className="w-full h-24 object-cover" />
                    <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">Cusub</span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-40" data-testid="select-edit-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Dadka oo dhan
                  </div>
                </SelectItem>
                <SelectItem value="followers">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Raacayaashayda
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Aniga kaliya
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending || isUploading || !title.trim() || !content.trim()}
              data-testid="button-update-post"
            >
              {updateMutation.isPending || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isUploading ? "Sawir la geliyay..." : "..."}
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Cusboonaysii
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PostDetailModalProps {
  post: ParentPost | null;
  onClose: () => void;
  currentImageIndex: number;
  setCurrentImageIndex: (i: number) => void;
  getVisibilityIcon: (v: string) => React.ReactNode;
  formatTimeAgo: (d: string) => string;
}

function PostDetailModal({ 
  post, 
  onClose, 
  currentImageIndex, 
  setCurrentImageIndex,
  getVisibilityIcon,
  formatTimeAgo 
}: PostDetailModalProps) {
  if (!post) return null;

  const hasImages = post.images && post.images.length > 0;
  const hasMultipleImages = post.images && post.images.length > 1;

  const nextImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((currentImageIndex + 1) % post.images.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((currentImageIndex - 1 + post.images.length) % post.images.length);
    }
  };

  return (
    <AnimatePresence>
      <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                {post.author.picture ? (
                  <AvatarImage src={post.author.picture} alt={post.author.name || ""} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {post.author.name?.charAt(0) || "W"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{post.author.name || "Waalid"}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{formatTimeAgo(post.createdAt)}</span>
                  <span>·</span>
                  {getVisibilityIcon(post.visibility)}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {hasImages && (
            <div className="relative bg-black">
              <img 
                src={post.images[currentImageIndex].imageUrl} 
                alt={post.images[currentImageIndex].altText || post.title}
                className="w-full max-h-96 object-contain"
              />
              {hasMultipleImages && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {post.images.map((_, idx) => (
                      <button
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentImageIndex ? "bg-white" : "bg-white/50"
                        }`}
                        onClick={() => setCurrentImageIndex(idx)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="p-4">
            <h2 className="text-xl font-bold mb-3">{post.title}</h2>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
            {post.audioUrl && (
              <div className="mt-3">
                <CommunityAudioPlayer
                  audioUrl={post.audioUrl}
                  title={post.title || undefined}
                  authorName={post.author?.name || undefined}
                />
              </div>
            )}
          </div>

          <div className="p-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Heart className="w-5 h-5" />
                <span>{post.likeCount} Jeclayn</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span>{post.commentCount} Faallo</span>
              </button>
            </div>
            <button
              onClick={async () => {
                const shareData = { title: post.title, text: post.content.substring(0, 100), url: `/waalid/feed#post-${post.id}` };
                if (navigator.share && navigator.canShare?.(shareData)) {
                  try { await navigator.share(shareData); } catch {}
                } else {
                  await navigator.clipboard.writeText(shareData.url);
                  toast.success("Linkiga waa la koobiyay!");
                }
              }}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-sm"
              data-testid={`button-share-${post.id}`}
            >
              <Share2 className="w-4 h-4" />
              <span>La Wadaag</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}

// Messenger Dropdown - Chat dropdown from top button
interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerPicture: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

function MessengerDropdown({ onClose }: { onClose: () => void }) {
  const { parent } = useParentAuth();
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    enabled: !!parent,
    refetchInterval: 30000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery<DirectMessage[]>({
    queryKey: [`/api/messages/${activeChat?.partnerId}`],
    enabled: !!parent && !!activeChat,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/messages/${activeChat?.partnerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("so-SO", { hour: "2-digit", minute: "2-digit" });
  };

  if (!parent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 h-[400px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-3 flex items-center justify-between">
        {activeChat ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-7 w-7"
              onClick={() => setActiveChat(null)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Avatar className="w-7 h-7">
              {activeChat.partnerPicture ? (
                <AvatarImage src={activeChat.partnerPicture} />
              ) : (
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {activeChat.partnerName?.charAt(0) || "W"}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-white font-semibold text-sm truncate">
              {activeChat.partnerName || "Waalid"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-white" />
            <h3 className="text-white font-bold text-sm">Fariimaha</h3>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-7 w-7"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      {activeChat ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === parent.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    msg.senderId === parent.id
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "bg-white text-gray-800 border rounded-bl-md"
                  }`}
                >
                  <p>{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${msg.senderId === parent.id ? "text-blue-100" : "text-gray-400"}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {(!messages || messages.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-8">
                Weli fariimo ma jiraan
              </p>
            )}
          </div>

          {/* Input */}
          <div className="p-2 border-t bg-white flex items-center gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Qor fariin..."
              className="flex-1 text-sm h-9"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              data-testid="input-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!messageText.trim() || sendMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600 h-9 w-9"
              data-testid="button-send-message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </>
      ) : (
        /* Conversations List */
        <div className="flex-1 overflow-y-auto">
          {conversations && conversations.length > 0 ? (
            conversations.map((conv) => (
              <button
                key={conv.partnerId}
                onClick={() => setActiveChat(conv)}
                className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b transition-colors text-left"
                data-testid={`conversation-${conv.partnerId}`}
              >
                <Avatar className="w-10 h-10">
                  {conv.partnerPicture ? (
                    <AvatarImage src={conv.partnerPicture} />
                  ) : (
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {conv.partnerName?.charAt(0) || "W"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">
                      {conv.partnerName || "Waalid"}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <h4 className="font-semibold text-gray-800 text-sm mb-1">Weli fariimo ma haysatid</h4>
              <p className="text-xs text-gray-500">
                Raac waalidiinta kale si aad ula xiriirtid
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// All reaction types with emojis - shown directly
const QUICK_REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'dislike', emoji: '👎', label: 'Dislike' },
  { type: 'love', emoji: '❤️', label: 'Jacayl' },
  { type: 'haha', emoji: '😂', label: 'Qosol' },
  { type: 'wow', emoji: '😮', label: 'Yaab' },
  { type: 'sad', emoji: '😢', label: 'Murugad' },
  { type: 'angry', emoji: '😠', label: 'Cadho' },
];

interface PostReactionsBarProps {
  postId: string;
  likeCount: number;
  isLoggedIn: boolean;
}

function PostReactionsBar({ postId, likeCount, isLoggedIn }: PostReactionsBarProps) {
  const queryClient = useQueryClient();

  const { data: reactionsData } = useQuery<{ counts: Record<string, number>; userReaction: string | null }>({
    queryKey: [`/api/social-posts/${postId}/reactions`],
  });

  const reactionMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await fetch(`/api/social-posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reactionType }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to react");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/social-posts/${postId}/reactions`] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
    },
    onError: (error: Error) => {
      console.error("Reaction error:", error);
      toast.error("Fadlan soo gal si aad reaction u bixiso");
    },
  });

  const userReaction = reactionsData?.userReaction;

  return (
    <div className="pb-2">
      <div className="flex items-center gap-1">
        {/* Quick reaction buttons - Like, Dislike, Wow */}
        {QUICK_REACTIONS.map((reaction) => {
          const count = reactionsData?.counts[reaction.type] || 0;
          const isActive = userReaction === reaction.type;
          
          return (
            <button
              key={reaction.type}
              onClick={() => {
                if (!isLoggedIn) {
                  toast.error("Fadlan soo gal si aad reaction u bixiso");
                  return;
                }
                reactionMutation.mutate(reaction.type);
              }}
              disabled={reactionMutation.isPending}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                isActive 
                  ? 'bg-blue-100 text-blue-600 border border-blue-300' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
              } cursor-pointer active:scale-95`}
              title={reaction.label}
              data-testid={`reaction-${reaction.type}-${postId}`}
            >
              <span className="text-lg">{reaction.emoji}</span>
              {count > 0 && <span className="font-medium">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PostComment {
  id: string;
  postId: string;
  parentId: string;
  parentCommentId?: string | null;
  body: string;
  isEdited: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    picture: string | null;
  };
  replies?: PostComment[];
}

// Compact reaction emojis for comments
const COMMENT_REACTIONS = [
  { type: 'like', emoji: '👍' },
  { type: 'love', emoji: '❤️' },
  { type: 'haha', emoji: '😂' },
];

interface CommentReactionsBarProps {
  postId: string;
  commentId: string;
  isLoggedIn: boolean;
}

function CommentReactionsBar({ postId, commentId, isLoggedIn }: CommentReactionsBarProps) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);

  const { data: reactionsData } = useQuery<{ counts: Record<string, number>; userReaction: string | null }>({
    queryKey: [`/api/social-posts/${postId}/comments/${commentId}/reactions`],
  });

  const reactionMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await fetch(`/api/social-posts/${postId}/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reactionType }),
      });
      if (!res.ok) throw new Error("Failed to react");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/social-posts/${postId}/comments/${commentId}/reactions`] });
      setShowPicker(false);
    },
  });

  const userReaction = reactionsData?.userReaction;
  const totalReactions = Object.values(reactionsData?.counts || {}).reduce((a, b) => a + b, 0);

  // Get the emoji to display (user's reaction or default like)
  const displayEmoji = userReaction 
    ? QUICK_REACTIONS.find(r => r.type === userReaction)?.emoji || '👍'
    : '👍';

  return (
    <div className="relative inline-flex items-center">
      {!showPicker ? (
        <button
          type="button"
          onClick={() => isLoggedIn && setShowPicker(true)}
          disabled={!isLoggedIn || reactionMutation.isPending}
          className={`flex items-center gap-0.5 text-xs transition-all ${
            userReaction ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
          } ${!isLoggedIn ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          data-testid={`comment-react-${commentId}`}
        >
          <span className="text-sm">{displayEmoji}</span>
          {totalReactions > 0 && <span className="font-medium">{totalReactions}</span>}
        </button>
      ) : (
        <div 
          className="flex gap-0.5 bg-white shadow-xl rounded-full px-1 py-0.5 border border-gray-200"
          style={{ zIndex: 9999 }}
        >
          {QUICK_REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              type="button"
              onClick={() => {
                reactionMutation.mutate(reaction.type);
              }}
              disabled={reactionMutation.isPending}
              className={`text-lg w-7 h-7 flex items-center justify-center rounded-full active:bg-gray-200 hover:bg-gray-100 transition-all ${
                userReaction === reaction.type ? 'bg-blue-100 ring-2 ring-blue-300' : ''
              }`}
              title={reaction.label}
              data-testid={`comment-react-${reaction.type}-${commentId}`}
            >
              {reaction.emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="text-gray-400 w-6 h-7 flex items-center justify-center hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface PostCommentsSectionProps {
  postId: string;
  currentParentId?: string;
  showExpanded?: boolean;
  onReportComment?: (comment: PostComment) => void;
}

function PostCommentsSection({ postId, currentParentId, showExpanded = false, onReportComment }: PostCommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [showAllComments, setShowAllComments] = useState(showExpanded);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [commentToReport, setCommentToReport] = useState<PostComment | null>(null);
  const [commentReportReason, setCommentReportReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Comment report mutation
  const reportCommentMutation = useMutation({
    mutationFn: async (data: { commentId: string; authorId: string; reason: string }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reportType: "post_comment",
          contentId: data.commentId,
          reportedUserId: data.authorId,
          reason: data.reason,
        }),
      });
      if (!res.ok) throw new Error("Failed to report comment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Warbixintaada waa la diray.");
      setCommentToReport(null);
      setCommentReportReason("");
    },
    onError: () => {
      toast.error("Khalad ayaa dhacay.");
    },
  });
  const COMMENTS_PREVIEW_COUNT = 2;

  // Sync showAllComments with showExpanded prop
  useEffect(() => {
    if (showExpanded) setShowAllComments(true);
  }, [showExpanded]);

  const { data: comments, isLoading } = useQuery<PostComment[]>({
    queryKey: [`/api/social-posts/${postId}/comments`],
    refetchInterval: 30000,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const createMutation = useMutation({
    mutationFn: async ({ body, parentCommentId }: { body: string; parentCommentId?: string }) => {
      const res = await fetch(`/api/social-posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body, parentCommentId }),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      return res.json();
    },
    onSuccess: async (comment) => {
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        await fetch(`/api/social-posts/${postId}/comments/${comment.id}/images`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
      }
      setNewComment("");
      setReplyingToId(null);
      removeImage();
      queryClient.invalidateQueries({ queryKey: [`/api/social-posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast.success("Faalladaada waa la dhigay");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const res = await fetch(`/api/social-posts/${postId}/comments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error("Failed to update comment");
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      setEditingBody("");
      queryClient.invalidateQueries({ queryKey: [`/api/social-posts/${postId}/comments`] });
      toast.success("Faalladaada waa la cusbooneysiiyay");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/social-posts/${postId}/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/social-posts/${postId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast.success("Faalladaada waa la tirtiray");
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createMutation.mutate({ 
      body: newComment.trim(), 
      parentCommentId: replyingToId || undefined 
    });
  };

  const startEdit = (comment: PostComment) => {
    setEditingId(comment.id);
    setEditingBody(comment.body);
  };

  const saveEdit = () => {
    if (!editingBody.trim() || !editingId) return;
    updateMutation.mutate({ id: editingId, body: editingBody.trim() });
  };

  // Helper to render a single comment (used for both top-level and replies)
  const renderComment = (comment: PostComment, isReply: boolean = false) => (
    <div key={comment.id} className={`flex gap-2 ${isReply ? 'ml-10' : ''}`} data-testid={`comment-${comment.id}`}>
      <Link href={`/parent/${comment.author.id}`}>
        <Avatar className={isReply ? "w-6 h-6" : "w-8 h-8"}>
          {comment.author.picture ? (
            <AvatarImage src={comment.author.picture} />
          ) : (
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
              {comment.author.name?.charAt(0) || "W"}
            </AvatarFallback>
          )}
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        {editingId === comment.id ? (
          <div className="flex gap-2">
            <Input
              value={editingBody}
              onChange={(e) => setEditingBody(e.target.value)}
              className="flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
              data-testid={`input-edit-comment-${comment.id}`}
            />
            <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-gray-100 rounded-2xl px-3 py-2">
              <Link href={`/parent/${comment.author.id}`}>
                <span className="font-semibold text-xs text-gray-800 hover:underline">
                  {comment.author.name}
                </span>
              </Link>
              <p className="text-sm text-gray-700">{comment.body}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 px-2 text-xs text-gray-500">
              <CommentReactionsBar postId={postId} commentId={comment.id} isLoggedIn={!!currentParentId} />
              <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
              {comment.isEdited && <span className="italic">(wax laga bedelay)</span>}
              {currentParentId && !isReply && (
                <button 
                  onClick={() => {
                    setReplyingToId(comment.id);
                    setNewComment(`@${comment.author.name} `);
                    inputRef.current?.focus();
                  }}
                  className="font-semibold hover:text-blue-600 transition-colors"
                  data-testid={`button-reply-comment-${comment.id}`}
                >
                  Jawaab
                </button>
              )}
              {comment.parentId === currentParentId ? (
                <>
                  <button 
                    onClick={() => startEdit(comment)}
                    className="font-semibold hover:text-blue-600 transition-colors"
                    data-testid={`button-edit-comment-${comment.id}`}
                  >
                    Wax ka bedel
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(comment.id)}
                    className="font-semibold hover:text-red-600 transition-colors"
                    data-testid={`button-delete-comment-${comment.id}`}
                  >
                    Tirtir
                  </button>
                </>
              ) : currentParentId && (
                <button 
                  onClick={() => setCommentToReport(comment)}
                  className="font-semibold hover:text-orange-600 transition-colors"
                  data-testid={`button-report-comment-${comment.id}`}
                >
                  Ka warbixin
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* New comment input */}
      {currentParentId && (
        <div className="space-y-2">
          {/* Reply indicator */}
          {replyingToId && (
            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
              <span>Ka jawabayaa faallo</span>
              <button onClick={() => { setReplyingToId(null); setNewComment(""); }} className="ml-auto">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
              <button
                onClick={removeImage}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-center bg-gray-50 rounded-full px-3 py-1">
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="text-gray-500 hover:text-blue-600 transition-colors"
              data-testid={`button-add-image-${postId}`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <Input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingToId ? "Qor jawaab..." : "Qor faallo..."}
              className="flex-1 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              data-testid={`input-comment-${postId}`}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSubmit}
              disabled={!newComment.trim() || createMutation.isPending}
              className="h-8 w-8 p-0 rounded-full hover:bg-blue-100"
              data-testid={`button-submit-comment-${postId}`}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-primary" />}
            </Button>
          </div>
        </div>
      )}

      {/* View all comments button */}
      {comments && comments.length > COMMENTS_PREVIEW_COUNT && !showAllComments && (
        <button
          onClick={() => setShowAllComments(true)}
          className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          data-testid={`button-view-all-comments-${postId}`}
        >
          Arag dhammaan {comments.length} faallo
        </button>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className={`space-y-3 ${showAllComments ? 'max-h-96 overflow-y-auto' : ''}`}>
          {(showAllComments ? comments : comments.slice(0, COMMENTS_PREVIEW_COUNT)).map((comment) => (
            <div key={comment.id}>
              {renderComment(comment, false)}
              {/* Render nested replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                  {comment.replies.map((reply) => renderComment(reply, true))}
                </div>
              )}
            </div>
          ))}
          {showAllComments && comments.length > COMMENTS_PREVIEW_COUNT && (
            <button
              onClick={() => setShowAllComments(false)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              data-testid={`button-collapse-comments-${postId}`}
            >
              Yareey faallooyinka
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          Weli faallo ma jiraan
        </p>
      )}

      {/* Comment Report Dialog */}
      <Dialog open={!!commentToReport} onOpenChange={() => { setCommentToReport(null); setCommentReportReason(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500" />
              Ka warbixin faalladaan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Select value={commentReportReason} onValueChange={setCommentReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="Sababta..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hate_speech">Nacaybka</SelectItem>
                <SelectItem value="harassment">Dhibaateyn</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="other">Kuwo kale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => setCommentToReport(null)} className="flex-1">
              Jooji
            </Button>
            <Button 
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => commentToReport && reportCommentMutation.mutate({
                commentId: commentToReport.id,
                authorId: commentToReport.author.id,
                reason: commentReportReason,
              })}
              disabled={reportCommentMutation.isPending || !commentReportReason}
            >
              {reportCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
