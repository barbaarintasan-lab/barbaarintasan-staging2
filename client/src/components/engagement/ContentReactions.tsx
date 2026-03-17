import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { toast } from "sonner";

type ReactionType = "love" | "like" | "dislike" | "sparkle";

interface ContentReactionsProps {
  contentType: "bedtime_story" | "parent_message";
  contentId: string;
}

interface ReactionData {
  counts: Record<ReactionType, number>;
  userReaction: ReactionType | null;
}

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "love", emoji: "❤️", label: "Jeclahay" },
  { type: "like", emoji: "👍", label: "Fiican" },
  { type: "dislike", emoji: "👎", label: "Maya" },
  { type: "sparkle", emoji: "✨", label: "Qurux" },
];

export function ContentReactions({ contentType, contentId }: ContentReactionsProps) {
  const { parent } = useParentAuth();
  const queryClient = useQueryClient();

  const apiPath = contentType === "bedtime_story" 
    ? `/api/bedtime-stories/${contentId}/reactions`
    : `/api/parent-messages/${contentId}/reactions`;

  const queryKey = [apiPath];

  const { data: reactionData } = useQuery<ReactionData>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(apiPath, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reactions");
      return res.json();
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async (reactionType: ReactionType) => {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reactionType }),
      });
      if (!res.ok) throw new Error("Failed to add reaction");
      return res.json();
    },
    onMutate: async (newReaction) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ReactionData>(queryKey);

      if (previous) {
        const newCounts = { ...previous.counts };
        if (previous.userReaction) {
          newCounts[previous.userReaction] = Math.max(0, (newCounts[previous.userReaction] || 0) - 1);
        }
        newCounts[newReaction] = (newCounts[newReaction] || 0) + 1;

        queryClient.setQueryData<ReactionData>(queryKey, {
          counts: newCounts,
          userReaction: newReaction,
        });
      }

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("Wax qalad ah ayaa dhacay");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiPath, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove reaction");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ReactionData>(queryKey);

      if (previous && previous.userReaction) {
        const newCounts = { ...previous.counts };
        newCounts[previous.userReaction] = Math.max(0, (newCounts[previous.userReaction] || 0) - 1);

        queryClient.setQueryData<ReactionData>(queryKey, {
          counts: newCounts,
          userReaction: null,
        });
      }

      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("Wax qalad ah ayaa dhacay");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleReaction = (reactionType: ReactionType) => {
    if (!parent) {
      toast.error("Fadlan gal akoontaada si aad u reaction u dhigto");
      return;
    }

    if (reactionData?.userReaction === reactionType) {
      removeReactionMutation.mutate();
    } else {
      addReactionMutation.mutate(reactionType);
    }
  };

  const counts = reactionData?.counts || { love: 0, like: 0, dislike: 0, sparkle: 0 };
  const userReaction = reactionData?.userReaction;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {REACTIONS.map(({ type, emoji, label }) => (
        <motion.button
          key={type}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleReaction(type)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
            userReaction === type
              ? "bg-white/20 ring-2 ring-white/40"
              : "bg-white/5 hover:bg-white/10"
          }`}
          title={label}
          data-testid={`reaction-${type}`}
        >
          <span className="text-lg">{emoji}</span>
          <span className="text-sm text-white/80">{counts[type] || 0}</span>
        </motion.button>
      ))}
    </div>
  );
}
