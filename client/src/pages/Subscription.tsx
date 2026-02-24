import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ExternalLink, Globe } from "lucide-react";
import { Link } from "wouter";
import { openSSOLink } from "@/lib/api";

export default function Subscription() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Casharada</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-12">
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Casharada Buuxa</h2>
              <p className="text-blue-100 text-sm">Ku hel dhammaan casharada websaydhkeena</p>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-center leading-relaxed">
                Si aad casharada oo dhan u hesho, fadlan booqo websaydhkeena <span className="font-bold">barbaarintasan.com</span>
              </p>
              
              <Button onClick={openSSOLink} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg" data-testid="button-visit-website">
                <Globe className="w-5 h-5 mr-2" />
                Booqo barbaarintasan.com
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              
              <p className="text-gray-500 text-xs text-center">
                Websaydhka waxaad ka heli doontaa dhammaan koorsooyinka iyo casharada
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <Link href="/courses">
            <Button variant="outline" className="rounded-full px-6" data-testid="button-view-free-lessons">
              📚 Arag Casharada Bilaashka ah
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
