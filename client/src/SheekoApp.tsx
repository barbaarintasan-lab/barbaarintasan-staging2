import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { ParentAuthProvider } from "@/contexts/ParentAuthContext";
import { VoiceSpaces } from "@/components/VoiceSpaces";

export function SheekoApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ParentAuthProvider>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-950 to-slate-900">
          <VoiceSpaces />
        </div>
        <Toaster />
      </ParentAuthProvider>
    </QueryClientProvider>
  );
}
