import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useInfluenciadoraIndicacoesAdapter } from "@/hooks/useInfluenciadoraIndicacoesAdapter";
import { useInfluencerContractsMT } from "@/hooks/multitenant/useInfluencerContractsMT";
import { useInfluencerPaymentsMT } from "@/hooks/multitenant/useInfluencerPaymentsMT";
import { useInfluencerPostsMT } from "@/hooks/multitenant/useInfluencerPostsMT";
import { useInfluencerLoginHistoryMT } from "@/hooks/multitenant/useInfluencerLoginHistoryMT";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Copy,
  ExternalLink,
  User,
  MapPin,
  Instagram,
  Share2,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Eye,
  Zap,
  Loader2,
  Send,
  Building2,
  CreditCard,
  Cake,
  Home,
  ShieldAlert,
  History,
  Monitor,
  Smartphone,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Influenciadora,
  getStatusLabel,
  getStatusColor,
  getTipoLabel,
  getTamanhoLabel,
  formatSeguidores,
  getPlataformaIcon,
  gerarLinkIndicacao,
} from "@/types/influenciadora";
import { formatPhoneDisplay } from "@/utils/phone";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeIndicacao } from "@/components/influenciadoras/QRCodeIndicacao";
import { safeGetInitials } from "@/utils/unicodeSanitizer";
import { getTermoInfluenciador, getAdjetivo } from "@/utils/genero";
import { useTenantContext } from "@/contexts/TenantContext";
import { differenceInYears } from "date-fns";

const formatCPF = (cpf: string) => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatCEP = (cep: string) => {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return cep;
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
};

const getGeneroLabel = (genero?: string | null) => {
  if (!genero) return null;
  const map: Record<string, string> = {
    feminino: 'Feminino',
    masculino: 'Masculino',
    nao_binario: 'Não-binário',
    outro: 'Outro',
    prefiro_nao_dizer: 'Prefere não dizer',
  };
  return map[genero] || genero;
};

const PLATAFORMA_ICONS: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "▶️",
  facebook: "👤",
  twitter: "🐦",
  kwai: "🎬",
  linkedin: "💼",
  pinterest: "📌",
};

const InfluenciadoraDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { getInfluenciadora } = useInfluenciadorasAdapter();
  const { indicacoes, metrics, isLoading: isLoadingIndicacoes } = useInfluenciadoraIndicacoesAdapter({
    influenciadoraId: id,
  });

  // Hooks MT para contratos, pagamentos e posts
  const { contracts, isLoading: isLoadingContracts } = useInfluencerContractsMT({ influencer_id: id });
  const { payments, stats: paymentStats, isLoading: isLoadingPayments } = useInfluencerPaymentsMT({ influencer_id: id });
  const { posts, stats: postStats, isLoading: isLoadingPosts } = useInfluencerPostsMT({ influencer_id: id });
  const { loginHistory, stats: loginStats, isLoading: isLoadingLoginHistory, parseUserAgent } = useInfluencerLoginHistoryMT(id);

  const { franchises } = useTenantContext();

  const [influenciadora, setInfluenciadora] = useState<Influenciadora | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Resolve franchise name
  const franchiseName = influenciadora?.franchise_id
    ? franchises.find(f => f.id === influenciadora.franchise_id)?.nome
      || franchises.find(f => f.id === influenciadora.franchise_id)?.nome_fantasia
      || null
    : null;

  useEffect(() => {
    if (id) {
      loadInfluenciadora(id);
    }
  }, [id]);

  const loadInfluenciadora = async (influenciadoraId: string) => {
    setIsLoading(true);
    try {
      const data = await getInfluenciadora(influenciadoraId);
      setInfluenciadora(data);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar influenciadora");
      navigate("/influenciadoras");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success("Código copiado!");
  };

  const handleCopyLink = (codigo: string) => {
    const link = gerarLinkIndicacao(codigo);
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const handleAtivar = async () => {
    if (!influenciadora || !id) return;
    setIsActivating(true);
    try {
      // 1. Marcar como ativa e aprovada
      const { error: updateError } = await supabase
        .from('mt_influencers')
        .update({ is_active: true, status: 'aprovado', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. Enviar boas-vindas por WhatsApp + Email
      const { error: fnError } = await supabase.functions.invoke('send-welcome', {
        body: {
          influenciadoraId: id,
          tenantId: influenciadora.tenant_id || '',
          portalUrl: `${window.location.origin}/influenciadores/login`,
        },
      });

      if (fnError) {
        console.warn('[Ativar] send-welcome retornou erro (não crítico):', fnError);
      }

      // 3. Atualizar estado local
      setInfluenciadora((prev) => prev ? { ...prev, ativo: true, status: 'aprovado' } : prev);
      const termo = getTermoInfluenciador(influenciadora?.genero);
      const adj = getAdjetivo('ativado', influenciadora?.genero);
      toast.success(`${termo} ${adj}! Boas-vindas enviadas por WhatsApp e email.`);
    } catch (err) {
      console.error('[Ativar] Erro:', err);
      toast.error(`Erro ao ativar ${getTermoInfluenciador(influenciadora?.genero).toLowerCase()}`);
    } finally {
      setIsActivating(false);
    }
  };

  const handleReenviarBoasVindas = async () => {
    if (!influenciadora || !id) return;
    setIsResending(true);
    try {
      const { error } = await supabase.functions.invoke('send-welcome', {
        body: {
          influenciadoraId: id,
          tenantId: influenciadora.tenant_id || '',
          portalUrl: `${window.location.origin}/influenciadores/login`,
        },
      });
      if (error) {
        toast.warning('Houve um erro ao reenviar a mensagem de boas-vindas.');
      } else {
        toast.success('Mensagem de boas-vindas reenviada por WhatsApp/email!');
      }
    } catch (err) {
      toast.error('Erro ao reenviar mensagem.');
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-1" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!influenciadora) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Registro não encontrado</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/influenciadoras">Voltar</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/influenciadoras">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {influenciadora.nome_artistico || influenciadora.nome_completo}
                </h1>
                <Badge className={getStatusColor(influenciadora.status)}>
                  {getStatusLabel(influenciadora.status)}
                </Badge>
                {!influenciadora.ativo && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inativo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {influenciadora.nome_completo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {influenciadora.status !== 'aprovado' ? (
              <Button
                onClick={handleAtivar}
                disabled={isActivating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isActivating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Ativar {getTermoInfluenciador(influenciadora?.genero)}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleReenviarBoasVindas}
                disabled={isResending}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Reenviar Boas-vindas
              </Button>
            )}
            <Button asChild>
              <Link to={`/influenciadoras/${id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Perfil */}
          <div className="space-y-6">
            {/* Card Perfil */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={influenciadora.foto_perfil} />
                    <AvatarFallback className="text-2xl">
                      {safeGetInitials(influenciadora.nome_completo)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">
                    {influenciadora.nome_artistico || influenciadora.nome_completo}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getTipoLabel(influenciadora.tipo)}
                    {influenciadora.tamanho && ` • ${getTamanhoLabel(influenciadora.tamanho)}`}
                  </p>

                  {influenciadora.biografia && (
                    <p className="text-sm text-muted-foreground mt-4 text-left">
                      {influenciadora.biografia}
                    </p>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Dados Pessoais */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados Pessoais</p>

                  {influenciadora.nome_completo && influenciadora.nome_artistico && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Nome completo</span>
                        <p className="font-medium">{influenciadora.nome_completo}</p>
                      </div>
                    </div>
                  )}

                  {influenciadora.cpf && (
                    <div className="flex items-center gap-3 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">CPF</span>
                        <p className="font-medium font-mono">{formatCPF(influenciadora.cpf)}</p>
                      </div>
                    </div>
                  )}

                  {influenciadora.data_nascimento && (
                    <div className="flex items-center gap-3 text-sm">
                      <Cake className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Data de nascimento</span>
                        <p className="font-medium">
                          {format(new Date(influenciadora.data_nascimento + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                          <span className="text-muted-foreground ml-1">
                            ({differenceInYears(new Date(), new Date(influenciadora.data_nascimento + 'T00:00:00'))} anos)
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {influenciadora.genero && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Gênero</span>
                        <p className="font-medium">{getGeneroLabel(influenciadora.genero)}</p>
                      </div>
                    </div>
                  )}

                  {influenciadora.rg && (
                    <div className="flex items-center gap-3 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">RG</span>
                        <p className="font-medium font-mono">{influenciadora.rg}</p>
                      </div>
                    </div>
                  )}

                  {influenciadora.estado_civil && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Estado Civil</span>
                        <p className="font-medium">
                          {({ solteiro: 'Solteiro(a)', casado: 'Casado(a)', divorciado: 'Divorciado(a)', viuvo: 'Viúvo(a)', uniao_estavel: 'União Estável' } as Record<string, string>)[influenciadora.estado_civil] || influenciadora.estado_civil}
                        </p>
                      </div>
                    </div>
                  )}

                  {influenciadora.profissao && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Profissão</span>
                        <p className="font-medium">{influenciadora.profissao}</p>
                      </div>
                    </div>
                  )}

                  {influenciadora.naturalidade && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Naturalidade</span>
                        <p className="font-medium">{influenciadora.naturalidade}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Contato */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>

                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-green-600" />
                    <div>
                      <span className="text-muted-foreground text-xs">WhatsApp</span>
                      <p className="font-medium">{formatPhoneDisplay(influenciadora.whatsapp, influenciadora.whatsapp_codigo_pais || '55')}</p>
                    </div>
                  </div>

                  {influenciadora.telefone && influenciadora.telefone !== influenciadora.whatsapp && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Telefone</span>
                        <p className="font-medium">{formatPhoneDisplay(influenciadora.telefone, influenciadora.telefone_codigo_pais || '55')}</p>
                      </div>
                    </div>
                  )}

                  {influenciadora.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Email</span>
                        <p className="font-medium">{influenciadora.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Endereço */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Endereço</p>

                  {(influenciadora.endereco || influenciadora.cidade) ? (
                    <div className="flex items-start gap-3 text-sm">
                      <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {influenciadora.endereco && (
                          <p className="font-medium">
                            {influenciadora.endereco}
                            {influenciadora.numero && `, ${influenciadora.numero}`}
                          </p>
                        )}
                        {influenciadora.complemento && (
                          <p className="text-muted-foreground">{influenciadora.complemento}</p>
                        )}
                        {influenciadora.bairro && (
                          <p className="text-muted-foreground">{influenciadora.bairro}</p>
                        )}
                        {(influenciadora.cidade || influenciadora.estado) && (
                          <p>
                            {influenciadora.cidade}
                            {influenciadora.estado && ` - ${influenciadora.estado}`}
                          </p>
                        )}
                        {influenciadora.cep && (
                          <p className="text-muted-foreground font-mono text-xs">{formatCEP(influenciadora.cep)}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Não informado</p>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Vinculação */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vinculação</p>

                  {franchiseName && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Franquia</span>
                        <p className="font-medium">{franchiseName}</p>
                      </div>
                    </div>
                  )}

                  {(influenciadora as unknown as { responsavel?: { nome: string; cargo: string | null } | null }).responsavel && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground text-xs">Consultora responsável</span>
                        <p className="font-medium">
                          {(influenciadora as unknown as { responsavel: { nome: string; cargo: string | null } }).responsavel.nome}
                          {(influenciadora as unknown as { responsavel: { nome: string; cargo: string | null } }).responsavel.cargo && (
                            <span className="text-muted-foreground ml-1">
                              ({(influenciadora as unknown as { responsavel: { nome: string; cargo: string | null } }).responsavel.cargo})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {!franchiseName && !(influenciadora as unknown as { responsavel?: { nome: string; cargo: string | null } | null }).responsavel && (
                    <p className="text-sm text-muted-foreground">Sem vinculação</p>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {influenciadora.genero === 'masculino' ? 'Cadastrado em' : influenciadora.genero === 'feminino' ? 'Cadastrada em' : 'Cadastrado(a) em'}{" "}
                      {format(new Date(influenciadora.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Responsável Legal (menor de idade) */}
            {influenciadora.eh_menor && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                    <ShieldAlert className="h-4 w-4" />
                    Responsável Legal
                    <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-100 ml-auto">
                      Menor de Idade
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {influenciadora.responsavel_legal_nome ? (
                    <>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="h-4 w-4 text-amber-600" />
                        <div>
                          <span className="text-muted-foreground text-xs">Nome</span>
                          <p className="font-medium">{influenciadora.responsavel_legal_nome}</p>
                        </div>
                      </div>
                      {influenciadora.responsavel_legal_parentesco && (
                        <div className="flex items-center gap-3 text-sm">
                          <Users className="h-4 w-4 text-amber-600" />
                          <div>
                            <span className="text-muted-foreground text-xs">Parentesco</span>
                            <p className="font-medium">{influenciadora.responsavel_legal_parentesco}</p>
                          </div>
                        </div>
                      )}
                      {influenciadora.responsavel_legal_cpf && (
                        <div className="flex items-center gap-3 text-sm">
                          <CreditCard className="h-4 w-4 text-amber-600" />
                          <div>
                            <span className="text-muted-foreground text-xs">CPF</span>
                            <p className="font-medium">{formatCPF(influenciadora.responsavel_legal_cpf)}</p>
                          </div>
                        </div>
                      )}
                      {influenciadora.responsavel_legal_rg && (
                        <div className="flex items-center gap-3 text-sm">
                          <CreditCard className="h-4 w-4 text-amber-600" />
                          <div>
                            <span className="text-muted-foreground text-xs">RG</span>
                            <p className="font-medium">{influenciadora.responsavel_legal_rg}</p>
                          </div>
                        </div>
                      )}
                      {influenciadora.responsavel_legal_telefone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-amber-600" />
                          <div>
                            <span className="text-muted-foreground text-xs">Telefone</span>
                            <p className="font-medium">{influenciadora.responsavel_legal_telefone}</p>
                          </div>
                        </div>
                      )}
                      {influenciadora.responsavel_legal_email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-amber-600" />
                          <div>
                            <span className="text-muted-foreground text-xs">E-mail</span>
                            <p className="font-medium">{influenciadora.responsavel_legal_email}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-sm text-amber-600">Responsável legal não cadastrado</p>
                      <Link to={`/influenciadoras/${influenciadora.id}/editar`}>
                        <Button variant="outline" size="sm" className="mt-2 border-amber-300 text-amber-700">
                          Cadastrar Responsável
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Card Código de Indicação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Código de Indicação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <code className="text-lg font-bold">
                    {influenciadora.codigo_indicacao}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopyCode(influenciadora.codigo_indicacao || "")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      handleCopyLink(influenciadora.codigo_indicacao || "")
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                  <QRCodeIndicacao
                    codigo_indicacao={influenciadora.codigo_indicacao || ""}
                    nome_influenciadora={influenciadora.nome_artistico || influenciadora.nome_completo}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card Link do Portal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Acesso ao Portal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Link de cadastro (novo parceiro)</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 truncate">
                      {window.location.origin}/influenciadora/cadastro
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/influenciadora/cadastro`);
                        toast.success('Link de cadastro copiado!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Link de login do portal</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 truncate">
                      {window.location.origin}/influenciadores/login
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/influenciadores/login`);
                        toast.success('Link do portal copiado!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                  <p className="font-medium text-foreground">
                    {getTermoInfluenciador(influenciadora.genero)} entra com:
                  </p>
                  {influenciadora.whatsapp && (
                    <p>📱 WhatsApp: <span className="font-mono">{influenciadora.whatsapp}</span></p>
                  )}
                  {influenciadora.email && (
                    <p>📧 Email: <span className="font-mono">{influenciadora.email}</span></p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card Redes Sociais */}
            {influenciadora.redes_sociais && influenciadora.redes_sociais.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Redes Sociais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {influenciadora.redes_sociais.map((rede) => (
                    <div
                      key={rede.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {PLATAFORMA_ICONS[rede.plataforma] || "🔗"}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm">
                              {getPlataformaIcon(rede.plataforma)}
                            </p>
                            {rede.url && (
                              <a
                                href={rede.url.startsWith('http') ? rede.url : `https://${rede.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rede.url ? (
                              <a
                                href={rede.url.startsWith('http') ? rede.url : `https://${rede.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {rede.username || rede.url}
                              </a>
                            ) : (
                              rede.username || "Sem username"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatSeguidores(rede.seguidores)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rede.taxa_engajamento}% eng.
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold">
                        {formatSeguidores(influenciadora.total_seguidores)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Valores e Preferências */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valores e Preferências
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {influenciadora.valor_post != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor por Post</span>
                      <span className="font-medium">R$ {influenciadora.valor_post.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {influenciadora.valor_story != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor por Story</span>
                      <span className="font-medium">R$ {influenciadora.valor_story.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {influenciadora.valor_reels != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor por Reels</span>
                      <span className="font-medium">R$ {influenciadora.valor_reels.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {!influenciadora.valor_post && !influenciadora.valor_story && !influenciadora.valor_reels && (
                    <p className="text-muted-foreground text-xs">Nenhum valor cadastrado</p>
                  )}
                </div>

                <div className="pt-2 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aceita Permuta</span>
                    <Badge variant={influenciadora.aceita_permuta ? "default" : "secondary"}>
                      {influenciadora.aceita_permuta ? "Sim" : "Não"}
                    </Badge>
                  </div>

                  {influenciadora.valor_gerado != null && Number(influenciadora.valor_gerado) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor Gerado</span>
                      <span className="font-medium text-green-600">
                        R$ {Number(influenciadora.valor_gerado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {influenciadora.nichos && influenciadora.nichos.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Nichos</p>
                    <div className="flex flex-wrap gap-1">
                      {influenciadora.nichos.map((nicho: string) => (
                        <Badge key={nicho} variant="outline" className="text-xs">{nicho}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {influenciadora.publico_alvo && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Público-Alvo</p>
                    <p className="text-sm">{influenciadora.publico_alvo}</p>
                  </div>
                )}

                {influenciadora.notas && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm whitespace-pre-wrap">{influenciadora.notas}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita - Conteúdo */}
          <div className="lg:col-span-2 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {influenciadora.quantidade_indicacoes}
                      </p>
                      <p className="text-xs text-muted-foreground">Indicações</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {metrics?.indicacoesConvertidas || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Convertidas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {metrics?.taxaConversao.toFixed(1) || 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Conversão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-500" />
                    <div>
                      <p className="text-2xl font-bold">
                        {formatSeguidores(influenciadora.total_seguidores)}
                      </p>
                      <p className="text-xs text-muted-foreground">Seguidores</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="indicacoes">
              <TabsList>
                <TabsTrigger value="indicacoes">Indicações</TabsTrigger>
                <TabsTrigger value="contratos">Contratos</TabsTrigger>
                <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="acessos">Acessos</TabsTrigger>
              </TabsList>

              <TabsContent value="indicacoes" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Indicações</CardTitle>
                    <CardDescription>
                      Leads indicados por esta influenciadora
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingIndicacoes ? (
                      <div className="space-y-3">
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    ) : indicacoes && indicacoes.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {indicacoes.map((indicacao) => (
                            <TableRow key={indicacao.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {indicacao.lead?.nome || "Lead não encontrado"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {indicacao.lead?.email || indicacao.lead?.telefone}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {format(
                                  new Date(indicacao.created_at),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    indicacao.status === "convertido"
                                      ? "default"
                                      : indicacao.status === "perdido"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {indicacao.status === "convertido" && (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  )}
                                  {indicacao.status === "perdido" && (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  )}
                                  {indicacao.status === "pendente" && (
                                    <Clock className="h-3 w-3 mr-1" />
                                  )}
                                  {indicacao.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Share2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>Nenhuma indicação registrada ainda</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contratos" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Contratos</CardTitle>
                        <CardDescription>
                          Histórico de contratos com a influenciadora
                        </CardDescription>
                      </div>
                      <Button asChild>
                        <Link to={`/influenciadoras/${id}/contratos/novo`}>
                          <Plus className="mr-2 h-4 w-4" />
                          Novo Contrato
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingContracts ? (
                      <div className="space-y-3">
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    ) : contracts && contracts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Entregas/mês</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contracts.map((contrato) => (
                            <TableRow key={contrato.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium capitalize">{contrato.tipo.replace('_', ' ')}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {contrato.franchise ? `${contrato.franchise.nome_fantasia}` : 'Global (Franqueadora)'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {format(new Date(contrato.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                                {contrato.data_fim && ` - ${format(new Date(contrato.data_fim), "dd/MM/yyyy", { locale: ptBR })}`}
                              </TableCell>
                              <TableCell>
                                {contrato.valor_mensal ? `R$ ${contrato.valor_mensal.toLocaleString('pt-BR')}` :
                                 contrato.valor_por_post ? `R$ ${contrato.valor_por_post.toLocaleString('pt-BR')}/post` :
                                 contrato.percentual_comissao ? `${contrato.percentual_comissao}%` :
                                 contrato.credito_permuta ? `R$ ${contrato.credito_permuta.toLocaleString('pt-BR')} permuta` : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5 text-xs">
                                  {contrato.posts_mes ? <span>{contrato.posts_mes} post{contrato.posts_mes > 1 ? 's' : ''}</span> : null}
                                  {contrato.stories_mes ? <span>{contrato.stories_mes} stories</span> : null}
                                  {contrato.reels_mes ? <span>{contrato.reels_mes} reel{contrato.reels_mes > 1 ? 's' : ''}</span> : null}
                                  {!contrato.posts_mes && !contrato.stories_mes && !contrato.reels_mes && <span className="text-muted-foreground">-</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant={contrato.status === 'ativo' ? 'default' : 'secondary'}>
                                    {contrato.status}
                                  </Badge>
                                  {contrato.assinado === false && contrato.status === 'ativo' && (
                                    <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">
                                      Aguardando assinatura
                                    </Badge>
                                  )}
                                  {(contrato.aditivos_count ?? 0) > 0 && (
                                    <Badge variant="outline" className="border-purple-400 text-purple-600 bg-purple-50">
                                      {contrato.aditivos_count} aditivo{(contrato.aditivos_count ?? 0) > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link to={`/influenciadoras/${id}/contratos/${contrato.id}/editar`}>
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <Link to={`/influenciadoras/${id}/contratos/${contrato.id}/preview`}>
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nenhum contrato cadastrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pagamentos" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Pagamentos</CardTitle>
                          <CardDescription>
                            Histórico de pagamentos realizados
                          </CardDescription>
                        </div>
                        <Button asChild>
                          <Link to={`/influenciadoras/${id}/pagamentos/novo`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Pagamento
                          </Link>
                        </Button>
                      </div>
                      {paymentStats && (
                        <div className="flex gap-4 text-sm">
                          <div className="text-right">
                            <p className="text-muted-foreground">Pendente</p>
                            <p className="font-semibold text-yellow-600">
                              R$ {paymentStats.totalPendente.toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Pago</p>
                            <p className="font-semibold text-green-600">
                              R$ {paymentStats.totalPago.toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPayments ? (
                      <div className="space-y-3">
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    ) : payments && payments.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Pagamento</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((pagamento) => (
                            <TableRow key={pagamento.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium capitalize">{pagamento.payment_type.replace('_', ' ')}</p>
                                  {pagamento.payment_method && (
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {pagamento.payment_method}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  R$ {pagamento.amount.toLocaleString('pt-BR')}
                                </span>
                              </TableCell>
                              <TableCell>
                                {pagamento.due_date ? format(new Date(pagamento.due_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                              </TableCell>
                              <TableCell>
                                {pagamento.paid_at ? format(new Date(pagamento.paid_at), "dd/MM/yyyy", { locale: ptBR }) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    pagamento.status === 'pago' ? 'default' :
                                    pagamento.status === 'pendente' ? 'secondary' :
                                    pagamento.status === 'aprovado' ? 'outline' : 'destructive'
                                  }
                                >
                                  {pagamento.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nenhum pagamento cadastrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="posts" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Posts</CardTitle>
                          <CardDescription>
                            Conteúdos publicados pela influenciadora
                          </CardDescription>
                        </div>
                        <Button asChild>
                          <Link to={`/influenciadoras/${id}/posts/novo`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Post
                          </Link>
                        </Button>
                      </div>
                      {postStats && (
                        <div className="flex gap-4 text-sm">
                          <div className="text-right">
                            <p className="text-muted-foreground">Total</p>
                            <p className="font-semibold">{postStats.totalPosts}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Likes</p>
                            <p className="font-semibold">{postStats.totalLikes.toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Engajamento</p>
                            <p className="font-semibold">{postStats.avgEngagement}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingPosts ? (
                      <div className="space-y-3">
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    ) : posts && posts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Plataforma</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Engajamento</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {posts.map((post) => (
                            <TableRow key={post.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">{post.platform}</span>
                                  {post.post_url && (
                                    <a
                                      href={post.post_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm capitalize">{post.post_type.replace('_', ' ')}</span>
                              </TableCell>
                              <TableCell>
                                {post.published_at
                                  ? format(new Date(post.published_at), "dd/MM/yyyy", { locale: ptBR })
                                  : post.scheduled_date
                                  ? `Agendado: ${format(new Date(post.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">
                                    {post.engagement_rate ? `${post.engagement_rate}%` : '-'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {post.likes_count} likes · {post.comments_count} comentários
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    post.status === 'publicado' ? 'default' :
                                    post.status === 'aprovado' ? 'outline' :
                                    post.status === 'rejeitado' ? 'destructive' : 'secondary'
                                  }
                                >
                                  {post.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nenhum post cadastrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="acessos" className="mt-4">
                <div className="space-y-4">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Total Acessos</p>
                            <p className="text-lg font-bold">{loginStats.total}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Último Acesso</p>
                            <p className="text-sm font-medium">
                              {loginStats.ultimoAcesso
                                ? formatDistanceToNow(new Date(loginStats.ultimoAcesso), { addSuffix: true, locale: ptBR })
                                : "Nunca"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Este Mês</p>
                            <p className="text-lg font-bold">{loginStats.acessosEsteMes}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-red-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">Falhas</p>
                            <p className="text-lg font-bold">{loginStats.tentativasFalhadas}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Login History Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Histórico de Acessos</CardTitle>
                      <CardDescription>Últimos 50 acessos ao portal</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingLoginHistory ? (
                        <div className="space-y-3">
                          <Skeleton className="h-12" />
                          <Skeleton className="h-12" />
                          <Skeleton className="h-12" />
                        </div>
                      ) : loginHistory.length > 0 ? (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead className="hidden sm:table-cell">Método</TableHead>
                                <TableHead className="hidden md:table-cell">Dispositivo</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loginHistory.map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {format(new Date(record.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(record.created_at), "HH:mm")}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <Badge variant="outline" className="text-xs">
                                      {record.verification_method === 'whatsapp' ? (
                                        <><Zap className="h-3 w-3 mr-1" />WhatsApp</>
                                      ) : record.verification_method === 'email' ? (
                                        <><Mail className="h-3 w-3 mr-1" />Email</>
                                      ) : (
                                        record.verification_method || '-'
                                      )}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                      {record.user_agent?.includes('Mobile') || record.user_agent?.includes('iPhone') || record.user_agent?.includes('Android') ? (
                                        <Smartphone className="h-3.5 w-3.5" />
                                      ) : (
                                        <Monitor className="h-3.5 w-3.5" />
                                      )}
                                      <span>{parseUserAgent(record.user_agent)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {record.success ? (
                                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Sucesso
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        {record.failure_reason === 'expired_code' ? 'Código expirado' :
                                         record.failure_reason === 'invalid_code' ? 'Código inválido' :
                                         record.failure_reason || 'Falha'}
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>Nenhum acesso registrado</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InfluenciadoraDetail;
