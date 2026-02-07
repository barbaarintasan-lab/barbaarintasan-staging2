import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, CheckCircle2, XCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logoImage from "@assets/NEW_LOGO-BSU_1_1768990258338.png";

export default function ResetPassword() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-reset-token/${token}`);
        const data = await response.json();
        setIsValidToken(data.valid === true);
      } catch (error) {
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setIsValidating(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("auth.resetPasswordError"));
      }

      setIsSubmitted(true);
      toast.success(t("auth.passwordResetSuccess"));
    } catch (error: any) {
      toast.error(error.message || t("auth.resetPasswordError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t("auth.validatingLink")}</p>
        </div>
      </div>
    );
  }

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
              <h1 className="font-bold text-white text-lg">{t("auth.resetPassword")}</h1>
              <p className="text-blue-100 text-sm">{t("home.academyName")}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-8">
        <Card className="max-w-md mx-auto border-none shadow-xl">
          <CardContent className="p-6">
            {!isValidToken ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {t("auth.invalidLink")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("auth.invalidLinkDescription")}
                </p>
                <Link href="/forgot-password">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-request-new">
                    {t("auth.requestNewLink")}
                  </Button>
                </Link>
              </div>
            ) : isSubmitted ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {t("auth.passwordResetComplete")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t("auth.passwordResetCompleteDescription")}
                </p>
                <Link href="/register">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-login">
                    {t("auth.loginNow")}
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
                    {t("auth.createNewPassword")}
                  </h2>
                  <p className="text-gray-600">
                    {t("auth.createNewPasswordPrompt")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="password">{t("auth.newPassword")}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("auth.passwordPlaceholder")}
                        required
                        minLength={6}
                        className="pr-10"
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("auth.confirmPasswordPlaceholder")}
                        required
                        minLength={6}
                        className="pr-10"
                        data-testid="input-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        data-testid="button-toggle-confirm-password"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
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
                        {t("auth.saving")}
                      </>
                    ) : (
                      t("auth.saveNewPassword")
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
