import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Shield, Users, AlertTriangle, CheckCircle, Loader2, ArrowLeft, Globe } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

type Language = "so" | "en";

const content = {
  so: {
    headerTitle: "Shuruucda Baraha Waalidiinta",
    headerSubtitle: "Parent Community Terms & Conditions",
    languageLabel: "English",
    backButton: "Guriga",
    whatIsTitle: "Waa Maxay Baraha Waalidiinta?",
    whatIsDescription: "Baraha Waalidiinta waa goob ammaan ah oo waalidiintu ku wadaagaan waayo-aragnimadooda, su'aalaha ay qabaan, iyo taageerida ay is-siiyaan. Waa meel waalidiinta keliya loo sameeyay.",
    sections: [
      {
        number: "1",
        title: "Xeerarka Guud",
        color: "bg-orange-500",
        items: [
          "Baraha Waalidiinta waa goob waalidiinta keliya loo sameeyay.",
          "Dhammaan waxaad soo dhigtid waa in ay noqdaan kuwo wanaagsan oo aan wax yeellayn.",
          "Ixtiraam qof walba oo ka qeybgalaya bulshada.",
          "Ha faafinin macluumaad been ah ama waxyaabo khaldan.",
          "Ha daabicin wax uu yahay xayeysiis ama spam.",
        ],
      },
      {
        number: "2",
        title: "Waxyaabaha La Mamnuucay",
        titleEnglish: "(Strictly Prohibited)",
        color: "bg-red-500",
        isProhibited: true,
        items: [
          { bold: "Xadgudubka carruurta:", text: "Wax kasta oo carruurta u yeelan kara waxyeello jireed ama maskaxeed waa la mamnuucay oo si deg-deg ah ayaa loo tirtiraa." },
          { bold: "Sawirro ama muuqaalo aan haboonayn:", text: "Wax kasta oo galmo ama qaawan ah waa la mamnuucay." },
          { bold: "Nacayb iyo takoorka:", text: "Wax kasta oo ku salaysan jinsi, qoys, diin, ama asal waa la mamnuucay." },
          { bold: "Rabsho iyo hanjabaad:", text: "Wax kasta oo qof kale u hanjabaya ama rabsho dhiirrigelinaya." },
          { bold: "Macluumaadka shaqsiga:", text: "Ha wadaagin lambarro telefoon, ciwaanno, ama macluumaad kale oo shaqsi ah oo qof kale." },
        ],
      },
      {
        number: "3",
        title: "Badbaadada Carruurta",
        titleEnglish: "(Child Safety)",
        color: "bg-green-500",
        isSafety: true,
        items: [
          "Ha soo dhigin sawirro ama muuqaalo ay ku jiraan carruurta adiga kugu dhalin.",
          "Haddii aad soo dhigto sawir ilmahaaga, waa inaad hubtaa in aan loo aqoonsan karin.",
          "Ha wadaagin macluumaadka dugsiga, goobta, ama jadwalka ilmahaaga.",
          "Xadgudubka carruurta waxaa la warbixinayaa hay'adaha sharci-fulinta.",
        ],
      },
      {
        number: "4",
        title: "Habka La-socodka",
        titleEnglish: "(Content Moderation)",
        color: "bg-purple-500",
        items: [
          "Dhammaan waxa la soo dhigo waxaa hubinaya nidaamka AI iyo guruubka maamulka.",
          "Waxa ku xad-gudba shuruucdan waxaa la tirtiri karaa iyada oo aan lagu wargelinin.",
          "Xad-gudubyo joogto ah waxay keeni karaan in akoonkaaga la xiro.",
          "Xad-gudubyo culus oo sharci ah waxaa loo warbixin karaa booliska ama hay'adaha kale.",
        ],
      },
      {
        number: "5",
        title: "Warbixinta iyo Xirida",
        titleEnglish: "(Report & Block)",
        color: "bg-blue-500",
        items: [
          "Waxaad warbixin kartaa post kasta oo aad u aragto inuu ku xadgudbayo shuruucdan.",
          "Waxaad xiri kartaa (block) qof kasta oo aan rabin inaad aragto waxa uu soo dhigo.",
          "Maamulka ayaa eegi doona warbixinaha oo qaadi doona talaabo ku habboon.",
        ],
      },
      {
        number: "6",
        title: "Aqbalista Shuruucdan",
        color: "bg-gray-500",
        paragraph: "Marka aad riixdo \"Waan aqbalay\", waxaad aqbalaysaa dhammaan shuruucdaan oo waxaad ogolaatay inaad si mas'uul ah u isticmaasho Baraha Waalidiinta. Haddii aad ku xad-gudubtid shuruucdaan, akoonkaaga waa la xiri karaa.",
      },
    ],
    checkboxLabel: "Waan akhiriyay oo waan aqbalay Shuruucda Baraha Waalidiinta. Waan fahamsanahay in xad-gudubku keeni karo in akoonkayga la xiro.",
    acceptButton: "Waan Aqbalay - Sii Wad",
    loadingText: "Sugitaan...",
    footerText: "Aqbalista shuruucdaan waxay ku xifdi doontaa akoonkaaga. Waxaad dib u eegi kartaa shuruucdaan mar kasta oo aad doonto.",
    successMessage: "Waad ku mahadsan tahay! Hadda waad geli kartaa Baraha Waalidiinta.",
    errorMessage: "Khalad ayaa dhacay, fadlan isku day mar kale",
  },
  en: {
    headerTitle: "Parent Community Terms",
    headerSubtitle: "Terms & Conditions for Baraha Waalidiinta",
    languageLabel: "Somali",
    backButton: "Home",
    whatIsTitle: "What is Baraha Waalidiinta?",
    whatIsDescription: "Baraha Waalidiinta (Parent Community) is a safe space where parents share their experiences, ask questions, and support each other. It is a platform designed exclusively for parents.",
    sections: [
      {
        number: "1",
        title: "General Rules",
        color: "bg-orange-500",
        items: [
          "Baraha Waalidiinta is a platform exclusively for parents.",
          "All content you post must be constructive and non-harmful.",
          "Respect every member of the community.",
          "Do not spread false information or misleading content.",
          "Do not post advertisements or spam.",
        ],
      },
      {
        number: "2",
        title: "Strictly Prohibited",
        color: "bg-red-500",
        isProhibited: true,
        items: [
          { bold: "Child abuse:", text: "Any content that could cause physical or psychological harm to children is prohibited and will be immediately removed." },
          { bold: "Inappropriate images or videos:", text: "Any sexual or explicit content is strictly prohibited." },
          { bold: "Hate speech and discrimination:", text: "Content based on gender, family, religion, or origin is prohibited." },
          { bold: "Violence and threats:", text: "Any content threatening others or inciting violence." },
          { bold: "Personal information:", text: "Do not share phone numbers, addresses, or other personal information of others." },
        ],
      },
      {
        number: "3",
        title: "Child Safety",
        color: "bg-green-500",
        isSafety: true,
        items: [
          "Do not post photos or videos of children who are not your own.",
          "If you post a photo of your child, ensure they cannot be identified.",
          "Do not share your child's school, location, or schedule information.",
          "Child abuse will be reported to law enforcement authorities.",
        ],
      },
      {
        number: "4",
        title: "Content Moderation",
        color: "bg-purple-500",
        items: [
          "All posts are reviewed by AI systems and the moderation team.",
          "Violating content may be removed without prior notice.",
          "Repeated violations may result in account suspension.",
          "Serious legal violations may be reported to police or other authorities.",
        ],
      },
      {
        number: "5",
        title: "Report & Block",
        color: "bg-blue-500",
        items: [
          "You can report any post you believe violates these terms.",
          "You can block any user whose content you don't want to see.",
          "The moderation team will review reports and take appropriate action.",
        ],
      },
      {
        number: "6",
        title: "Acceptance of Terms",
        color: "bg-gray-500",
        paragraph: "By clicking \"I Accept\", you agree to all these terms and consent to use Baraha Waalidiinta responsibly. Violation of these terms may result in account suspension.",
      },
    ],
    checkboxLabel: "I have read and accept the Parent Community Terms. I understand that violations may result in account suspension.",
    acceptButton: "I Accept - Continue",
    loadingText: "Loading...",
    footerText: "Accepting these terms will be saved to your account. You can review these terms anytime.",
    successMessage: "Thank you! You can now access Baraha Waalidiinta.",
    errorMessage: "An error occurred, please try again",
  },
};

export default function ParentCommunityTerms() {
  const [, setLocation] = useLocation();
  const [accepted, setAccepted] = useState(false);
  const [language, setLanguage] = useState<Language>("so");
  const queryClient = useQueryClient();
  const t = content[language];

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/accept-community-terms", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/community-terms-status"], { hasAccepted: true });
      queryClient.invalidateQueries({ queryKey: ["parent-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community-terms-status"] });
      toast.success(t.successMessage);
      setLocation("/waalid/feed");
    },
    onError: (error: any) => {
      toast.error(error.message || t.errorMessage);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.backButton}
            </Button>
          </Link>
          
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{t.languageLabel}</span>
            <Switch
              checked={language === "en"}
              onCheckedChange={(checked) => setLanguage(checked ? "en" : "so")}
              data-testid="language-toggle"
            />
          </div>
        </div>

        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <CardTitle className="text-xl">{t.headerTitle}</CardTitle>
                <p className="text-orange-100 text-sm mt-1">
                  {t.headerSubtitle}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">{t.whatIsTitle}</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {t.whatIsDescription}
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4 mb-6">
              <div className="space-y-6 text-gray-700">
                {t.sections.map((section, idx) => (
                  <section key={idx}>
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span className={`w-6 h-6 ${section.color} text-white rounded-full flex items-center justify-center text-sm`}>
                        {section.number}
                      </span>
                      {section.title} {"titleEnglish" in section && section.titleEnglish && <span className="text-gray-500 font-normal text-sm">{section.titleEnglish}</span>}
                    </h2>
                    
                    {section.paragraph ? (
                      <p className="ml-8">{section.paragraph}</p>
                    ) : section.isProhibited ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 ml-4">
                        <ul className="space-y-2 text-red-800">
                          {(section.items as { bold: string; text: string }[]).map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span><strong>{item.bold}</strong> {item.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : section.isSafety ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 ml-4">
                        <ul className="space-y-2 text-green-800">
                          {(section.items as string[]).map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <ul className="space-y-2 ml-8 list-disc">
                        {(section.items as string[]).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-6">
              <div className="flex items-start gap-3 mb-6">
                <Checkbox
                  id="accept-terms"
                  checked={accepted}
                  onCheckedChange={(checked) => setAccepted(checked as boolean)}
                  className="mt-0.5"
                  data-testid="checkbox-accept-terms"
                />
                <label
                  htmlFor="accept-terms"
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  {t.checkboxLabel}
                </label>
              </div>

              <Button
                onClick={() => acceptTermsMutation.mutate()}
                disabled={!accepted || acceptTermsMutation.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg"
                data-testid="button-accept-continue"
              >
                {acceptTermsMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {t.loadingText}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {t.acceptButton}
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {t.footerText}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
