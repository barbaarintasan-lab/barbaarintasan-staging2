import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Moon, Star, Calendar, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { format } from "date-fns";

interface BedtimeStory {
  id: number;
  title: string;
  titleSomali: string;
  content: string;
  characterName: string;
  characterType: "sahabi" | "tabiyin";
  moralLesson: string;
  ageRange: string;
  images: string[];
  storyDate: string;
  generatedAt: string;
  isPublished: boolean;
}

interface BedtimeStoriesArchiveProps {
  onBack: () => void;
}

export default function BedtimeStoriesArchive({ onBack }: BedtimeStoriesArchiveProps) {
  const [selectedStory, setSelectedStory] = useState<BedtimeStory | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: allStories = [], isLoading } = useQuery<BedtimeStory[]>({
    queryKey: ["/api/bedtime-stories"],
    queryFn: () => fetch("/api/bedtime-stories").then(r => r.json()),
    staleTime: 60000,
  });

  const stories = allStories.filter(story => story.isPublished);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return dateString;
    }
  };

  if (selectedStory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedStory(null);
                setCurrentImageIndex(0);
              }}
              className="text-white hover:bg-white/10"
              data-testid="button-back-story"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{selectedStory.titleSomali}</h1>
              <p className="text-slate-400 text-sm">{formatDate(selectedStory.storyDate)}</p>
            </div>
          </div>

          {selectedStory.images && selectedStory.images.length > 0 && (
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src={selectedStory.images[currentImageIndex]}
                  alt={selectedStory.titleSomali}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {selectedStory.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? "bg-white w-6" : "bg-white/50"
                      }`}
                      data-testid={`dot-image-${idx}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <Card className="bg-slate-800/60 border-slate-700 mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="px-3 py-1 bg-indigo-500/30 text-indigo-300 rounded-full text-xs font-medium">
                  {selectedStory.characterType === "sahabi" ? "Saxaabi" : "Taabiciin"}
                </div>
                <span className="text-slate-400 text-sm">{selectedStory.characterName}</span>
              </div>
              <div className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedStory.content}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-amber-300 font-medium text-sm mb-1">Casharka Sheekada</h4>
                  <p className="text-slate-200 text-sm">{selectedStory.moralLesson}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-white hover:bg-white/10"
            data-testid="button-back-archive"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sheekooyinka Habeenkii</h1>
              <p className="text-slate-400 text-sm">Sheekooyin hore oo la kaydiyay</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : stories.length === 0 ? (
          <Card className="bg-slate-800/50 border-dashed border-2 border-slate-600">
            <CardContent className="p-8 text-center">
              <Moon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                Wali sheeko lama kaydin
              </h3>
              <p className="text-slate-500 text-sm">
                Sheekooyin cusub way imanayaan!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <Card
                key={story.id}
                className="bg-slate-800/60 border-slate-700 overflow-hidden cursor-pointer hover:bg-slate-800/80 transition-colors"
                onClick={() => setSelectedStory(story)}
                data-testid={`card-story-${story.id}`}
              >
                <CardContent className="p-0">
                  <div className="flex gap-4">
                    {story.images && story.images[0] && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={story.images[0]}
                          alt={story.titleSomali}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="py-3 pr-4 flex-1">
                      <h3 className="text-white font-medium mb-1 line-clamp-1">
                        {story.titleSomali}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(story.storyDate)}</span>
                        <span className="text-slate-600">•</span>
                        <span className={story.characterType === "sahabi" ? "text-emerald-400" : "text-blue-400"}>
                          {story.characterName}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-2">
                        {story.content.substring(0, 100)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
