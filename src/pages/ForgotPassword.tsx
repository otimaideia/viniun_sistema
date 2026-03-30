import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantDetection } from "@/hooks/multitenant/useTenantDetection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, ArrowLeft, CheckCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  // Tenant detection para branding
  const { tenant, isLoading: isDetecting } = useTenantDetection();

  // Buscar branding do tenant
  const [branding, setBranding] = useState<{
    logo_url?: string;
    cor_primaria?: string;
  } | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      supabase
        .from('mt_tenant_branding')
        .select('logo_url, cor_primaria')
        .eq('tenant_id', tenant.id)
        .single()
        .then(({ data }) => {
          if (data) setBranding(data);
        });
    }
  }, [tenant?.id]);

  // Aplicar cores do tenant detectado
  useEffect(() => {
    if (branding?.cor_primaria) {
      document.documentElement.style.setProperty('--color-primary', branding.cor_primaria);
    }
  }, [branding]);

  const currentLogo = branding?.logo_url;
  const tenantName = tenant?.nome_fantasia || "Sistema";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Preencha o email");
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(email);
    
    if (result.success) {
      setEmailSent(true);
      toast.success("Email enviado com sucesso!");
    } else {
      toast.error(result.error || "Erro ao enviar email");
    }
    
    setIsLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center px-4 py-8 sm:p-6">
        <Card className="w-full max-w-sm sm:max-w-md border-border/50 shadow-card animate-fade-in">
          <CardHeader className="space-y-3 sm:space-y-4 text-center px-4 sm:px-6 pt-6 sm:pt-8">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Email Enviado!</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-2">
                  Enviamos um link de recuperação para <strong>{email}</strong>. 
                  Verifique sua caixa de entrada e spam.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
            <Link to="/login">
              <Button variant="outline" className="w-full h-10 sm:h-11 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background flex items-center justify-center px-4 py-8 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md border-border/50 shadow-card animate-fade-in">
        <CardHeader className="space-y-3 sm:space-y-4 text-center px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            {isDetecting ? (
              <div className="h-12 sm:h-16 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : currentLogo ? (
              <img
                src={currentLogo}
                alt={tenantName}
                className="h-12 sm:h-16 object-contain"
              />
            ) : (
              <div className="h-12 sm:h-16 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg sm:text-xl">Esqueceu a Senha?</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Digite seu email para receber um link de recuperação
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar Link
                </span>
              )}
            </Button>
          </form>
          
          <div className="mt-4 sm:mt-6 text-center">
            <Link to="/login" className="text-xs sm:text-sm text-primary hover:underline font-medium inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Voltar ao Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
