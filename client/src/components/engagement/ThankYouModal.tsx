import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Share2, MessageCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
  contentType: string;
  contentId: string;
}

export function ThankYouModal({ 
  isOpen, 
  onClose, 
  title, 
  shareUrl, 
  contentType,
  contentId 
}: ThankYouModalProps) {
  const [copied, setCopied] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  const storageKey = `${contentType}:${contentId}:thankyou`;

  useEffect(() => {
    if (isOpen) {
      const shown = localStorage.getItem(storageKey);
      if (!shown) {
        setShouldShow(true);
        localStorage.setItem(storageKey, "true");
      } else {
        onClose();
      }
    } else {
      setShouldShow(false);
    }
  }, [isOpen, storageKey, onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Linkiga waa la koobiyay!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Wax qalad ah ayaa dhacay");
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${title}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(title);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(title);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
              data-testid="button-close-thankyou"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="text-center mb-6">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="inline-block mb-4"
              >
                <Heart className="w-12 h-12 text-red-500 fill-red-500" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Mahadsanid!
              </h2>
              <p className="text-slate-400">
                Waxaan ku faraxsanahay inaad akhriday. Fadlan la wadaag saaxiibadaada!
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-300 font-medium text-center mb-3">
                La wadaag:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={shareToWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-share-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  onClick={shareToTelegram}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  data-testid="button-share-telegram"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Telegram
                </Button>
                <Button
                  onClick={shareToFacebook}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-share-facebook"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  onClick={shareToTwitter}
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                  data-testid="button-share-twitter"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  X (Twitter)
                </Button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <Button
                onClick={copyLink}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                data-testid="button-copy-link"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    Waa la koobiyay!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Koobiyo linkiga
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
