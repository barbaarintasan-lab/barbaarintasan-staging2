import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
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
            Privacy Policy / Siyaasadda Asturnaanta
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
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">1. Data Controller</h3>
                <p>This application is operated by an EU-based nonprofit organization, which acts as the Data Controller in accordance with the General Data Protection Regulation (GDPR).</p>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">2. Data We Collect</h3>
                <p>We may collect and process the following categories of data:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Account information (such as name and email address)</li>
                  <li>Usage data (interaction with app features)</li>
                  <li>Communication metadata (excluding message content, unless reported or legally required)</li>
                  <li>Device and technical data (for security, fraud prevention, and system integrity)</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">3. Purpose of Processing</h3>
                <p>Personal data is processed to:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Provide and maintain app functionality</li>
                  <li>Ensure user safety, moderation, and abuse prevention</li>
                  <li>Comply with legal and regulatory obligations</li>
                  <li>Improve and optimize user experience</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">4. Legal Basis for Processing (GDPR Article 6)</h3>
                <p>We process personal data based on:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>User consent</li>
                  <li>Legitimate interests (platform safety, moderation, and service improvement)</li>
                  <li>Compliance with legal obligations</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">5. Data Protection & Retention</h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>We apply data minimization principles and appropriate technical and organizational security measures</li>
                  <li>Personal data is retained only for as long as necessary to fulfill the purposes outlined in this policy or as required by law</li>
                  <li>We do not sell or trade personal data to third parties</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">6. User Rights</h3>
                <p>Under GDPR, you have the right to:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Access your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Restrict or object to certain processing</li>
                  <li>Withdraw consent at any time</li>
                  <li>Lodge a complaint with a relevant EU data protection authority</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">7. Children’s Privacy</h3>
                <p>This application is not intended for children. We do not knowingly collect personal data from children, and any suspected child account will be promptly removed.</p>
              </section>
            </div>
          </div>

          {/* Somali Version */}
          <div className="md:pl-8">
            <h2 className="text-xl font-bold mb-4 text-blue-800 underline decoration-blue-200 underline-offset-8">Nuqulka Af-Soomaaliga</h2>
            <p className="text-gray-500 text-xs mb-6 font-mono uppercase tracking-wider">Taariikhda Dhaqan-galka: Janaayo 2026</p>

            <div className="space-y-6 text-gray-800 leading-relaxed">
              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">1. Xog-haye (Data Controller)</h3>
                <p>App-kan waxaa maamula hay’ad aan faa’iido doon ahayn oo ka diiwaangashan Midowga Yurub (EU), taas oo ah xog-hayaha masuulka ka ah xogta sida uu qabo xeerka GDPR.</p>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">2. Xogta Aan Ururinno</h3>
                <p>Waxaan ururin karnaa noocyadan xogta ah:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Macluumaadka akoonka (sida magaca iyo email-ka)</li>
                  <li>Xogta isticmaalka app-ka (isticmaalka adeegyada)</li>
                  <li>Metadata-da isgaarsiinta (ma aha nuxurka farriimaha, marka laga reebo haddii laga soo warbixiyo ama sharci dalbado)</li>
                  <li>Xog farsamo iyo qalab (amniga iyo ilaalinta nidaamka)</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">3. Ujeeddada Habaynta Xogta</h3>
                <p>Xogta shakhsiga ah waxaa loo adeegsadaa:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Bixinta iyo joogteynta adeegyada app-ka</li>
                  <li>Sugidda amniga, maareynta xadgudubyada, iyo dhexdhexaadinta</li>
                  <li>U hoggaansanaanta shuruucda iyo waajibaadka sharci</li>
                  <li>Horumarinta khibradda isticmaalaha</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">4. Saldhigga Sharciga (GDPR Qodobka 6)</h3>
                <p>Habaynta xogta waxay ku salaysan tahay:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Ogolaanshaha isticmaalaha</li>
                  <li>Dan sharci ah (amniga iyo maamulka platform-ka)</li>
                  <li>U hoggaansanaanta sharciga</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">5. Ilaalinta iyo Kaydinta Xogta</h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Waxaan raacnaa mabda’a xaddidaadda xogta (data minimization)</li>
                  <li>Xogta waxaa lagu kaydiyaa si ammaan ah</li>
                  <li>Xogta waxaa la hayaa kaliya muddada loo baahan yahay ama sida uu sharcigu qabo</li>
                  <li>Ma iibinno mana ganacsanno xogta shakhsiga ah</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">6. Xuquuqda Isticmaalaha</h3>
                <p>Sida uu qabo GDPR, waxaad xaq u leedahay:</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li>Inaad hesho xogtaada</li>
                  <li>Inaad saxdo xog khaldan</li>
                  <li>Inaad codsato tirtirid xog</li>
                  <li>Inaad xaddido ama diido habaynta qaarkeed</li>
                  <li>Inaad ka noqoto ogolaanshaha wakhti kasta</li>
                  <li>Inaad cabasho u gudbiso hay’adda ilaalinta xogta ee EU</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-lg border-b border-gray-100 pb-1 mb-2 text-gray-900">7. Asturnaanta Carruurta</h3>
                <p>App-kan looguma talagelin carruurta. Ma ururinno xog carruur, akoon kasta oo lagu tuhmo ilmo si degdeg ah ayaa looga saarayaa.</p>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/terms" className="text-indigo-600 font-semibold hover:underline bg-indigo-50 px-4 py-2 rounded-full transition-colors">Terms & Conditions / Shuruudaha & Xaaladdaha</Link>
          <Link href="/community-guidelines" className="text-indigo-600 font-semibold hover:underline bg-indigo-50 px-4 py-2 rounded-full transition-colors">Community Guidelines / Hagaha Bulshada</Link>
        </div>
      </div>
    </div>
  );
}
