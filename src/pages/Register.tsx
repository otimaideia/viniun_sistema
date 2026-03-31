import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantDetection, useAllTenants } from "@/hooks/multitenant/useTenantDetection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2, Building2, ShieldCheck, Users, User, Crown, Briefcase, Target, Headphones, MessageCircle, Megaphone, ClipboardCheck, Sparkles, Scissors, Store, AlertCircle, Building } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/types/user";
import type { Tenant } from "@/types/multitenant";

interface Franchise {
  id: string;
  codigo: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
}

interface RoleOption {
  value: AppRole;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const roleOptions: RoleOption[] = [
  {
    value: "consultora_vendas",
    label: "Consultora de Vendas",
    description: "Atendimento ao cliente via WhatsApp e agendamentos",
    icon: <Headphones className="h-4 w-4" />,
  },
  {
    value: "sdr",
    label: "SDR (Pré-vendas)",
    description: "Prospecção e qualificação de leads",
    icon: <Target className="h-4 w-4" />,
  },
  {
    value: "avaliadora",
    label: "Avaliadora",
    description: "Realiza avaliações técnicas e consultas",
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    value: "aplicadora",
    label: "Aplicadora",
    description: "Profissional que realiza serviços (acesso à própria agenda)",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    value: "esteticista",
    label: "Esteticista",
    description: "Profissional especializado (acesso à própria agenda)",
    icon: <Scissors className="h-4 w-4" />,
  },
  {
    value: "unidade",
    label: "Colaborador da Unidade",
    description: "Visualização de leads e agendamentos da franquia",
    icon: <User className="h-4 w-4" />,
  },
  {
    value: "gerente",
    label: "Gerente",
    description: "Gerencia a equipe e operação da unidade",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    value: "marketing",
    label: "Marketing",
    description: "Campanhas, influenciadoras e formulários",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    value: "central",
    label: "Central de Atendimento",
    description: "Visualiza e direciona leads de todas as unidades",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    value: "franqueado",
    label: "Franqueado",
    description: "Dono/gestor da franquia",
    icon: <Store className="h-4 w-4" />,
  },
  {
    value: "admin",
    label: "Administrador",
    description: "Acesso total à franquia",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    value: "diretoria",
    label: "Diretoria",
    description: "Diretoria regional com acesso total",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "super_admin",
    label: "Super Administrador",
    description: "Acesso total a todas as franquias",
    icon: <Crown className="h-4 w-4" />,
  },
];

const Register = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [franchiseId, setFranchiseId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("consultora_vendas");
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoadingFranchises, setIsLoadingFranchises] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Estado para seleção manual de tenant
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Verificar se está em modo admin (seleção manual de empresa)
  const isAdminMode = searchParams.get("admin") === "1" || searchParams.get("select") === "1";

  // Tenant detection automática
  const { tenant: detectedTenant, isLoading: isDetecting, detectionMethod } = useTenantDetection();

  // Lista de todos os tenants (apenas para modo admin)
  const { tenants: allTenants, isLoading: isLoadingTenants } = useAllTenants();

  // Verificar se o tenant foi detectado explicitamente (não via fallback)
  const tenantDetectedExplicitly = detectionMethod !== "default" || searchParams.get("tenant");

  // Tenant efetivo:
  // - Em modo admin: usa o selecionado manualmente
  // - Se detectado explicitamente: usa o detectado
  // - Caso contrário: null (vai bloquear)
  const effectiveTenant = isAdminMode
    ? (selectedTenant || null)
    : (tenantDetectedExplicitly ? detectedTenant : null);

  // Mostrar seletor de empresa APENAS em modo admin
  const showTenantSelector = isAdminMode;

  // Buscar branding do tenant
  const [branding, setBranding] = useState<{
    logo_url?: string;
    texto_login_titulo?: string;
    texto_login_subtitulo?: string;
    cor_primaria?: string;
  } | null>(null);

  useEffect(() => {
    if (effectiveTenant?.id) {
      supabase
        .from('mt_tenant_branding')
        .select('logo_url, texto_login_titulo, texto_login_subtitulo, cor_primaria')
        .eq('tenant_id', effectiveTenant.id)
        .single()
        .then(({ data }) => {
          if (data) setBranding(data);
        });
    }
  }, [effectiveTenant?.id]);

  // Aplicar cores do tenant
  useEffect(() => {
    if (branding?.cor_primaria) {
      document.documentElement.style.setProperty('--color-primary', branding.cor_primaria);
    }
  }, [branding]);

  // Quando selecionar um tenant manualmente, buscar dados completos
  useEffect(() => {
    if (selectedTenantId && allTenants.length > 0) {
      const tenant = allTenants.find(t => t.id === selectedTenantId);
      setSelectedTenant(tenant || null);
      // Limpar franquia selecionada ao trocar de empresa
      setFranchiseId("");
    }
  }, [selectedTenantId, allTenants]);

  const currentLogo = branding?.logo_url;
  const tenantName = effectiveTenant?.nome_fantasia || "Sistema";

  // Carrega a lista de franquias do tenant efetivo
  useEffect(() => {
    const fetchFranchises = async () => {
      if (!effectiveTenant?.id) {
        setIsLoadingFranchises(false);
        setFranchises([]);
        return;
      }

      setIsLoadingFranchises(true);
      try {
        const { data, error } = await supabase
          .from("mt_franchises")
          .select("id, codigo, nome, cidade, estado")
          .eq("tenant_id", effectiveTenant.id)
          .eq("is_active", true)
          .order("nome", { ascending: true });

        if (error) throw error;
        setFranchises(data || []);
      } catch (error) {
        console.error("Erro ao carregar franquias:", error);
        toast.error("Erro ao carregar unidades");
      } finally {
        setIsLoadingFranchises(false);
      }
    };

    fetchFranchises();
  }, [effectiveTenant?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!effectiveTenant?.id) {
      toast.error("Erro: Empresa não identificada. Selecione uma empresa.");
      return;
    }

    if (!email.trim() || !password || !confirmPassword) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!franchiseId) {
      toast.error("Selecione sua unidade");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setIsLoading(true);

    const result = await register(email, password, name, effectiveTenant.id, franchiseId, selectedRole);

    if (result.success) {
      toast.success("Conta criada! Aguarde a aprovação do administrador.");
      navigate("/aguardando-aprovacao");
    } else {
      toast.error(result.error || "Erro ao criar conta");
    }

    setIsLoading(false);
  };

  // Se não detectou tenant e não está em modo admin, mostrar orientação
  if (!isDetecting && !effectiveTenant && !showTenantSelector) {
    return (
      <div className="min-h-svh bg-background flex items-center justify-center px-4 py-8 sm:p-6">
        <Card className="w-full max-w-sm sm:max-w-md border-border/50 shadow-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <CardTitle className="text-lg">Empresa não identificada</CardTitle>
            <CardDescription>
              Não foi possível identificar a empresa para registro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Para se cadastrar, acesse o link de registro fornecido pela sua empresa.
                Cada empresa tem seu próprio portal de cadastro.
              </AlertDescription>
            </Alert>
            <div className="text-center pt-4">
              <Link to="/login" className="text-sm text-primary hover:underline">
                Voltar para login
              </Link>
            </div>
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
              <CardTitle className="text-lg sm:text-xl">Criar Conta</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {showTenantSelector
                  ? "Selecione a empresa e preencha os dados"
                  : "Preencha os dados para se cadastrar"
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Seletor de Empresa (modo admin) */}
            {showTenantSelector && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="empresa" className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Empresa *
                </Label>
                <Select
                  value={selectedTenantId}
                  onValueChange={setSelectedTenantId}
                  disabled={isLoading || isLoadingTenants}
                >
                  <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                    <SelectValue placeholder={
                      isLoadingTenants ? "Carregando empresas..." : "Selecione a empresa"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {allTenants
                      .filter(t => t.is_active)
                      .map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{tenant.nome_fantasia}</span>
                            <span className="text-muted-foreground text-xs">
                              ({tenant.slug})
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione a empresa onde deseja se cadastrar
                </p>
              </div>
            )}

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="name" className="text-sm">Nome Completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="unidade" className="text-sm">Unidade *</Label>
              <Select
                value={franchiseId}
                onValueChange={setFranchiseId}
                disabled={isLoading || isLoadingFranchises || !effectiveTenant}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder={
                    !effectiveTenant ? "Selecione uma empresa primeiro" :
                    isLoadingFranchises ? "Carregando unidades..." :
                    franchises.length === 0 ? "Nenhuma unidade disponível" :
                    "Selecione sua unidade"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {franchises.map((franchise) => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{franchise.nome}</span>
                        {franchise.cidade && (
                          <span className="text-muted-foreground text-xs">
                            ({franchise.cidade}/{franchise.estado})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione a unidade onde você trabalha
                {effectiveTenant && !showTenantSelector && (
                  <span className="ml-1">({effectiveTenant.nome_fantasia})</span>
                )}
              </p>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="role" className="text-sm">Função *</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="Selecione sua função" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole && (
                <p className="text-xs text-muted-foreground">
                  {roleOptions.find(r => r.value === selectedRole)?.description}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-sm">Email *</Label>
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
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm">Senha *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2"
              disabled={isLoading || !effectiveTenant}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar Conta
                </span>
              )}
            </Button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Fazer login
              </Link>
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
