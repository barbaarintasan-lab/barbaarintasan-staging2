import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ExternalLink, Globe, Crown } from "lucide-react";
import { Link } from "wouter";
import { openSSOLink } from "@/lib/api";

export default function GoldenMembership() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Xubin Dahabi</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-12">
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Xubin Dahabi</h2>
              <p className="text-amber-100 text-sm">Ku hel dhammaan koorsooyinka</p>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-center leading-relaxed">
                Si aad Xubin Dahabi u noqoto oo dhammaan koorsooyinka u hesho, fadlan booqo websaydhkeena <span className="font-bold">barbaarintasan.com</span>
              </p>
              
              <Button onClick={openSSOLink} className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-lg" data-testid="button-visit-website">
                <Globe className="w-5 h-5 mr-2" />
                Booqo barbaarintasan.com
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              
              <p className="text-gray-500 text-xs text-center">
                Websaydhka waxaad ka heli kartaa macluumaad dheeraad ah oo dhammaan koorsooyinka ku barashid
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
