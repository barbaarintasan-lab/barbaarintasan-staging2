import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function TermsConditions() {
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
            Terms & Conditions / Shuruudaha & Xaaladdaha
          </h1>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto prose prose-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* English Version */}
          <div className="border-b md:border-b-0 md:border-r md:pr-8 pb-8 md:pb-0">
            <h2 className="text-xl font-bold mb-4 text-blue-800 underline decoration-blue-200 underline-offset-8">English Version</h2>
            <p className="text-gray-500 text-xs mb-6 font-mono uppercase tracking-wider">Effective Date: January 2026</p>
            
            <div className="space-y-6 text-gray-800 leading-relaxed">
              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">1. Eligibility</h3>
                <p>This application is intended exclusively for adults (18+) who are parents or legal guardians. Children are strictly prohibited from creating accounts, accessing the app, or using any feature of the platform.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">2. Purpose of the Platform</h3>
                <p>The platform is operated by an EU-registered nonprofit organization whose mission is to:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Educate parents on modern parenting and child development</li>
                  <li>Promote positive family and community values</li>
                  <li>Prevent youth marginalization, social harm, and negative behavioral outcomes</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">3. User Conduct</h3>
                <p>Users must not:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Post or transmit hate speech, discrimination, harassment, abuse, or threats</li>
                  <li>Promote violence, extremism, or harmful ideologies</li>
                  <li>Share sensitive or personal data, especially relating to children</li>
                  <li>Use insulting, defamatory, or socially harmful language</li>
                </ul>
                <p className="font-bold text-red-600 mt-4 p-3 bg-red-50 rounded-xl border border-red-100 italic text-center text-sm shadow-sm">
                  A zero-tolerance policy applies to violations of these rules.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">4. Live Audio Chat Rooms (“Sheeko”)</h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Live audio rooms are moderated and restricted to verified parent accounts only</li>
                  <li>Moderators may mute, remove, or permanently ban users at their discretion</li>
                  <li>Users acknowledge that live content may be monitored or reviewed for safety, moderation, and legal compliance</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">5. Messenger (Parent-to-Parent)</h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Messenger is intended solely for constructive and respectful communication between parents</li>
                  <li>Users may block or report other users at any time</li>
                  <li>Sharing sensitive data relating to children is strictly prohibited</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">6. Enforcement</h3>
                <p>Violation of these Terms may result in:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Content removal</li>
                  <li>Temporary account suspension</li>
                  <li>Permanent account termination</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">7. Limitation of Liability</h3>
                <p>The organization is not responsible for user-generated content but will act promptly and in accordance with EU law upon receiving reports of violations.</p>
              </section>
            </div>
          </div>

          {/* Somali Version */}
          <div className="md:pl-8">
            <h2 className="text-xl font-bold mb-4 text-blue-800 underline decoration-blue-200 underline-offset-8">Nuqulka Af-Soomaaliga</h2>
            <p className="text-gray-500 text-xs mb-6 font-mono uppercase tracking-wider">Taariikhda Dhaqan-galka: Janaayo 2026</p>

            <div className="space-y-6 text-gray-800 leading-relaxed">
              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">1. Qofka U Qalma</h3>
                <p>App-kan waxaa si gaar ah loogu talagalay dadka waaweyn (18+) ee ah waalidiin ama masuuliyiin sharci ah.</p>
                <p className="mt-2 font-medium">Carruurta si adag ayaa looga mamnuucay inay:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Sameeyaan akoon</li>
                  <li>Galaan app-ka</li>
                  <li>Ama isticmaalaan wax kasta oo ka mid ah adeegyada</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">2. Ujeeddada Platform-ka</h3>
                <p>Platform-kan waxaa maamula urur aan faa’iido doon ahayn oo ka diiwaangashan Midowga Yurub (EU), ujeeddadiisuna tahay:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>In waalidiinta lagu baro barbaarinta casriga ah iyo horumarka carruurta</li>
                  <li>In la dhiirrigeliyo qiyamka qoys iyo bulsho ee wanaagsan</li>
                  <li>In laga hortago xumaanta, faquuqa, iyo dhibaatooyinka dhalinyarada</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">3. Hab-dhaqanka Isticmaalaha</h3>
                <p>Isticmaalayaashu waa ka mamnuuc:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Faafinta hadal nacayb, takoor, dhibaatayn, xadgudub, ama hanjabaad</li>
                  <li>Dhiirrigelinta rabshad ama fikrado waxyeello leh</li>
                  <li>Wadaagidda xog xasaasi ah, gaar ahaan mid la xiriirta carruurta</li>
                  <li>Isticmaalka luuqad cay, aflagaaddo, ama waxyeello bulsho keeni karta</li>
                </ul>
                <p className="font-bold text-red-600 mt-4 p-3 bg-red-50 rounded-xl border border-red-100 italic text-center text-sm shadow-sm">
                  Waxaa la adeegsadaa siyaasad aan waxba loo dulqaadan (zero tolerance).
                </p>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">4. Qolalka Codka (“Sheeko”)</h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Qolalka codku waa kuwo la maamulo oo u gaar ah waalidiinta la hubiyey</li>
                  <li>Maamulayaashu waxay xaq u leeyihiin inay aamusiiyaan, ka saaraan, ama gebi ahaanba mamnuucaan isticmaalaha</li>
                  <li>Nuxurka wada hadalka waxaa dib loo eegi karaa ammaan iyo u hoggaansanaan sharci awgeed</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">5. Messenger (Waalid-ilaa-Waalid)</h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Messenger-ku wuxuu u talagalay isgaarsiin dhisan oo ixtiraam ku dhisan</li>
                  <li>Isticmaaluhu wuu xiri karaa ama warbixin ka bixin karaa qof kale</li>
                  <li>Wadaagidda xog la xiriirta carruurta waa mamnuuc</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">6. Ciqaabta</h3>
                <p>Ku xadgudubka shuruudahan wuxuu keeni karaa:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Tirtiridda nuxurka</li>
                  <li>Joojin ku-meel-gaar ah</li>
                  <li>Ama tirtirid joogto ah oo akoonka ah</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">7. Xaddidaadda Mas’uuliyadda</h3>
                <p>Hay’addu mas’uul kama aha nuxurka ay abuuraan isticmaalayaashu, balse waxay si degdeg ah ula tacaali doontaa cabashooyinka, iyadoo u hoggaansamaysa shuruucda Midowga Yurub.</p>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/privacy-policy" className="text-indigo-600 font-semibold hover:underline bg-indigo-50 px-4 py-2 rounded-full transition-colors">Privacy Policy / Siyaasadda Asturnaanta</Link>
          <Link href="/community-guidelines" className="text-indigo-600 font-semibold hover:underline bg-indigo-50 px-4 py-2 rounded-full transition-colors">Community Guidelines / Hagaha Bulshada</Link>
        </div>
      </div>
    </div>
  );
}
