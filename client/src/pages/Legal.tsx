import { useState } from "react";
import { ArrowLeft, FileText, Shield, Users, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type Language = "en" | "so";

const content = {
  en: {
    title: "Legal Information",
    subtitle: "Terms & Conditions – Privacy Policy – Community Guidelines",
    effectiveDate: "Effective Date: January 2026",
    languageLabel: "Somali",
    tabs: {
      terms: "Terms",
      privacy: "Privacy",
      community: "Community",
    },
    terms: {
      title: "Terms & Conditions",
      sections: [
        {
          title: "1. Eligibility (Adults Only)",
          content: "This application is intended exclusively for adults (18+) who are parents or legal guardians. Children are strictly prohibited from creating accounts, accessing the app, or using any feature."
        },
        {
          title: "2. About the Platform",
          content: "This platform is operated by an EU-registered nonprofit organization. Its mission is to:\n\n• Educate parents on modern parenting and child development\n• Promote positive family and community values\n• Prevent youth marginalization and harmful social outcomes"
        },
        {
          title: "3. User Conduct & Community Standards",
          content: "Users must not:\n\n• Post or transmit hate speech, discrimination, harassment, abuse, or threats\n• Promote violence, extremism, or harmful ideologies\n• Share sensitive or personal data, especially relating to children\n• Use abusive, degrading, or defamatory language\n\nA zero-tolerance policy applies to violations."
        },
        {
          title: "4. Live Audio Chat Rooms (\"Sheeko\")",
          content: "• Live audio rooms are moderated and restricted to verified parent accounts only\n• Moderators may mute, remove, or permanently ban users\n• Users acknowledge that live content may be monitored or reviewed for safety, moderation, and legal compliance"
        },
        {
          title: "5. Messenger (Parent-to-Parent Communication)",
          content: "• Messenger is intended solely for constructive and respectful communication between parents\n• Users may block or report other users\n• Sharing sensitive data relating to children is strictly prohibited"
        },
        {
          title: "10. Limitation of Liability",
          content: "The organization is not responsible for user-generated content but will act promptly and in accordance with EU law upon receiving reports of violations."
        }
      ]
    },
    privacy: {
      title: "Privacy & Data Protection (GDPR)",
      sections: [
        {
          title: "6. Privacy & Data Protection",
          content: ""
        },
        {
          title: "Data Controller",
          content: "The app is operated by an EU-based nonprofit organization, acting as the Data Controller under GDPR."
        },
        {
          title: "Data We Collect",
          content: "• Account information (e.g. name, email)\n• Usage data (feature interaction)\n• Communication metadata (not message content unless reported or legally required)\n• Device and technical data (for security and system integrity)"
        },
        {
          title: "Purpose & Legal Basis",
          content: "Data is processed to:\n\n• Provide and maintain app functionality\n• Ensure safety, moderation, and abuse prevention\n• Comply with legal obligations\n• Improve user experience\n\nLegal bases include:\n\n• User consent\n• Legitimate interest (platform safety)\n• Legal compliance"
        },
        {
          title: "Data Retention & Security",
          content: "• Data is minimized and stored securely\n• Data is retained only as long as necessary or as required by law\n• Personal data is never sold or traded"
        },
        {
          title: "7. User Rights",
          content: "Under GDPR, users have the right to:\n\n• Access their personal data\n• Correct inaccurate data\n• Request deletion of data\n• Restrict or object to certain processing\n• Withdraw consent at any time\n• Lodge a complaint with an EU data protection authority"
        },
        {
          title: "8. Children's Privacy",
          content: "This application is not intended for children. Any suspected child account will be promptly removed."
        }
      ]
    },
    community: {
      title: "Community Guidelines",
      sections: [
        {
          title: "9. Moderation, Enforcement & Appeals",
          content: "• Content may be moderated proactively or reactively\n• Enforcement actions may include content removal, muting, suspension, or permanent account termination\n• Users may request a review of moderation decisions\n• All moderation practices comply with the EU Digital Services Act (DSA)"
        }
      ]
    }
  },
  so: {
    title: "Macluumaadka Sharciga",
    subtitle: "Shuruudaha & Xaaladaha – Siyaasadda Asturnaanta – Tilmaamaha Bulshada",
    effectiveDate: "Taariikhda Dhaqangalka: Janaayo 2026",
    languageLabel: "English",
    tabs: {
      terms: "Shuruudaha",
      privacy: "Asturnaanta",
      community: "Bulshada",
    },
    terms: {
      title: "Shuruudaha & Xaaladaha",
      sections: [
        {
          title: "1. U-Qalmitaanka (Dad Waaweyn Kaliya)",
          content: "App-kan waxaa si gaar ah loogu talagalay dadka waaweyn (18+) ee ah waalidiin ama masuuliyiin sharci ah. Carruurta si adag ayaa looga mamnuucay inay sameeyaan akoon, galaan app-ka, ama isticmaalaan adeeg kasta."
        },
        {
          title: "2. Ku Saabsan Platform-ka",
          content: "Platform-kan waxaa maamula urur aan faa'iido doon ahayn oo ka diiwaangashan Midowga Yurub (EU). Ujeeddooyinkiisu waa:\n\n• Baridda waalidiinta barbaarinta casriga ah\n• Dhiirrigelinta qiyamka qoys iyo bulsho ee wanaagsan\n• Ka hortagga xumaanta iyo dhibaatooyinka dhalinyarada"
        },
        {
          title: "3. Hab-dhaqanka & Xeerarka Bulshada",
          content: "Waa mamnuuc:\n\n• Hadal nacayb, takoor, dhibaatayn, xadgudub, ama hanjabaad\n• Dhiirrigelinta rabshad ama fikrado waxyeello leh\n• Wadaagidda xog xasaasi ah, gaar ahaan mid la xiriirta carruurta\n• Luuqad aflagaado, bahdilaad, ama sumcad-dil\n\nWaxaa la adeegsadaa siyaasad aan waxba loo dulqaadan."
        },
        {
          title: "4. Qolalka Codka (\"Sheeko\")",
          content: "• Qolalka codku waa kuwa la maamulo oo u gaar ah waalidiinta la hubiyey\n• Maamulayaashu way aamusin, ka saarid, ama mamnuuci karaan isticmaalaha\n• Wada-hadalka waxaa dib loo eegi karaa ammaan iyo u hoggaansanaan sharci awgeed"
        },
        {
          title: "5. Messenger (Waalid-ilaa-Waalid)",
          content: "• Waxaa loogu talagalay isgaarsiin dhisan oo ixtiraam ku salaysan\n• Isticmaaluhu wuu xiri karaa ama warbixin ka bixin karaa qof kale\n• Wadaagidda xog la xiriirta carruurta waa mamnuuc"
        },
        {
          title: "10. Xaddidaadda Mas'uuliyadda",
          content: "Hay'addu mas'uul kama aha nuxurka ay abuuraan isticmaalayaashu, balse waxay si degdeg ah ula tacaali doontaa cabashooyinka sida uu qabo sharciga EU."
        }
      ]
    },
    privacy: {
      title: "Asturnaanta & Ilaalinta Xogta (GDPR)",
      sections: [
        {
          title: "6. Asturnaanta & Ilaalinta Xogta",
          content: ""
        },
        {
          title: "Xog-haye",
          content: "App-kan waxaa maamula hay'ad EU ku diiwaangashan, taas oo ah xog-hayaha masuulka ka ah xogta."
        },
        {
          title: "Xogta Aan Ururinno",
          content: "• Macluumaadka akoonka\n• Xogta isticmaalka app-ka\n• Metadata-da isgaarsiinta (ma aha nuxurka farriimaha)\n• Xog farsamo oo amni la xiriirta"
        },
        {
          title: "Ujeeddo & Saldhig Sharci",
          content: "Xogta waxaa loo adeegsadaa:\n\n• Bixinta adeegyada\n• Sugidda amniga iyo maamulka\n• U hoggaansanaanta sharciga\n• Horumarinta app-ka"
        },
        {
          title: "Ilaalinta Xogta",
          content: "• Xogta waa la yareeyaa oo ammaan ahaan ayaa loo kaydiyaa\n• Xogta waxaa la kaydiyaa inta loo baahan yahay kaliya\n• Xogta shaqsiyeed marnaba lama iibiyo"
        },
        {
          title: "7. Xuquuqda Isticmaalaha",
          content: "Waxaad xaq u leedahay:\n\n• Helidda xogtaada\n• Saxidda xog khaldan\n• Tirtiridda xogta\n• Xaddididda ama diidmada habaynta qaarkeed\n• Ka noqoshada ogolaanshaha\n• Cabasho u gudbinta hay'ad EU ah"
        },
        {
          title: "8. Asturnaanta Carruurta",
          content: "App-kan looguma talagelin carruurta. Akoon kasta oo ilmo lagu tuhmo si degdeg ah ayaa loo tirtirayaa."
        }
      ]
    },
    community: {
      title: "Tilmaamaha Bulshada",
      sections: [
        {
          title: "9. Maamulka, Ciqaabta & Racfaanka",
          content: "• Nuxurka waa la maamuli karaa si firfircoon ama falcelin ah\n• Ciqaabtu waxay noqon kartaa tirtirid, joojin, ama mamnuucid joogto ah\n• Isticmaaluhu wuu codsan karaa dib-u-eegis\n• Dhammaan tallaabooyinka waxay waafaqsan yihiin Xeerka DSA ee EU"
        }
      ]
    }
  }
};

export default function Legal() {
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState<Language>("en");
  const [activeTab, setActiveTab] = useState("terms");
  
  const t = content[language];

  const renderSections = (sections: { title: string; content: string }[]) => (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <div key={index} className="space-y-2">
          <h3 className="font-semibold text-lg text-gray-900">{section.title}</h3>
          {section.content && (
            <p className="text-gray-600 whitespace-pre-line leading-relaxed">{section.content}</p>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-top">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.history.back()}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors" 
                data-testid="button-back-legal"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="font-bold text-gray-900 text-lg">{t.title}</h1>
                <p className="text-gray-500 text-xs">{t.effectiveDate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">{t.languageLabel}</span>
              <Switch
                checked={language === "so"}
                onCheckedChange={(checked) => setLanguage(checked ? "so" : "en")}
                data-testid="language-toggle"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-12 bg-gray-100 rounded-t-lg rounded-b-none">
                <TabsTrigger 
                  value="terms" 
                  className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  data-testid="tab-terms"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{t.tabs.terms}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="privacy" 
                  className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  data-testid="tab-privacy"
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{t.tabs.privacy}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="community" 
                  className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                  data-testid="tab-community"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{t.tabs.community}</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="p-6">
                <TabsContent value="terms" className="mt-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                    {t.terms.title}
                  </h2>
                  {renderSections(t.terms.sections)}
                </TabsContent>
                
                <TabsContent value="privacy" className="mt-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                    {t.privacy.title}
                  </h2>
                  {renderSections(t.privacy.sections)}
                </TabsContent>
                
                <TabsContent value="community" className="mt-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                    {t.community.title}
                  </h2>
                  {renderSections(t.community.sections)}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2026 Barbaarintasan Academy. All rights reserved.</p>
          <p className="mt-1">EU-registered nonprofit organization</p>
        </div>
      </div>
    </div>
  );
}
