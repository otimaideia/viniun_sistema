import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantDetection } from "@/hooks/multitenant/useTenantDetection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, Mail, Building2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PendingApproval = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-svh bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-border/50 shadow-card animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="flex flex-col items-center gap-4">
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
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl">Aguardando Aprovação</CardTitle>
            <CardDescription className="mt-2">
              Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador antes de acessar o sistema.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Você receberá uma notificação quando sua conta for aprovada. 
            Entre em contato com o administrador se precisar de acesso urgente.
          </p>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
