import { ArrowLeft, Shield, Ban, Users, Scale, FileCheck } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function CommunityGuidelines() {
  const { i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Link href="/">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-xl font-bold">
            Community Guidelines / Hagaha Bulshada
          </h1>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* English Version */}
          <div className="border-b md:border-b-0 md:border-r md:pr-8 pb-8 md:pb-0 prose prose-sm">
            <h2 className="text-xl font-bold mb-4 text-blue-800 underline decoration-blue-200 underline-offset-8">English Version</h2>
            <p className="text-gray-500 text-xs mb-6 font-mono uppercase tracking-wider">Effective Date: January 2026</p>

            <div className="bg-indigo-50 p-6 rounded-2xl mb-8 border border-indigo-100">
              <h3 className="flex items-center gap-2 text-indigo-800 m-0 font-bold"><Shield className="w-6 h-6" /> Our Values</h3>
              <p className="text-indigo-700 mt-3 m-0 text-base leading-relaxed">
                We promote respect, constructive dialogue, positive parenting, and cultural understanding across all community spaces within the platform.
              </p>
            </div>

            <div className="space-y-6 text-gray-800 leading-relaxed">
              <section>
                <h3 className="flex items-center gap-2 text-red-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <Ban className="w-5 h-5" /> Prohibited Content
                </h3>
                <p className="font-medium text-sm mb-2">The following content is strictly prohibited:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Hate speech or discrimination</li>
                  <li>Harassment, bullying, or intimidation</li>
                  <li>Incitement to violence or harmful behavior</li>
                  <li>Abusive, degrading, or defamatory language</li>
                  <li>Harmful, misleading, or unsafe parenting advice</li>
                </ul>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-blue-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <Users className="w-5 h-5" /> Moderation & Enforcement
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Content may be moderated proactively or reactively to ensure platform safety</li>
                  <li>Users may report violations using in-app reporting tools</li>
                  <li>Moderation actions may include content removal, muting, suspension, or permanent account termination</li>
                  <li>Moderation decisions are applied consistently, proportionately, and transparently</li>
                </ul>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-purple-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <Scale className="w-5 h-5" /> Appeals & Fair Process
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Users may request a review of moderation decisions through available support channels</li>
                  <li>Appeals are assessed fairly and in accordance with applicable EU laws</li>
                </ul>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <FileCheck className="w-5 h-5" /> Legal Compliance
                </h3>
                <p>
                  All moderation practices are conducted in strict compliance with the EU Digital Services Act (DSA) and other applicable regulations.
                </p>
              </section>
            </div>
          </div>

          {/* Somali Version */}
          <div className="md:pl-8 prose prose-sm">
            <h2 className="text-xl font-bold mb-4 text-blue-800 underline decoration-blue-200 underline-offset-8">Nuqulka Af-Soomaaliga</h2>
            <p className="text-gray-500 text-xs mb-6 font-mono uppercase tracking-wider">Taariikhda Dhaqan-galka: Janaayo 2026</p>

            <div className="bg-indigo-50 p-6 rounded-2xl mb-8 border border-indigo-100">
              <h3 className="flex items-center gap-2 text-indigo-800 m-0 font-bold"><Shield className="w-6 h-6" /> Qiyamka Bulshada</h3>
              <p className="text-indigo-700 mt-3 m-0 text-base leading-relaxed">
                Waxaan dhiirrigelinaynaa ixtiraamka, wada-hadal dhisan, barbaarin wanaagsan, iyo isfaham dhaqan dhammaan meelaha wada-xiriirka ee app-ka.
              </p>
            </div>

            <div className="space-y-6 text-gray-800 leading-relaxed">
              <section>
                <h3 className="flex items-center gap-2 text-red-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <Ban className="w-5 h-5" /> Nuxurka Mamnuuca Ah
                </h3>
                <p className="font-medium text-sm mb-2">Waxyaabahan soo socda waa mamnuuc:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Hadal nacayb ama takoor</li>
                  <li>Dhibaatayn, xoogsheegasho, ama cabsi-gelin</li>
                  <li>Kicinta rabshad ama dabeecad waxyeello leh</li>
                  <li>Luuqad aflagaado, bahdilaad, ama sumcad-dil</li>
                  <li>Talooyin barbaarineed oo khaldan ama khatar ah</li>
                </ul>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-blue-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <Users className="w-5 h-5" /> Maamulka & Ciqaabta
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Nuxurka waxaa loo maamuli karaa si firfircoon ama si falcelin ah si loo sugo badqabka bulshada</li>
                  <li>Isticmaalayaashu waxay ka warbixin karaan xadgudubyada iyagoo adeegsanaya qalabka warbixinta ee app-ka</li>
                  <li>Tallaabooyinka maamulka waxaa ka mid noqon kara tirtirid nuxur, aamusin, joojin, ama mamnuucid joogto ah oo akoonka ah</li>
                  <li>Go’aannada waxaa loo qaataa si caddaalad, isku mid ah, oo hufan</li>
                </ul>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-purple-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <Scale className="w-5 h-5" /> Dib-u-eegis & Racfaan
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Isticmaaluhu wuxuu codsan karaa dib-u-eegis go’aanka maamulka</li>
                  <li>Racfaannada waxaa loo eegaa si caddaalad ah, iyadoo la raacayo shuruucda Midowga Yurub</li>
                </ul>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-green-700 font-bold text-lg border-b border-gray-100 pb-1 mb-2">
                  <FileCheck className="w-5 h-5" /> U Hoggaansanaanta Sharciga
                </h3>
                <p>
                  Dhammaan hababka maamulka waxaa lagu fulinayaa si waafaqsan Xeerka Adeegyada Dijitaalka ah ee Midowga Yurub (DSA) iyo shuruuc kale oo khuseeya.
                </p>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/terms" className="text-indigo-600 font-semibold hover:underline bg-indigo-50 px-4 py-2 rounded-full transition-colors">Terms & Conditions / Shuruudaha & Xaaladdaha</Link>
          <Link href="/privacy-policy" className="text-indigo-600 font-semibold hover:underline bg-indigo-50 px-4 py-2 rounded-full transition-colors">Privacy Policy / Siyaasadda Asturnaanta</Link>
        </div>
      </div>
    </div>
  );
}
