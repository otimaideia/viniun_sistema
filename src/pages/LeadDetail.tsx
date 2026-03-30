import { useParams, useNavigate, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useLeadAdapter, useLeadsAdapter, useLeadHistoryAdapter, useIndicacoesAdapter } from "@/hooks/useLeadsAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { useResponsibleUsersAdapter } from "@/hooks/useResponsibleUsersAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useMetaConversationsMT } from "@/hooks/multitenant/useMetaConversationsMT";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatusSelect } from "@/components/dashboard/StatusSelect";
import { ResponsibleSelect } from "@/components/dashboard/ResponsibleSelect";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LeadMiniCRM, LeadAppointments } from "@/components/leads";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Globe,
  Pencil,
  Building2,
  User,
  UserPlus,
  Users,
  Calendar,
  Target,
  ExternalLink,
  Cake,
  Home,
  Hash,
  Tag,
  Link2,
  Monitor,
  Shield,
  Activity,
  Trash2,
  Fingerprint,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Star,
  Briefcase,
  Heart,
  Clock,
  AlertTriangle,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Wallet,
  StickyNote,
  Music2,
  Smartphone,
  Tablet,
  Laptop,
  Wifi,
  Languages,
  Timer,
  Cookie,
  Maximize2,
} from "lucide-react";
import { LeadStatus, STATUS_CONFIG, LeadWithExtras, spreadDadosExtras, COMO_CONHECEU_OPTIONS } from "@/types/lead-mt";
import { gerarLinkIndicacao } from "@/types/indicacao";
import { formatPhoneDisplay, cleanPhoneNumber } from "@/utils/phone";
import { useMemo, useState, useEffect } from "react";
import { Gift, Copy, Share2, Sparkles, Loader2, QrCode, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Componente para exibir informações de forma consistente
function InfoItem({
  icon: Icon,
  label,
  value,
  isLink
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  isLink?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium break-all">{value}</p>
        )}
      </div>
    </div>
  );
}

// Componente que sempre exibe, mesmo sem valor (para endereco)
function InfoItemAlways({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium break-all ${!value ? 'text-muted-foreground italic' : ''}`}>
          {value || "Nao informado"}
        </p>
      </div>
    </div>
  );
}

// Componente para exibir conversas Meta Messenger vinculadas ao lead
function MetaMessengerTab({ leadId }: { leadId: string }) {
  const navigate = useNavigate();

  // Buscar conversas vinculadas a este lead
  const { conversations, isLoading } = useMetaConversationsMT(undefined, {
    lead_id: leadId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma conversa do Meta Messenger vinculada a este lead.</p>
          <p className="text-sm mt-2">
            Conversas do Facebook Messenger e Instagram Direct aparecerão aqui automaticamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <Card
          key={conversation.id}
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate(`/meta-messenger/chat/${conversation.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Ícone da Plataforma */}
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {conversation.platform === 'facebook' ? (
                  <Facebook className="h-5 w-5 text-primary" />
                ) : (
                  <Instagram className="h-5 w-5 text-primary" />
                )}
              </div>

              {/* Info da Conversa */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">
                    {conversation.participant_name || 'Participante'}
                  </h4>
                  {conversation.participant_username && (
                    <span className="text-xs text-muted-foreground">
                      @{conversation.participant_username}
                    </span>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {conversation.platform}
                  </Badge>
                  {conversation.status === 'active' ? (
                    <Badge variant="default">Ativa</Badge>
                  ) : (
                    <Badge variant="secondary">Arquivada</Badge>
                  )}
                </div>

                {/* Preview da Última Mensagem */}
                {conversation.last_message_text && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.last_message_text}
                  </p>
                )}

                {/* Timestamp */}
                {conversation.last_message_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Última mensagem: {formatDistanceToNow(new Date(conversation.last_message_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                )}
              </div>

              {/* Badge de Não Lida */}
              {!conversation.is_read && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Link para Ver Todas as Conversas */}
      <div className="text-center pt-4">
        <Button variant="outline" asChild>
          <Link to="/meta-messenger/conversations">
            Ver Todas as Conversas
            <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();

  // Usar adapter que escolhe entre legacy e multi-tenant automaticamente
  const { data: leadData, isLoading, error } = useLeadAdapter(id);
  const { updateStatus: updateStatusMutation, deleteLead: deleteLeadMutation, updateLead: updateLeadMutation } = useLeadsAdapter();

  const { history, isLoading: loadingHistory } = useLeadHistoryAdapter(id);
  const { users: responsibleUsers, assignResponsible } = useResponsibleUsersAdapter();
  const { getIndicacoesByLead, getIndicadorByLead } = useIndicacoesAdapter();
  const { franqueados } = useFranqueadosAdapter();

  // Espalhar dados_extras no lead para acesso direto (elimina as any casts)
  const lead: LeadWithExtras | null = leadData ? spreadDadosExtras(leadData) : null;

  const [indicador, setIndicador] = useState<Lead | null>(null);
  const [indicados, setIndicados] = useState<Lead[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [activeTab, setActiveTab] = useState("atividades");

  // Dados técnicos da submissão
  const [submissaoData, setSubmissaoData] = useState<{
    user_agent?: string | null;
    ip_address?: string | null;
    referrer?: string | null;
    session_id?: string | null;
    tempo_preenchimento_segundos?: number | null;
    // Dados de dispositivo
    device_type?: string | null;
    device_model?: string | null;
    device_brand?: string | null;
    browser?: string | null;
    browser_version?: string | null;
    os?: string | null;
    os_version?: string | null;
    screen_width?: number | null;
    screen_height?: number | null;
    viewport_width?: number | null;
    viewport_height?: number | null;
    timezone?: string | null;
    language?: string | null;
    connection_type?: string | null;
    is_touch_device?: boolean | null;
    cookies_enabled?: boolean | null;
    platform?: string | null;
  } | null>(null);

  const [influenciadoraIndicacao, setInfluenciadoraIndicacao] = useState<{
    influenciadora: {
      id: string;
      nome: string;
      nome_artistico?: string;
      codigo?: string;
    };
    codigo_usado?: string;
    created_at: string;
  } | null>(null);

  useEffect(() => {
    const loadIndicacaoData = async () => {
      if (!lead) return;

      // Executar TODAS as queries em paralelo (era sequencial, salvava 2-4s)
      const [indicadorResult, indicadosResult, influencerResult, submissaoResult] = await Promise.allSettled([
        lead?.indicado_por_id ? getIndicadorByLead(lead.id) : Promise.resolve(null),
        getIndicacoesByLead(lead.id),
        supabase
          .from('mt_influencer_referrals')
          .select(`
            codigo_usado,
            created_at,
            influenciadora:mt_influencers(id, nome, nome_artistico, codigo)
          `)
          .eq('lead_id', lead.id)
          .maybeSingle(),
        supabase
          .from('mt_form_submissions')
          .select(`
            user_agent, ip_address, referrer, dados
          `)
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Processar resultados
      if (indicadorResult.status === 'fulfilled' && indicadorResult.value) {
        setIndicador(indicadorResult.value);
      }
      if (indicadosResult.status === 'fulfilled') {
        setIndicados(indicadosResult.value || []);
      }
      if (influencerResult.status === 'fulfilled') {
        const influencerData = influencerResult.value?.data;
        if (influencerData?.influenciadora) {
          setInfluenciadoraIndicacao(influencerData as NonNullable<typeof influenciadoraIndicacao>);
        }
      }
      if (submissaoResult.status === 'fulfilled') {
        const submissao = submissaoResult.value?.data;
        if (submissao) {
          // Colunas reais: user_agent, ip_address, referrer, dados (jsonb)
          // Campos de dispositivo podem estar no jsonb 'dados'
          const dadosJson = (submissao as any).dados || {};
          setSubmissaoData({
            user_agent: submissao.user_agent,
            ip_address: submissao.ip_address,
            referrer: submissao.referrer,
            session_id: dadosJson.session_id,
            tempo_preenchimento_segundos: dadosJson.tempo_preenchimento_segundos,
            device_type: dadosJson.device_type,
            device_model: dadosJson.device_model,
            device_brand: dadosJson.device_brand,
            browser: dadosJson.browser,
            browser_version: dadosJson.browser_version,
            os: dadosJson.os,
            os_version: dadosJson.os_version,
            screen_width: dadosJson.screen_width,
            screen_height: dadosJson.screen_height,
            viewport_width: dadosJson.viewport_width,
            viewport_height: dadosJson.viewport_height,
            timezone: dadosJson.timezone,
            language: dadosJson.language,
            connection_type: dadosJson.connection_type,
            is_touch_device: dadosJson.is_touch_device,
            cookies_enabled: dadosJson.cookies_enabled,
            platform: dadosJson.platform,
          });
        }
      }
    };
    loadIndicacaoData();
  }, [lead?.id, lead?.indicado_por_id]);

  const franquiaData = useMemo(() => {
    if (!lead) return null;
    if (lead.franqueado_id) {
      return franqueados.find(f => f.id === lead.franqueado_id);
    }
    if (lead.franchise_id) {
      return franqueados.find(f => f.id === lead.franchise_id);
    }
    if (lead.unidade) {
      return franqueados.find(f =>
        f.nome_fantasia?.toLowerCase() === lead.unidade?.toLowerCase()
      );
    }
    return null;
  }, [lead, franqueados]);

  // Formatar a origem substituindo UUIDs de franquia pelo nome
  const formatOrigem = (origem: string | null | undefined): string | null => {
    if (!origem) return null;
    // Padrão: "whatsapp_sync (franquia: UUID)"
    const franquiaMatch = origem.match(/\(franquia:\s*([0-9a-f-]{36})\)/i);
    if (franquiaMatch) {
      const franquiaId = franquiaMatch[1];
      const franquia = franqueados.find(f => f.id === franquiaId);
      const franchiseJoin = (lead?.franchise as any);
      const nomeFranquia = franquia?.nome_fantasia || franchiseJoin?.nome || franquiaId;
      return origem.replace(franquiaMatch[0], `(${nomeFranquia})`);
    }
    return origem;
  };

  const handleCopyCodigoIndicacao = () => {
    if (lead?.codigo_indicacao) {
      navigator.clipboard.writeText(lead.codigo_indicacao);
      toast.success("Codigo copiado!");
    }
  };

  const handleCopyLinkIndicacao = () => {
    if (lead?.codigo_indicacao) {
      const link = gerarLinkIndicacao(lead.codigo_indicacao);
      navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    }
  };

  const generateIndicationCode = async () => {
    if (!lead) return;
    setIsGeneratingCode(true);
    try {
      // Gera código único de 6 caracteres (letras maiúsculas e números)
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Verifica se o código já existe no banco
      const { data: existing, error: checkError } = await supabase
        .from("mt_leads")
        .select("id")
        .eq("codigo_indicacao", code)
        .maybeSingle();

      if (checkError) throw checkError;

      // Se já existe, gera outro código (tentativa recursiva)
      if (existing) {
        setIsGeneratingCode(false);
        return generateIndicationCode();
      }

      // Atualiza o lead com o novo código
      const { error: updateError } = await supabase
        .from("mt_leads")
        .update({
          codigo_indicacao: code,
          updated_at: new Date().toISOString()
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      toast.success(`Código de indicação gerado: ${code}`);
      // Recarrega a página para atualizar os dados
      window.location.reload();
    } catch (error) {
      console.error("Erro ao gerar código:", error);
      toast.error("Erro ao gerar código de indicação");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setIsDeleting(true);
    try {
      deleteLeadMutation.mutate(lead.id);
      toast.success("Lead excluido com sucesso!");
      navigate("/");
    } catch (error) {
      toast.error("Erro ao excluir lead");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Lead nao encontrado</h2>
          <p className="text-muted-foreground mb-4">O lead solicitado nao existe ou foi removido.</p>
          <Button onClick={() => navigate("/")}>Voltar para Leads</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleWhatsApp = () => {
    const cleanPhone = cleanPhoneNumber(lead.telefone);
    const codigoPais = lead.whatsapp_codigo_pais || lead.telefone_codigo_pais || '55';
    const primeiroNome = lead.nome.split(" ")[0];
    const mensagem = encodeURIComponent(
      `Ola ${primeiroNome}! Tudo bem? Aqui e da YESlaser!`
    );
    window.open(`https://wa.me/${codigoPais}${cleanPhone}?text=${mensagem}`, "_blank");
  };

  const handleStatusChange = (status: LeadStatus) => {
    if (!lead) return;
    updateStatusMutation.mutate({ id: lead.id, status });
  };

  const handleResponsibleChange = (responsibleId: string | null) => {
    const currentResponsible = responsibleUsers.find(u => u.id === lead.responsible_id);
    assignResponsible({
      leadId: lead.id,
      responsibleId,
      previousResponsibleName: currentResponsible?.name,
    });
  };

  // Fallback config para status desconhecidos ou nulos
  const defaultStatusConfig = {
    color: "text-gray-600",
    bg: "bg-gray-100 border-gray-200",
    label: lead.status || "Desconhecido"
  };
  const statusConfig = lead.status && STATUS_CONFIG[lead.status] ? STATUS_CONFIG[lead.status] : defaultStatusConfig;

  // Usar código de país do banco ou default 55 (Brasil)
  const telefoneCodigoPais = lead.telefone_codigo_pais || '55';
  const whatsappCodigoPais = lead.whatsapp_codigo_pais || telefoneCodigoPais;
  const whatsappNumber = lead.whatsapp || lead.telefone;
  const whatsappLink = `https://wa.me/${whatsappCodigoPais}${cleanPhoneNumber(whatsappNumber)}`;

  const formatEndereco = () => {
    const parts = [];
    if (lead.bairro) parts.push(lead.bairro);
    if (lead.cidade && lead.estado) parts.push(`${lead.cidade} - ${lead.estado}`);
    if (lead.cep) parts.push(`CEP: ${lead.cep}`);
    if (lead.pais && lead.pais !== 'Brasil') parts.push(lead.pais);
    return parts.join(', ') || null;
  };

  const formatDataNascimento = () => {
    if (!lead.data_nascimento) return null;
    try {
      return format(new Date(lead.data_nascimento), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return lead.data_nascimento;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb - Estilo PopDents */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Leads</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{lead.nome}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Principal - Estilo PopDents */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {/* Nome Grande */}
            <h1 className="text-3xl font-bold text-foreground">{lead.nome}</h1>

            {/* Badges de Status */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status do Lead */}
              <Badge className={`${statusConfig.bg} ${statusConfig.color} border`}>
                {statusConfig.label}
              </Badge>

              {/* Aceita Contato */}
              {lead.aceita_contato !== undefined && (
                <Badge
                  variant="outline"
                  className={lead.aceita_contato
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                  }
                >
                  {lead.aceita_contato ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Aceita Contato</>
                  ) : (
                    <><XCircle className="h-3 w-3 mr-1" /> Nao Aceita Contato</>
                  )}
                </Badge>
              )}

              {/* LGPD / Consentimento */}
              {lead.consentimento !== undefined && (
                <Badge
                  variant="outline"
                  className={lead.consentimento
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-orange-50 text-orange-700 border-orange-200"
                  }
                >
                  {lead.consentimento ? (
                    <><Shield className="h-3 w-3 mr-1" /> LGPD Aceito</>
                  ) : (
                    <><Shield className="h-3 w-3 mr-1" /> LGPD Pendente</>
                  )}
                </Badge>
              )}

              {/* Unidade de Contato */}
              {(lead.unidade || franquiaData?.nome_fantasia) && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  <Building2 className="h-3 w-3 mr-1" />
                  {franquiaData?.nome_fantasia || lead.unidade}
                </Badge>
              )}

              {/* Origem da Campanha */}
              {lead.origem && (
                <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                  <Target className="h-3 w-3 mr-1" />
                  {formatOrigem(lead.origem)}
                </Badge>
              )}

              {/* Landing Page */}
              {lead.lead_source === "promocao" && (
                <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200">
                  Landing Page
                </Badge>
              )}

              {/* Indicado por Lead */}
              {indicador && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Users className="h-3 w-3 mr-1" />
                  Indicado por: {indicador.nome}
                </Badge>
              )}

              {/* Indicado por Influenciadora */}
              {influenciadoraIndicacao && (
                <Badge variant="secondary" className="bg-pink-50 text-pink-700 border-pink-200">
                  <Star className="h-3 w-3 mr-1 fill-pink-500" />
                  Influenciadora: {influenciadoraIndicacao.influenciadora.nome_artistico || influenciadoraIndicacao.influenciadora.nome}
                </Badge>
              )}

              {/* Codigo de Indicacao */}
              {lead.codigo_indicacao && (
                <Badge variant="outline" className="text-primary border-primary">
                  <Gift className="h-3 w-3 mr-1" />
                  {lead.codigo_indicacao}
                </Badge>
              )}
            </div>
          </div>

          {/* Acoes no Header */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/leads/novo?indicador=${id}`)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Indicacao
            </Button>
            <Button asChild size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const expiry = new Date();
              expiry.setHours(expiry.getHours() + 24);
              localStorage.setItem('mt_cliente_token', JSON.stringify({ leadId: lead.id, expiry: expiry.toISOString() }));
              localStorage.setItem('mt_cliente_data', JSON.stringify(lead));
              window.open('/cliente/dashboard', '_blank');
            }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Portal do Cliente
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/leads/${lead.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick Actions Bar - Inspirado no Kommo CRM */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
          <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" asChild>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
          {lead.telefone && (
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <a href={`tel:+${telefoneCodigoPais}${cleanPhoneNumber(lead.telefone)}`}>
                <Phone className="h-4 w-4 text-blue-600" />
                Ligar
              </a>
            </Button>
          )}
          {lead.email && (
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <a href={`mailto:${lead.email}`}>
                <Mail className="h-4 w-4 text-orange-600" />
                E-mail
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate(`/agendamentos/novo?lead_id=${lead.id}&lead_nome=${encodeURIComponent(lead.nome)}`)}>
            <Calendar className="h-4 w-4 text-cyan-600" />
            Agendar
          </Button>

          <div className="ml-auto flex items-center gap-3">
            {/* Score Visual */}
            {(lead.score_automatico || lead.score_manual) && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm font-semibold text-amber-700">
                  {lead.score_automatico || lead.score_manual || 0}
                </span>
                <span className="text-xs text-amber-600">pts</span>
              </div>
            )}

            {/* Temperatura */}
            {lead.temperatura && (
              <Badge variant="outline" className={
                lead.temperatura === 'quente' ? 'bg-red-50 text-red-700 border-red-200' :
                lead.temperatura === 'morno' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }>
                {lead.temperatura === 'quente' ? '🔥' : lead.temperatura === 'morno' ? '🌡️' : '❄️'}
                {' '}{lead.temperatura}
              </Badge>
            )}
          </div>
        </div>

        {/* Card com Informacoes e Stats Rapidas - Inspirado no Kommo CRM */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium truncate">{formatPhoneDisplay(lead.telefone, telefoneCodigoPais)}</p>
                </div>
              </div>

              {lead.email && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-sm font-medium truncate">{lead.email}</p>
                  </div>
                </div>
              )}

              {lead.cidade && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Cidade</p>
                    <p className="text-sm font-medium truncate">{lead.cidade}{lead.estado ? ` - ${lead.estado}` : ''}</p>
                  </div>
                </div>
              )}

              {((lead as any).servicos_interesse?.length > 0 || lead.servico) && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Interesse</p>
                    <p className="text-sm font-medium truncate">
                      {(lead as any).servicos_interesse?.length > 0
                        ? (lead as any).servicos_interesse.join(', ')
                        : lead.servico}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Cadastro</p>
                  <p className="text-sm font-medium truncate">
                    {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Stats: Ultimo Contato - Inspirado no Kommo */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Ultimo Contato</p>
                  <p className="text-sm font-medium truncate">
                    {lead.ultimo_contato
                      ? formatDistanceToNow(new Date(lead.ultimo_contato), { addSuffix: true, locale: ptBR })
                      : 'Nunca'}
                  </p>
                </div>
              </div>

              {/* Stats: Total Contatos */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Contatos</p>
                  <p className="text-sm font-medium">
                    {(lead.total_contatos || 0)} total
                  </p>
                </div>
              </div>

              {/* Responsável */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <ResponsibleSelect
                    value={lead.responsible_id || null}
                    users={responsibleUsers}
                    onValueChange={handleResponsibleChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs - Estilo PopDents */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="atividades" className="gap-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Atividades</span>
            </TabsTrigger>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="endereco">Endereco</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="tecnico">Tecnico</TabsTrigger>
            <TabsTrigger value="meta-messenger" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Meta</span>
            </TabsTrigger>
            <TabsTrigger value="indicacoes">
              Indicacoes
              {indicados.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {indicados.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Atividades (CRM) */}
          <TabsContent value="atividades" className="mt-4 space-y-6">
            {/* Agendamentos */}
            <LeadAppointments
              leadId={id!}
              franqueadoId={lead.franqueado_id}
            />

            {/* Mini CRM */}
            <LeadMiniCRM
              leadId={id!}
              leadPhone={lead.telefone}
              leadPhoneCountryCode={lead.whatsapp_codigo_pais || lead.telefone_codigo_pais || '55'}
              leadName={lead.nome}
            />
          </TabsContent>

          {/* Tab Dados */}
          <TabsContent value="dados" className="space-y-4 mt-4">
            {/* Status e Responsável */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status e Atribuição</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Status</label>
                    <StatusSelect value={lead.status} onValueChange={handleStatusChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Responsável</label>
                    <ResponsibleSelect
                      value={lead.responsible_id || null}
                      users={responsibleUsers}
                      onValueChange={handleResponsibleChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informacoes Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informacoes Pessoais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoItem icon={User} label="Nome Completo" value={lead.sobrenome ? `${lead.nome} ${lead.sobrenome}` : lead.nome} />
                  <InfoItem icon={Mail} label="E-mail" value={lead.email} />
                  <InfoItem icon={Phone} label="Telefone" value={formatPhoneDisplay(lead.telefone, telefoneCodigoPais)} />
                  <InfoItem icon={MessageCircle} label="WhatsApp" value={formatPhoneDisplay(lead.whatsapp || lead.telefone, whatsappCodigoPais)} />
                  <InfoItem icon={Fingerprint} label="CPF" value={lead.cpf} />
                  <InfoItem icon={Fingerprint} label="RG" value={lead.rg} />
                  <InfoItem icon={Cake} label="Data de Nascimento" value={formatDataNascimento()} />
                  <InfoItem icon={User} label="Genero" value={lead.genero} />
                  <InfoItem icon={User} label="Estado Civil" value={lead.estado_civil} />
                  <InfoItem icon={Globe} label="Nacionalidade" value={lead.nacionalidade} />
                  <InfoItem icon={Briefcase} label="Profissao" value={lead.profissao} />
                  <InfoItem icon={Target} label="Como Conheceu" value={
                    lead.como_conheceu === 'outro'
                      ? (lead as any).como_conheceu_outro || 'Outro'
                      : COMO_CONHECEU_OPTIONS.find(o => o.value === lead.como_conheceu)?.label || lead.como_conheceu
                  } />
                </div>
              </CardContent>
            </Card>

            {/* Interesse e Vinculo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interesse e Vinculo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoItem icon={Target} label="Servico de Interesse" value={
                    (lead as any).servicos_interesse?.length > 0
                      ? (lead as any).servicos_interesse.join(', ')
                      : lead.servico
                  } />
                  <InfoItem icon={Building2} label="Franqueado" value={franquiaData?.nome_fantasia || lead.unidade} />
                  {indicador && (
                    <InfoItem icon={Users} label="Indicado por" value={indicador.nome} />
                  )}
                </div>
                {lead.unidades_vinculadas?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Unidades Vinculadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.unidades_vinculadas.map((unidade: string) => (
                        <Badge key={unidade} variant="secondary">
                          {unidade}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Consentimentos e Permissoes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consentimentos e Permissoes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {lead.aceita_contato ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Aceita Contato</p>
                      <p className="text-sm font-medium">
                        {lead.aceita_contato === true ? "Sim" : lead.aceita_contato === false ? "Nao" : "Nao informado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {lead.consentimento ? (
                      <Shield className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Shield className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">LGPD / Consentimento</p>
                      <p className="text-sm font-medium">
                        {lead.consentimento === true ? "Aceito" : lead.consentimento === false ? "Nao aceito" : "Pendente"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Target className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo de Lead</p>
                      <p className="text-sm font-medium">
                        {lead.lead_source === "promocao" ? "Landing Page" : "Formulario Web"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saude e Tratamento - Importante para Laser */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Saude e Tratamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoItem icon={User} label="Tipo de Pele (Fitzpatrick)" value={lead.tipo_pele ? `Tipo ${lead.tipo_pele}` : undefined} />
                  <InfoItem icon={AlertTriangle} label="Alergias" value={lead.alergias} />
                  <InfoItem icon={Heart} label="Condicoes Medicas" value={lead.condicoes_medicas} />
                  <InfoItem icon={Heart} label="Medicamentos em Uso" value={lead.medicamentos_uso} />
                  <InfoItem icon={Target} label="Areas de Interesse" value={lead.areas_interesse} />
                  <InfoItem icon={Heart} label="Historico de Tratamentos" value={lead.historico_tratamentos} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {lead.fotossensibilidade ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Fotossensibilidade</p>
                      <p className="text-sm font-medium">
                        {lead.fotossensibilidade === true ? "Sim - Sensivel a luz" : lead.fotossensibilidade === false ? "Nao" : "Nao informado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {lead.gravidez_lactacao ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Gravidez/Lactacao</p>
                      <p className="text-sm font-medium">
                        {lead.gravidez_lactacao === true ? "Sim - Contraindicacao" : lead.gravidez_lactacao === false ? "Nao" : "Nao informado"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contato de Emergencia */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-red-500" />
                  Contato de Emergencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoItem icon={User} label="Nome" value={lead.contato_emergencia_nome} />
                  <InfoItem icon={Phone} label="Telefone" value={lead.contato_emergencia_telefone ? formatPhoneDisplay(lead.contato_emergencia_telefone, lead.contato_emergencia_telefone_codigo_pais || '55') : null} />
                  <InfoItem icon={Users} label="Parentesco" value={lead.contato_emergencia_parentesco} />
                </div>
                {!lead.contato_emergencia_nome && !lead.contato_emergencia_telefone && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhum contato de emergencia cadastrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Preferencias de Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Preferencias de Contato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoItem icon={MessageCircle} label="Preferencia de Contato" value={lead.preferencia_contato} />
                  <InfoItem icon={Clock} label="Melhor Horario" value={lead.melhor_horario_contato} />
                  <InfoItem icon={Calendar} label="Dia Preferencial" value={lead.dia_preferencial} />
                  <InfoItem icon={Phone} label="Telefone Secundario" value={lead.telefone_secundario ? formatPhoneDisplay(lead.telefone_secundario, lead.telefone_secundario_codigo_pais || '55') : null} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {lead.aceita_marketing ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Aceita Marketing</p>
                      <p className="text-sm font-medium">
                        {lead.aceita_marketing === true ? "Sim" : lead.aceita_marketing === false ? "Nao" : "Nao informado"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {lead.aceita_pesquisa ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Aceita Pesquisa</p>
                      <p className="text-sm font-medium">
                        {lead.aceita_pesquisa === true ? "Sim" : lead.aceita_pesquisa === false ? "Nao" : "Nao informado"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Redes Sociais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  Redes Sociais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lead.instagram && (
                    <a
                      href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:border-purple-300 transition-colors cursor-pointer"
                    >
                      <Instagram className="h-5 w-5 text-pink-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Instagram</p>
                        <p className="text-sm font-medium text-pink-700 truncate">{lead.instagram}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-pink-400" />
                    </a>
                  )}
                  {lead.facebook && (
                    <a
                      href={lead.facebook.startsWith('http') ? lead.facebook : `https://facebook.com/${lead.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Facebook</p>
                        <p className="text-sm font-medium text-blue-700 truncate">{lead.facebook}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-blue-400" />
                    </a>
                  )}
                  {lead.tiktok && (
                    <a
                      href={lead.tiktok.startsWith('http') ? lead.tiktok : `https://tiktok.com/@${lead.tiktok.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
                    >
                      <Music2 className="h-5 w-5 text-slate-800" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">TikTok</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{lead.tiktok}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  )}
                  {lead.youtube && (
                    <a
                      href={lead.youtube.startsWith('http') ? lead.youtube : `https://youtube.com/@${lead.youtube.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100 hover:border-red-300 transition-colors cursor-pointer"
                    >
                      <Youtube className="h-5 w-5 text-red-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">YouTube</p>
                        <p className="text-sm font-medium text-red-700 truncate">{lead.youtube}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-red-400" />
                    </a>
                  )}
                  {lead.linkedin && (
                    <a
                      href={lead.linkedin.startsWith('http') ? lead.linkedin : `https://linkedin.com/in/${lead.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <Linkedin className="h-5 w-5 text-blue-700" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">LinkedIn</p>
                        <p className="text-sm font-medium text-blue-800 truncate">{lead.linkedin}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-blue-400" />
                    </a>
                  )}
                  {lead.twitter && (
                    <a
                      href={lead.twitter.startsWith('http') ? lead.twitter : `https://x.com/${lead.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
                    >
                      <Twitter className="h-5 w-5 text-slate-700" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">X (Twitter)</p>
                        <p className="text-sm font-medium text-slate-800 truncate">{lead.twitter}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  )}
                  {lead.website && (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 hover:border-emerald-300 transition-colors cursor-pointer"
                    >
                      <Globe className="h-5 w-5 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Website</p>
                        <p className="text-sm font-medium text-emerald-700 truncate">{lead.website}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-emerald-400" />
                    </a>
                  )}
                </div>
                {!lead.instagram && !lead.facebook && !lead.tiktok && !lead.youtube && !lead.linkedin && !lead.twitter && !lead.website && (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                    Nenhuma rede social cadastrada.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Dados Financeiros (PIX) */}
            {(lead.chave_pix || lead.tipo_chave_pix) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-500" />
                    Dados Financeiros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                      <Wallet className="h-5 w-5 text-green-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Chave PIX</p>
                        <p className="text-sm font-medium break-all">{lead.chave_pix || "Nao informada"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                      <Tag className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo da Chave</p>
                        <p className="text-sm font-medium capitalize">{lead.tipo_chave_pix || "Nao informado"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nota Interna (apenas para equipe) */}
            {lead.nota_interna && (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-amber-600" />
                    Nota Interna
                    <Badge variant="outline" className="ml-2 text-xs bg-amber-100 text-amber-700 border-amber-200">
                      Apenas para equipe
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-amber-900">{lead.nota_interna}</p>
                </CardContent>
              </Card>
            )}

            {/* Observacoes */}
            {lead.observacoes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Observacoes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{lead.observacoes}</p>
                </CardContent>
              </Card>
            )}

            {/* Datas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem
                    icon={Calendar}
                    label="Cadastrado em"
                    value={format(new Date(lead.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                  />
                  {lead.updated_at && (
                    <InfoItem
                      icon={Calendar}
                      label="Atualizado em"
                      value={format(new Date(lead.updated_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Endereco */}
          <TabsContent value="endereco" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Endereco do Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoItemAlways icon={MapPin} label="CEP" value={lead.cep} />
                  <InfoItemAlways icon={Home} label="Logradouro / Rua" value={lead.endereco} />
                  <InfoItemAlways icon={Hash} label="Numero" value={lead.numero} />
                  <InfoItemAlways icon={Home} label="Complemento" value={lead.complemento} />
                  <InfoItemAlways icon={Home} label="Bairro" value={lead.bairro} />
                  <InfoItemAlways icon={MapPin} label="Cidade" value={lead.cidade} />
                  <InfoItemAlways icon={MapPin} label="Estado / UF" value={lead.estado} />
                  <InfoItemAlways icon={Globe} label="Pais" value={lead.pais || "Brasil"} />
                  <InfoItemAlways icon={MapPin} label="Proximidade / Referencia" value={lead.proximidade} />
                  <InfoItemAlways icon={MapPin} label="Latitude" value={lead.latitude?.toString()} />
                  <InfoItemAlways icon={MapPin} label="Longitude" value={lead.longitude?.toString()} />
                </div>

                {/* Endereco Completo Formatado */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Endereco Completo</p>
                  <div className="text-sm font-medium space-y-1">
                    {lead.endereco && (
                      <p>
                        {lead.endereco}
                        {lead.numero && `, ${lead.numero}`}
                        {lead.complemento && ` - ${lead.complemento}`}
                      </p>
                    )}
                    {lead.bairro && <p>{lead.bairro}</p>}
                    <p>
                      {lead.cidade || "Cidade nao informada"}
                      {lead.estado && ` - ${lead.estado}`}
                    </p>
                    {lead.cep && <p>CEP: {lead.cep}</p>}
                    <p>{lead.pais || "Brasil"}</p>
                    {lead.proximidade && <p className="text-muted-foreground">Ref: {lead.proximidade}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {franquiaData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Localizacao da Unidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoItem icon={Building2} label="Unidade" value={franquiaData.nome_fantasia} />
                    <InfoItem icon={MapPin} label="Cidade" value={franquiaData.cidade} />
                    <InfoItem icon={MapPin} label="Estado" value={franquiaData.uf} />
                  </div>
                  <div className="mt-4">
                    <Link
                      to={`/franqueados/${franquiaData.id}`}
                      className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                    >
                      Ver detalhes da franquia <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Marketing */}
          <TabsContent value="marketing" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Origem e Campanha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Origem Visual */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-50 border border-cyan-100">
                    <Target className="h-5 w-5 text-cyan-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Origem</p>
                      <p className="text-sm font-medium">{lead.origem || "Nao informado"}</p>
                    </div>
                  </div>
                  {/* Campanha Visual */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                    <Tag className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Campanha</p>
                      <p className="text-sm font-medium">{lead.campanha || "Nao informado"}</p>
                    </div>
                  </div>
                  {/* Unidade Visual */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Unidade de Contato</p>
                      <p className="text-sm font-medium">{franquiaData?.nome_fantasia || lead.unidade || "Nao informado"}</p>
                    </div>
                  </div>
                  {/* Tipo Visual */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <Globe className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="text-sm font-medium">{lead.lead_source === "promocao" ? "Landing Page" : "Formulario Web"}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <InfoItem icon={Link2} label="Landing Page URL" value={lead.landing_page} isLink />
                  <InfoItem icon={Link2} label="Referrer" value={lead.referrer} isLink />
                </div>
              </CardContent>
            </Card>

            {/* Indicacao de Influenciadora */}
            {influenciadoraIndicacao && (
              <Card className="border-pink-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-pink-600 fill-pink-200" />
                    Indicacao de Influenciadora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-pink-50">
                      <Star className="h-5 w-5 text-pink-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Influenciadora</p>
                        <p className="text-sm font-medium">{influenciadoraIndicacao.influenciadora.nome_artistico || influenciadoraIndicacao.influenciadora.nome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-pink-50">
                      <Gift className="h-5 w-5 text-pink-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Codigo Usado</p>
                        <p className="text-sm font-mono font-medium">{influenciadoraIndicacao.codigo_usado}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-pink-50">
                      <Calendar className="h-5 w-5 text-pink-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data da Indicacao</p>
                        <p className="text-sm font-medium">{format(new Date(influenciadoraIndicacao.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parametros UTM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoItem icon={Tag} label="UTM Source" value={lead.utm_source} />
                  <InfoItem icon={Tag} label="UTM Medium" value={lead.utm_medium} />
                  <InfoItem icon={Tag} label="UTM Campaign" value={lead.utm_campaign} />
                  <InfoItem icon={Tag} label="UTM Content" value={lead.utm_content} />
                  <InfoItem icon={Tag} label="UTM Term" value={lead.utm_term} />
                </div>
                {!lead.utm_source && !lead.utm_medium && !lead.utm_campaign && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhum parametro UTM registrado para este lead.
                  </p>
                )}
              </CardContent>
            </Card>

          </TabsContent>

          {/* Tab Tecnico */}
          <TabsContent value="tecnico" className="space-y-4 mt-4">
            {/* Dispositivo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {submissaoData?.device_type === 'mobile' ? (
                    <Smartphone className="h-4 w-4 text-blue-500" />
                  ) : submissaoData?.device_type === 'tablet' ? (
                    <Tablet className="h-4 w-4 text-purple-500" />
                  ) : (
                    <Laptop className="h-4 w-4 text-slate-500" />
                  )}
                  Dispositivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoItem
                    icon={submissaoData?.device_type === 'mobile' ? Smartphone : submissaoData?.device_type === 'tablet' ? Tablet : Laptop}
                    label="Tipo"
                    value={submissaoData?.device_type ? submissaoData.device_type.charAt(0).toUpperCase() + submissaoData.device_type.slice(1) : null}
                  />
                  <InfoItem icon={Smartphone} label="Marca" value={submissaoData?.device_brand} />
                  <InfoItem icon={Smartphone} label="Modelo" value={submissaoData?.device_model} />
                  <InfoItem icon={Monitor} label="Plataforma" value={submissaoData?.platform} />
                  <InfoItem icon={Globe} label="Sistema Operacional" value={submissaoData?.os ? `${submissaoData.os} ${submissaoData.os_version || ''}`.trim() : null} />
                  <InfoItem icon={Globe} label="Navegador" value={submissaoData?.browser ? `${submissaoData.browser} ${submissaoData.browser_version || ''}`.trim() : null} />
                </div>
                {!submissaoData?.device_type && !submissaoData?.device_model && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhuma informacao de dispositivo registrada.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tela e Viewport */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Maximize2 className="h-4 w-4 text-indigo-500" />
                  Tela e Viewport
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoItem
                    icon={Monitor}
                    label="Resolucao da Tela"
                    value={submissaoData?.screen_width && submissaoData?.screen_height ? `${submissaoData.screen_width} x ${submissaoData.screen_height}` : null}
                  />
                  <InfoItem
                    icon={Maximize2}
                    label="Viewport"
                    value={submissaoData?.viewport_width && submissaoData?.viewport_height ? `${submissaoData.viewport_width} x ${submissaoData.viewport_height}` : null}
                  />
                  <InfoItem
                    icon={Smartphone}
                    label="Touch Screen"
                    value={submissaoData?.is_touch_device !== null && submissaoData?.is_touch_device !== undefined ? (submissaoData.is_touch_device ? 'Sim' : 'Nao') : null}
                  />
                  <InfoItem
                    icon={Cookie}
                    label="Cookies"
                    value={submissaoData?.cookies_enabled !== null && submissaoData?.cookies_enabled !== undefined ? (submissaoData.cookies_enabled ? 'Habilitados' : 'Desabilitados') : null}
                  />
                </div>
                {!submissaoData?.screen_width && !submissaoData?.viewport_width && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhuma informacao de tela registrada.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Conexao e Localizacao */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  Conexao e Localizacao
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoItem icon={Globe} label="Endereco IP" value={submissaoData?.ip_address} />
                  <InfoItem icon={Wifi} label="Tipo de Conexao" value={submissaoData?.connection_type?.toUpperCase()} />
                  <InfoItem icon={Clock} label="Fuso Horario" value={submissaoData?.timezone} />
                  <InfoItem icon={Languages} label="Idioma" value={submissaoData?.language} />
                </div>
                {!submissaoData?.ip_address && !submissaoData?.timezone && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhuma informacao de conexao registrada.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Sessao e Comportamento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="h-4 w-4 text-amber-500" />
                  Sessao e Comportamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={Hash} label="Session ID" value={submissaoData?.session_id} />
                  <InfoItem
                    icon={Timer}
                    label="Tempo de Preenchimento"
                    value={submissaoData?.tempo_preenchimento_segundos ? `${Math.floor(submissaoData.tempo_preenchimento_segundos / 60)}m ${submissaoData.tempo_preenchimento_segundos % 60}s` : null}
                  />
                  <InfoItem icon={ExternalLink} label="Referrer (Origem)" value={submissaoData?.referrer} />
                </div>
                {!submissaoData?.session_id && !submissaoData?.tempo_preenchimento_segundos && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhuma informacao de sessao registrada.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* User Agent Completo */}
            {submissaoData?.user_agent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-slate-500" />
                    User Agent Completo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-mono bg-muted/50 p-3 rounded-lg break-all">
                    {submissaoData.user_agent}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Metadados do Registro */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Hash className="h-4 w-4 text-slate-500" />
                  Metadados do Registro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem icon={Hash} label="ID do Lead" value={lead.id} />
                  <InfoItem icon={Hash} label="ID Giga (Sistema Externo)" value={lead.id_giga?.toString()} />
                  <InfoItem icon={Hash} label="ID do Franqueado" value={lead.franqueado_id} />
                  <InfoItem icon={Hash} label="ID do Responsável" value={lead.responsible_id} />
                </div>
              </CardContent>
            </Card>

            {/* IDs de Rastreamento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-orange-500" />
                  IDs de Rastreamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoItem icon={Tag} label="Google Click ID (gclid)" value={lead.gclid} />
                  <InfoItem icon={Tag} label="Facebook Click ID (fbclid)" value={lead.fbclid} />
                  <InfoItem icon={Tag} label="TikTok Click ID (ttclid)" value={lead.ttclid} />
                  <InfoItem icon={Tag} label="Microsoft Click ID (msclkid)" value={lead.msclkid} />
                  <InfoItem icon={Tag} label="LinkedIn Click ID (li_fat_id)" value={lead.li_fat_id} />
                </div>
                {!lead.gclid && !lead.fbclid && !lead.ttclid && !lead.msclkid && !lead.li_fat_id && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhum ID de rastreamento registrado.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* URLs de Origem */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-cyan-500" />
                  URLs de Origem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <InfoItem icon={ExternalLink} label="Landing Page" value={lead.landing_page} />
                  <InfoItem icon={ExternalLink} label="Embed URL" value={lead.embed_url} />
                  <InfoItem icon={ExternalLink} label="Referrer URL" value={lead.referrer_url} />
                </div>
                {!lead.landing_page && !lead.embed_url && !lead.referrer_url && (
                  <p className="text-sm text-muted-foreground text-center py-4 mt-4 bg-muted/30 rounded-lg">
                    Nenhuma URL de origem registrada.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Meta Messenger - Lazy load: só renderiza quando ativa */}
          <TabsContent value="meta-messenger" className="space-y-4 mt-4">
            {activeTab === 'meta-messenger' && <MetaMessengerTab leadId={id!} />}
          </TabsContent>

          {/* Tab Indicacoes */}
          <TabsContent value="indicacoes" className="space-y-4 mt-4">
            {/* Codigo de Indicacao - Sempre visível */}
            <Card className={`${lead.codigo_indicacao ? "border-primary/20 bg-primary/5" : "border-dashed border-2 border-muted-foreground/25"}`}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className={`h-4 w-4 ${lead.codigo_indicacao ? "text-primary" : "text-muted-foreground"}`} />
                  Codigo de Indicacao
                </CardTitle>
                {lead.codigo_indicacao && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={generateIndicationCode}
                    disabled={isGeneratingCode}
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Regenerar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.codigo_indicacao ? (
                  <>
                    {/* Grid com Código e QR Code lado a lado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Coluna do Código */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                          <span className="text-2xl font-bold tracking-widest text-primary">
                            {lead.codigo_indicacao}
                          </span>
                          <Button variant="outline" size="icon" onClick={handleCopyCodigoIndicacao}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Estatísticas */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center p-2 bg-white rounded-lg border">
                            <p className="text-lg font-bold text-primary">
                              {lead.quantidade_indicacoes || indicados.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Indicacoes</p>
                          </div>
                          <div className="text-center p-2 bg-white rounded-lg border">
                            <p className="text-lg font-bold text-emerald-600">
                              {indicados.filter(i => i.status === "convertido").length}
                            </p>
                            <p className="text-xs text-muted-foreground">Convertidos</p>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex gap-2">
                          <Button className="flex-1 gap-2" onClick={handleCopyLinkIndicacao}>
                            <Share2 className="h-4 w-4" />
                            Copiar Link
                          </Button>
                        </div>
                      </div>

                      {/* Coluna do QR Code */}
                      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border">
                        <div className="mb-3">
                          <QRCodeSVG
                            id="qr-code-indicacao"
                            value={gerarLinkIndicacao(lead.codigo_indicacao)}
                            size={140}
                            level="H"
                            includeMargin={true}
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center mb-2">
                          Escaneie para acessar o formulario
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            const svg = document.getElementById('qr-code-indicacao');
                            if (!svg) return;
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = img.width;
                              canvas.height = img.height;
                              ctx?.drawImage(img, 0, 0);
                              const pngFile = canvas.toDataURL('image/png');
                              const downloadLink = document.createElement('a');
                              downloadLink.download = `qrcode-indicacao-${lead.codigo_indicacao}.png`;
                              downloadLink.href = pngFile;
                              downloadLink.click();
                            };
                            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                          }}
                        >
                          <Download className="h-3 w-3" />
                          Baixar QR
                        </Button>
                      </div>
                    </div>

                    {/* Link completo */}
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Link de indicacao:</p>
                      <p className="text-xs font-mono break-all">
                        {gerarLinkIndicacao(lead.codigo_indicacao)}
                      </p>
                    </div>
                  </>
                ) : (
                  /* Sem código - mostrar botão para gerar */
                  <div className="text-center py-6">
                    <div className="mb-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Este lead ainda não possui código de indicação
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Gere um código único de 6 caracteres para que este lead possa indicar outros clientes e acompanhar suas conversões.
                    </p>
                    <Button
                      className="gap-2"
                      onClick={generateIndicationCode}
                      disabled={isGeneratingCode}
                    >
                      {isGeneratingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando código...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Gerar Código de Indicação
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Explicação do Sistema */}
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <QrCode className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Como funciona o código de indicação?</p>
                    <ul className="text-blue-700 space-y-1 text-xs">
                      <li>• O lead compartilha o QR Code ou link com amigos</li>
                      <li>• Quando alguém se cadastra usando o link, fica vinculado a este lead</li>
                      <li>• Você pode acompanhar quantas indicações foram feitas e convertidas</li>
                      <li>• Cada código é único para este lead</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Indicacoes */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Indicacoes Realizadas ({indicados.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => navigate(`/leads/novo?indicador=${id}`)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Indicacao
                </Button>
              </CardHeader>
              <CardContent>
                {indicados.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Este lead ainda nao indicou ninguem.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {indicados.map(indicado => (
                      <div
                        key={indicado.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/70"
                        onClick={() => navigate(`/leads/${indicado.id}`)}
                      >
                        <div>
                          <p className="font-medium">{indicado.nome}</p>
                          <p className="text-sm text-muted-foreground">{indicado.telefone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              indicado.status === "convertido"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : ""
                            }
                          >
                            {STATUS_CONFIG[indicado.status]?.label || indicado.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(indicado.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Indicado por Influenciadora */}
            {influenciadoraIndicacao && (
              <Card className="border-pink-200 bg-pink-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-pink-600 fill-pink-200" />
                    Este lead foi indicado por uma Influenciadora
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{influenciadoraIndicacao.influenciadora.nome_artistico || influenciadoraIndicacao.influenciadora.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Codigo usado: <span className="font-mono font-medium">{influenciadoraIndicacao.codigo_usado}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Indicado em: {format(new Date(influenciadoraIndicacao.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/influenciadoras/${influenciadoraIndicacao.influenciadora.id}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver Influenciadora
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Indicador (quem indicou este lead) */}
            {indicador && (
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Este lead foi indicado por outro lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{indicador.nome}</p>
                      <p className="text-sm text-muted-foreground">{indicador.telefone}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/leads/${indicador.id}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver Lead
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog de Confirmacao de Exclusao */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o lead "{lead.nome}"? Esta acao nao pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
