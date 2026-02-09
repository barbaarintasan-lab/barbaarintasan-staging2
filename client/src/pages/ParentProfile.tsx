import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  UserMinus, 
  MessageCircle,
  Calendar,
  Loader2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";

interface ParentProfileData {
  id: string;
  name: string;
  picture: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
}

interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

interface FollowUser {
  id: string;
  name: string;
  picture: string | null;
}

export default function ParentProfile() {
  const { id } = useParams<{ id: string }>();
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"posts" | "followers" | "following">("posts");

  const isOwnProfile = parent?.id === id;

  const { data: profile, isLoading: profileLoading } = useQuery<ParentProfileData>({
    queryKey: [`/api/parents/${id}/profile`],
    enabled: !!id,
  });

  const { data: followStatus } = useQuery<FollowStatus>({
    queryKey: [`/api/parents/${id}/follow-status`],
    enabled: !!id && !!parent && !isOwnProfile,
  });

  const { data: followers, isLoading: followersLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/parents/${id}/followers`],
    enabled: !!id,
  });

  const { data: following, isLoading: followingLoading } = useQuery<FollowUser[]>({
    queryKey: [`/api/parents/${id}/following`],
    enabled: !!id,
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<{ posts: any[] }>({
    queryKey: [`/api/social-posts`, { parentId: id }],
    queryFn: async () => {
      const res = await fetch(`/api/social-posts?parentId=${id}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parents/${id}/follow`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to follow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${id}/profile`] });
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${id}/follow-status`] });
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${id}/followers`] });
      toast.success("Waxaad follow-gareysay!");
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/parents/${id}/follow`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to unfollow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${id}/profile`] });
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${id}/follow-status`] });
      queryClient.invalidateQueries({ queryKey: [`/api/parents/${id}/followers`] });
      toast.success("Waxaad unfollow-gareysay");
    },
    onError: () => {
      toast.error("Wax qalad ah ayaa dhacay");
    },
  });

  const handleFollowToggle = () => {
    if (followStatus?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("so-SO", {
      year: "numeric",
      month: "long",
    });
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white p-4">
        <div className="max-w-lg mx-auto space-y-6">
          <Skeleton className="h-8 w-24 bg-slate-700" />
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full bg-slate-700" />
            <Skeleton className="h-6 w-32 bg-slate-700" />
            <div className="flex gap-8">
              <Skeleton className="h-12 w-20 bg-slate-700" />
              <Skeleton className="h-12 w-20 bg-slate-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white p-4">
        <div className="max-w-lg mx-auto text-center py-12">
          <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-300">Laguma Helin</h2>
          <p className="text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
            Haddii aad horay isu diiwaangelisay Soo gal riix
          </p>
          <p className="text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
            Haddii aadan diiwaangashanayna iska diiwaangeli halkaan
          </p>
          <div className="flex flex-col items-center gap-3 mt-5">
            <Button
              variant="outline"
              data-testid="btn-login-redirect"
              onClick={() => window.location.assign("/login?redirect=" + encodeURIComponent("/calendar"))}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Soo Gal
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="btn-register-redirect"
              onClick={() => window.location.assign("/register?redirect=" + encodeURIComponent("/calendar"))}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Iska Diiwaangeli
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4 text-slate-400 hover:text-white" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dib u noqo
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <Avatar className="h-24 w-24 border-4 border-indigo-500/50">
            <AvatarImage src={profile.picture || undefined} alt={profile.name} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl">
              {profile.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-2xl font-bold mt-4" data-testid="text-profile-name">{profile.name}</h1>

          <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
            <Calendar className="w-4 h-4" />
            <span>Ku Biiray BSA bishii {formatDate(profile.createdAt)}</span>
          </div>

          <div className="flex gap-8 mt-6">
            <button
              onClick={() => setActiveTab("followers")}
              className={`text-center transition-colors ${activeTab === "followers" ? "text-white" : "text-slate-400"}`}
              data-testid="button-followers"
            >
              <div className="text-2xl font-bold">{profile.followersCount}</div>
              <div className="text-sm">Followers</div>
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={`text-center transition-colors ${activeTab === "following" ? "text-white" : "text-slate-400"}`}
              data-testid="button-following"
            >
              <div className="text-2xl font-bold">{profile.followingCount}</div>
              <div className="text-sm">Following</div>
            </button>
          </div>

          {!isOwnProfile && parent && (
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleFollowToggle}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className={`min-w-32 ${
                  followStatus?.isFollowing
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                }`}
                data-testid="button-follow-toggle"
              >
                {followMutation.isPending || unfollowMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : followStatus?.isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              <Link href={`/messages?to=${id}`}>
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" data-testid="button-message">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Fariin Dir
                </Button>
              </Link>
            </div>
          )}

          {followStatus?.isFollowedBy && !isOwnProfile && (
            <div className="mt-3 text-sm text-indigo-400">
              Qofkan wuu ku follow-gareeye ✓
            </div>
          )}
        </motion.div>

        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "posts" | "followers" | "following")}>
            <TabsList className="w-full bg-slate-800/50">
              <TabsTrigger value="posts" className="flex-1">
                Qoraallada
              </TabsTrigger>
              <TabsTrigger value="followers" className="flex-1">
                Raacayaasha ({profile.followersCount})
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1">
                Raacaya ({profile.followingCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-4">
              <AnimatePresence mode="wait">
                {postsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <Skeleton className="h-5 w-3/4 bg-slate-700 mb-2" />
                          <Skeleton className="h-4 w-full bg-slate-700 mb-1" />
                          <Skeleton className="h-4 w-2/3 bg-slate-700" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : postsData?.posts && postsData.posts.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {postsData.posts.map((post) => (
                      <Link key={post.id} href={`/waalid/feed`}>
                        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            {post.title && (
                              <h3 className="font-semibold text-white mb-1">{post.title}</h3>
                            )}
                            <p className="text-slate-300 text-sm line-clamp-2">
                              {post.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(post.createdAt).toLocaleDateString("so-SO", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Qoraal malaha</p>
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="followers" className="mt-4">
              <AnimatePresence mode="wait">
                {followersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3 flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
                          <Skeleton className="h-4 w-24 bg-slate-700" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : followers && followers.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    {followers.map((follower) => (
                      <Link key={follower.id} href={`/parent/${follower.id}`}>
                        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <CardContent className="p-3 flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={follower.picture || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                                {follower.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-white">{follower.name}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Wali cid ma follow-garayn</p>
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="following" className="mt-4">
              <AnimatePresence mode="wait">
                {followingLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3 flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
                          <Skeleton className="h-4 w-24 bg-slate-700" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : following && following.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    {following.map((user) => (
                      <Link key={user.id} href={`/parent/${user.id}`}>
                        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <CardContent className="p-3 flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.picture || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600">
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-white">{user.name}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </motion.div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Wali cid ma follow-garayn</p>
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
