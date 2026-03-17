import { Star, Quote, PenLine, ThumbsUp, Heart, HandHelping, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParentAuth } from "@/contexts/ParentAuthContext";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

const REACTION_CONFIG = {
  thumbsup: { icon: ThumbsUp, emoji: "👍", label: "Qof ayaa taageeray" },
  heart: { icon: Heart, emoji: "❤️", label: "Qof ayaa jeclaystay" },
  clap: { icon: null, emoji: "👏", label: "Qof ayaa gacan tumay" },
  pray: { icon: null, emoji: "🤲", label: "Qof ayaa ducaysan" },
} as const;

type ReactionType = keyof typeof REACTION_CONFIG;

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  courseTag: string | null;
  profileImage: string | null;
  rating: number;
  message: string;
  isPublished: boolean;
  order: number;
  createdAt: string;
}

interface ReactionData {
  counts: Record<string, number>;
  userReaction: string | null;
}

function TestimonialReactions({ 
  testimonialId, 
  reactions,
  isLoggedIn 
}: { 
  testimonialId: string;
  reactions?: ReactionData;
  isLoggedIn: boolean;
}) {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await apiRequest("POST", `/api/testimonials/${testimonialId}/reactions`, { reactionType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonial-reactions"] });
    },
  });

  const counts = reactions?.counts || {};
  const userReaction = reactions?.userReaction;
  const hasAnyReactions = Object.values(counts).some(c => c > 0);

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(REACTION_CONFIG) as ReactionType[]).map((type) => {
          const config = REACTION_CONFIG[type];
          const count = counts[type] || 0;
          const isActive = userReaction === type;
          
          if (!isLoggedIn && count === 0) return null;
          
          return (
            <button
              key={type}
              onClick={() => isLoggedIn && mutation.mutate(type)}
              disabled={!isLoggedIn || mutation.isPending}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm transition-all ${
                isActive 
                  ? "bg-blue-100 text-blue-700 border border-blue-200" 
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
              } ${!isLoggedIn ? "cursor-default" : "cursor-pointer"}`}
              data-testid={`reaction-${type}-${testimonialId}`}
            >
              <span className="text-base">{config.emoji}</span>
              {count > 0 && <span className="font-medium">{count}</span>}
            </button>
          );
        })}
        {!hasAnyReactions && isLoggedIn && (
          <span className="text-xs text-gray-400">Riix si aad u dhiirrigeliso</span>
        )}
      </div>
    </div>
  );
}

export default function Testimonials() {
  const { parent } = useParentAuth();
  
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const res = await fetch("/api/testimonials");
      if (!res.ok) throw new Error("Failed to fetch testimonials");
      return res.json();
    },
  });

  const { data: reactionsData = {} } = useQuery<Record<string, ReactionData>>({
    queryKey: ["testimonial-reactions"],
    queryFn: async () => {
      const res = await fetch("/api/testimonial-reactions");
      if (!res.ok) throw new Error("Failed to fetch reactions");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white pb-24">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-40 border-b border-gray-100">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Waayo-aragnimada Waalidka</h1>
            <p className="text-sm text-gray-500">Waxaa dhahay waalidka koorsooyinkeena qaatay!</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 rounded-full mb-4">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">500+ Waalidiin Faraxsan</h2>
          <p className="text-gray-600">Waalidka aduunka oo dhan ayaa isticmaala Barbaarintasan</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Weli waayo-aragnimo ma jirto.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {testimonials.map((testimonial) => (
              <div 
                key={testimonial.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                data-testid={`testimonial-card-${testimonial.id}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {testimonial.profileImage ? (
                      <img src={testimonial.profileImage} alt={testimonial.name} className="w-full h-full object-cover" />
                    ) : (
                      testimonial.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{testimonial.name}</h3>
                    {testimonial.location && (
                      <p className="text-sm text-gray-500">{testimonial.location}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <Quote className="absolute -top-1 -left-1 w-6 h-6 text-blue-100" />
                  <p className="text-gray-700 pl-5 leading-relaxed">{testimonial.message}</p>
                </div>
                
                {testimonial.courseTag && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                      {testimonial.courseTag}
                    </span>
                  </div>
                )}
                
                <TestimonialReactions 
                  testimonialId={testimonial.id}
                  reactions={reactionsData[testimonial.id]}
                  isLoggedIn={!!parent}
                />
              </div>
            ))}
          </div>
        )}

        {parent && (
          <div className="mt-6">
            <Link href="/submit-testimonial">
              <Button 
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-lg rounded-2xl shadow-lg"
                data-testid="button-submit-testimonial"
              >
                <PenLine className="w-5 h-5 mr-2" />
                Soo Dir Faalladaada
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Noqo Mid Ka Mid Ah Waalidka Faraxsan</h3>
            <p className="text-gray-600 text-sm mb-4">Bilow koorsadaada maanta oo ku biir bulshada waalidka wax barta</p>
            {!parent && (
              <Link href="/">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Ku Gal si aad u soo dirto faalladaada
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
