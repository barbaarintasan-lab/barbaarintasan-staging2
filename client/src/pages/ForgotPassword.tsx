import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ArrowLeft, Loader2, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logoImage from "@assets/NEW_LOGO-BSU_1_1768990258338.png";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("auth.forgotPasswordError"));
      }

      setIsSubmitted(true);
    } catch (error: any) {
      toast.error(error.message || t("auth.forgotPasswordError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 safe-top shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/register">
              <button className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" data-testid="button-back">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="font-bold text-white text-lg">{t("auth.forgotPassword")}</h1>
              <p className="text-blue-100 text-sm">{t("home.academyName")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-8">
        <Card className="max-w-md mx-auto border-none shadow-xl">
          <CardContent className="p-6">
            {isSubmitted ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {t("auth.checkEmail")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("auth.resetLinkSent")}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                  <Mail className="w-4 h-4" />
                  <span>{email}</span>
                </div>
                <Link href="/register">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("auth.backToLogin")}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-10 h-10 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {t("auth.forgotPassword")}
                  </h2>
                  <p className="text-gray-600">
                    {t("auth.forgotPasswordPrompt")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">{t("auth.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      required
                      className="mt-1"
                      data-testid="input-email"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                    data-testid="button-submit"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("auth.sending")}
                      </>
                    ) : (
                      t("auth.sendResetLink")
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/register">
                    <Button variant="ghost" className="text-blue-600" data-testid="button-back-to-login">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t("auth.backToLogin")}
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
