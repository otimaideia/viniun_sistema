import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantAuth } from "@/hooks/multitenant/useTenantAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogIn, Loader2, Building2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
// Logo removido - usa branding do tenant detectado
import type { Tenant } from "@/types/multitenant";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [showTenantSelector, setShowTenantSelector] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Hook de autenticação com tenant
  const {
    detectedTenant,
    detectedBranding,
    detectionMethod,
    isDetecting,
    isLoggingIn,
    error: tenantError,
    login: tenantLogin,
    loginWithTenant,
    clearError,
  } = useTenantAuth();

  // Logo e textos dinâmicos baseados no branding do tenant detectado
  const currentLogo = detectedBranding?.logo_url;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();
  const title = detectedBranding?.texto_login_titulo || `${greeting}!`;
  const subtitle = detectedBranding?.texto_login_subtitulo || "Que bom te ver por aqui — entre para continuar";
  const tenantName = detectedTenant?.nome_fantasia || "Sistema";

  // Cores do branding (usa primária do tenant ou mantém default do tema)
  const primaryColor = detectedBranding?.cor_primaria;

  // Redirecionar se já autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/leads/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Aplicar cores do tenant detectado
  useEffect(() => {
    if (detectedBranding?.cor_primaria) {
      document.documentElement.style.setProperty('--color-primary', detectedBranding.cor_primaria);
      if (detectedBranding.cor_primaria_hover) {
        document.documentElement.style.setProperty('--color-primary-hover', detectedBranding.cor_primaria_hover);
      }
    }
  }, [detectedBranding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email.trim() || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Se estiver mostrando seletor de tenant, usar loginWithTenant
    if (showTenantSelector && selectedTenantId) {
      const result = await loginWithTenant(email, password, selectedTenantId);

      if (result.success) {
        toast.success("Login realizado com sucesso!");
        navigate("/leads/dashboard");
      } else {
        toast.error(result.error || "Erro ao fazer login");
      }
      return;
    }

    // Login normal com tenant detectado
    const result = await tenantLogin(email, password);

    if (result.success) {
      toast.success("Login realizado com sucesso!");
      navigate("/leads/dashboard");
    } else if (result.requiresTenantSelection && result.availableTenants) {
      // Usuário tem acesso a múltiplos tenants
      setAvailableTenants(result.availableTenants);
      setShowTenantSelector(true);
      toast.info("Selecione a empresa para acessar");
    } else {
      // Mensagens de erro específicas
      const errorMsg = result.error || "Email ou senha incorretos";
      if (errorMsg.includes('desativada')) {
        toast.error("Sua conta foi desativada. Contate o administrador.");
      } else if (errorMsg.includes('não cadastrado') || errorMsg.includes('não encontrado')) {
        toast.error("Usuário não encontrado no sistema. Verifique seu email ou crie uma conta.");
      } else if (errorMsg.includes('Invalid login')) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error(errorMsg);
      }
    }
  };

  // Cancelar seleção de tenant
  const handleCancelTenantSelection = () => {
    setShowTenantSelector(false);
    setSelectedTenantId("");
    setAvailableTenants([]);
    setPassword("");
  };

  return (
    <AuthSplitLayout backHref="/" backLabel="Voltar para Home">
      <Card className="w-full border-border/50 shadow-card animate-fade-in">
        <CardHeader className="space-y-3 sm:space-y-4 text-left px-4 sm:px-6 pt-6 sm:pt-8">
          {isDetecting ? (
            <div className="h-12 flex items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentLogo ? (
            <img
              src={currentLogo}
              alt={tenantName}
              className="h-10 sm:h-12 object-contain self-start"
            />
          ) : null}
          <div className="space-y-1">
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-sm">{subtitle}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          {/* Alerta de erro */}
          {tenantError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{tenantError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Seletor de Tenant (quando usuário tem múltiplos acessos) */}
            {showTenantSelector && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="tenant" className="text-sm">Empresa</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger className="h-10 sm:h-11">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {tenant.nome_fantasia}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                disabled={isLoggingIn || isDetecting}
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <Link
                  to="/esqueci-senha"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-10 sm:h-11 text-sm sm:text-base pr-10"
                  disabled={isLoggingIn || isDetecting}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {showTenantSelector && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                  onClick={handleCancelTenantSelection}
                  disabled={isLoggingIn}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base mt-2"
                disabled={isLoggingIn || isDetecting || (showTenantSelector && !selectedTenantId)}
              >
                {isLoggingIn ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    {showTenantSelector ? "Acessar Empresa" : "Entrar"}
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link to="/registro" className="text-primary hover:underline font-medium">
                Criar conta
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <details className="group mt-6 text-center">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors list-none">
          <span className="inline-flex items-center gap-1">
            Outro tipo de acesso?
            <span className="text-primary group-open:hidden">Ver opções</span>
            <span className="text-primary hidden group-open:inline">Ocultar</span>
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs">
          <Link to="/corretor/login" className="text-muted-foreground hover:text-primary transition-colors">
            Corretor
          </Link>
          <span className="text-border">•</span>
          <Link to="/parceiro/login" className="text-muted-foreground hover:text-primary transition-colors">
            Parceiro
          </Link>
          <span className="text-border">•</span>
          <Link to="/influenciadores/login" className="text-muted-foreground hover:text-primary transition-colors">
            Influenciador(a)
          </Link>
          <span className="text-border">•</span>
          <Link to="/cliente-imovel/login" className="text-muted-foreground hover:text-primary transition-colors">
            Cliente
          </Link>
        </div>
      </details>
    </AuthSplitLayout>
  );
};

export default Login;
