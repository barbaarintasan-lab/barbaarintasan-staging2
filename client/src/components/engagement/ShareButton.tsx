import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const handleShare = async () => {
    const shareData = { title, text, url };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Linkiga waa la koobiyay!");
    } catch {
      toast.error("Wax qalad ah ayaa dhacay");
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600/30 to-cyan-600/30 rounded-xl p-4 border border-blue-500/30">
      <p className="text-blue-200/80 text-xs mb-3">
        La wadaag qaraabadaada iyo asxaabtaada
      </p>
      <Button
        onClick={handleShare}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium"
        data-testid="button-share"
      >
        <Share2 className="w-4 h-4 mr-2" />
        La Wadaag
      </Button>
    </div>
  );
}
