import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useLeadAdapter, useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInputInternational } from "@/components/ui/phone-input-international";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatus, STATUS_OPTIONS, STATUS_CONFIG, COMO_CONHECEU_OPTIONS, ORIGEM_OPTIONS, LeadWithExtras, spreadDadosExtras } from "@/types/lead-mt";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  X,
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Target,
  FileText,
  Users,
  Link2,
  Search,
  UserPlus,
  Instagram,
  Facebook,
  Heart,
  Wallet,
  AlertTriangle,
  Globe,
  Tag,
  Shield,
  MessageCircle,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";

// Tipo para dados do funil retornados pela query Supabase
interface FunilData {
  id: string;
  valor_estimado: number | null;
  data_entrada: string | null;
  data_etapa: string | null;
  stage_id: string | null;
  responsavel_id: string | null;
  funil: { id: string; nome: string } | null;
  etapa: { id: string; nome: string; cor: string; ordem: number } | null;
  responsavel: { full_name: string } | null;
}

// Tipo para campanhas ativas
interface CampanhaAtiva {
  id: string;
  nome: string;
}

export default function LeadEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { hasPermission } = useUserPermissions();

  // Adapter que escolhe entre legacy e multi-tenant
  const { data: leadData, isLoading } = useLeadAdapter(id);
  const { leads: allLeads, createLead: createLeadMutation, updateLead: updateLeadMutation } = useLeadsAdapter();

  const { franqueados, isLoading: loadingFranqueados } = useFranqueadosAdapter();
  const { servicos, franqueadoServicos, getServicosByFranqueado } = useServicosAdapter();

  // Dados do funil do lead
  const { data: funilData } = useQuery<FunilData | null>({
    queryKey: ['lead-funil-data', id, tenant?.id],
    queryFn: async () => {
      if (!id) return null;
      let query = supabase
        .from('mt_funnel_leads')
        .select(`
          id,
          valor_estimado,
          data_entrada,
          data_etapa,
          stage_id,
          responsavel_id,
          funil:mt_funnels(id, nome),
          etapa:mt_funnel_stages(id, nome, cor, ordem),
          responsavel:mt_users!mt_funnel_leads_responsavel_id_fkey(full_name)
        `)
        .eq('lead_id', id)
        .is('removed_at', null)
        .order('data_entrada', { ascending: false })
        .limit(1);

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error } = await query.maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!id,
  });

  // Campanhas ativas do tenant para o select
  const { data: campanhasAtivas } = useQuery({
    queryKey: ['mt-campanhas-ativas', tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('mt_campaigns')
        .select('id, nome')
        .is('deleted_at', null)
        .order('nome');

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel === 'franchise' && franchise) {
        query = query.eq('franchise_id', franchise.id);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
    enabled: !!tenant,
  });

  const isNew = !id;
  // dados_extras é JSONB com campos extras (redes sociais, saúde, preferências, etc.)
  // Usamos spreadDadosExtras que espalha dados_extras no objeto para acesso direto
  const lead: LeadWithExtras | null = isNew ? null : (leadData ? spreadDadosExtras(leadData) : null);

  // Lista de leads para busca de indicadores (usado no filtro)
  const leads = allLeads || [];

  const [isSaving, setIsSaving] = useState(false);
  const [indicadorSearch, setIndicadorSearch] = useState("");
  const [selectedIndicador, setSelectedIndicador] = useState<{ id: string; nome: string; codigo?: string } | null>(null);

  const [formData, setFormData] = useState({
    // Dados pessoais básicos
    nome: "",
    sobrenome: "",
    telefone: "",
    telefone_codigo_pais: "55",
    whatsapp: "",
    whatsapp_codigo_pais: "55",
    email: "",
    telefone_secundario: "",
    telefone_secundario_codigo_pais: "55",
    // Documentos
    cpf: "",
    rg: "",
    // Endereço
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "Brasil",
    proximidade: "",
    // Dados adicionais
    data_nascimento: "",
    genero: "",
    profissao: "",
    como_conheceu: "",
    estado_civil: "" as string,
    nacionalidade: "",
    foto_url: "",
    // Redes Sociais
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    twitter: "",
    website: "",
    // Preferências de contato
    preferencia_contato: "" as string,
    melhor_horario_contato: "" as string,
    dia_preferencial: "",
    // Dados Financeiros
    chave_pix: "",
    tipo_chave_pix: "" as string,
    // Notas
    nota_interna: "",
    observacoes: "",
    // Saúde e Tratamento
    tipo_pele: "" as string,
    alergias: "",
    condicoes_medicas: "",
    medicamentos_uso: "",
    historico_tratamentos: "",
    areas_interesse: "",
    fotossensibilidade: false,
    gravidez_lactacao: false,
    // Contato de Emergência
    contato_emergencia_nome: "",
    contato_emergencia_telefone: "",
    contato_emergencia_telefone_codigo_pais: "55",
    contato_emergencia_parentesco: "",
    // Preferências de Comunicação
    aceita_marketing: true,
    aceita_pesquisa: true,
    consentimento: true,
    // Dados comerciais
    interesse: "",
    servicos_interesse: [] as string[],
    como_conheceu_outro: "",
    origem: "" as string,
    unidade: "",
    franqueado_id: "" as string,
    status: "novo" as LeadStatus,
    franquias_vinculadas: [] as string[],
    id_giga: null as number | null,
    id_api: "",
    // Indicação
    indicado_por_id: "" as string,
    codigo_indicacao: "",
    campanha: "",
    campanha_id: "",
    // UTM e Rastreamento
    landing_page: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    gclid: "",
    fbclid: "",
    ttclid: "",
    msclkid: "",
    li_fat_id: "",
    embed_url: "",
    referrer_url: "",
  });

  // Filtro para busca de indicadores
  const filteredIndicadores = useMemo(() => {
    if (!indicadorSearch.trim() || indicadorSearch.length < 2) return [];
    const search = indicadorSearch.toLowerCase();
    return leads.filter((l) =>
      l.nome?.toLowerCase().includes(search) ||
      l.codigo_indicacao?.toLowerCase().includes(search)
    ).slice(0, 5);
  }, [leads, indicadorSearch]);

  // Serviços disponíveis baseado na unidade selecionada (useMemo para evitar loop infinito)
  const availableServicos = useMemo(() => {
    if (formData.franqueado_id) {
      const servicosFranquia = getServicosByFranqueado(formData.franqueado_id);
      return servicosFranquia.map(s => s.nome);
    } else if (formData.unidade) {
      const franqueado = franqueados.find(f => f.nome_fantasia === formData.unidade);
      if (franqueado) {
        const servicosFranquia = getServicosByFranqueado(franqueado.id);
        return servicosFranquia.map(s => s.nome);
      }
    }
    return servicos.filter(s => s.ativo).map(s => s.nome);
  }, [formData.franqueado_id, formData.unidade, franqueados, servicos, getServicosByFranqueado]);

  useEffect(() => {
    if (lead) {
      setFormData({
        nome: lead.nome || "",
        sobrenome: lead.sobrenome || "",
        telefone: lead.telefone || "",
        telefone_codigo_pais: lead.telefone_codigo_pais || "55",
        whatsapp: lead.whatsapp || "",
        whatsapp_codigo_pais: lead.whatsapp_codigo_pais || "55",
        email: lead.email || "",
        telefone_secundario: lead.telefone_secundario || "",
        telefone_secundario_codigo_pais: lead.telefone_secundario_codigo_pais || "55",
        cpf: lead.cpf || "",
        rg: lead.rg || "",
        cep: lead.cep || "",
        endereco: lead.endereco || "",
        numero: lead.numero || "",
        complemento: lead.complemento || "",
        bairro: lead.bairro || "",
        cidade: lead.cidade || "",
        estado: lead.estado || "",
        pais: lead.pais || "Brasil",
        proximidade: lead.proximidade || "",
        data_nascimento: lead.data_nascimento || "",
        genero: lead.genero || "",
        profissao: lead.profissao || "",
        como_conheceu: lead.como_conheceu || "",
        estado_civil: lead.estado_civil || "",
        nacionalidade: lead.nacionalidade || "",
        foto_url: lead.foto_url || "",
        instagram: lead.instagram || "",
        facebook: lead.facebook || "",
        tiktok: lead.tiktok || "",
        youtube: lead.youtube || "",
        linkedin: lead.linkedin || "",
        twitter: lead.twitter || "",
        website: lead.website || "",
        preferencia_contato: lead.preferencia_contato || "",
        melhor_horario_contato: lead.melhor_horario_contato || "",
        dia_preferencial: lead.dia_preferencial || "",
        chave_pix: lead.chave_pix || "",
        tipo_chave_pix: lead.tipo_chave_pix || "",
        nota_interna: lead.nota_interna || "",
        observacoes: lead.observacoes || "",
        tipo_pele: lead.tipo_pele || "",
        alergias: lead.alergias || "",
        condicoes_medicas: lead.condicoes_medicas || "",
        medicamentos_uso: lead.medicamentos_uso || "",
        historico_tratamentos: lead.historico_tratamentos || "",
        areas_interesse: lead.areas_interesse || "",
        fotossensibilidade: lead.fotossensibilidade || false,
        gravidez_lactacao: lead.gravidez_lactacao || false,
        contato_emergencia_nome: lead.contato_emergencia_nome || "",
        contato_emergencia_telefone: lead.contato_emergencia_telefone || "",
        contato_emergencia_telefone_codigo_pais: lead.contato_emergencia_telefone_codigo_pais || "55",
        contato_emergencia_parentesco: lead.contato_emergencia_parentesco || "",
        aceita_marketing: lead.aceita_marketing !== false,
        aceita_pesquisa: lead.aceita_pesquisa !== false,
        consentimento: lead.consentimento !== false,
        interesse: lead.interesse || lead.servico_interesse || "",
        servicos_interesse: lead.servicos_interesse ||
          (lead.interesse || lead.servico_interesse
            ? [lead.interesse || lead.servico_interesse].filter(Boolean)
            : []),
        como_conheceu_outro: lead.como_conheceu_outro || "",
        origem: lead.origem || "",
        unidade: lead.unidade || "",
        franqueado_id: lead.franqueado_id || "",
        status: lead.status || "novo",
        franquias_vinculadas: lead.franquias_vinculadas || [],
        id_giga: lead.id_giga || null,
        id_api: lead.id_api || "",
        indicado_por_id: lead.indicado_por_id || "",
        codigo_indicacao: lead.codigo_indicacao || "",
        campanha: lead.campanha || "",
        campanha_id: lead.campanha_id || "",
        landing_page: lead.landing_page || "",
        utm_source: lead.utm_source || "",
        utm_medium: lead.utm_medium || "",
        utm_campaign: lead.utm_campaign || "",
        utm_content: lead.utm_content || "",
        utm_term: lead.utm_term || "",
        gclid: lead.gclid || "",
        fbclid: lead.fbclid || "",
        ttclid: lead.ttclid || "",
        msclkid: lead.msclkid || "",
        li_fat_id: lead.li_fat_id || "",
        embed_url: lead.embed_url || "",
        referrer_url: lead.referrer_url || "",
      });

      // Se o lead foi indicado, buscar o indicador
      if (lead.indicado_por_id) {
        const indicador = leads.find((l) => l.id === lead.indicado_por_id);
        if (indicador) {
          setSelectedIndicador({
            id: indicador.id,
            nome: indicador.nome,
            codigo: indicador.codigo_indicacao,
          });
        }
      }
    }
  }, [lead, leads]);

  // Pre-fill from query params (e.g. from LeadPanel "Criar Lead" button)
  useEffect(() => {
    if (!isNew) return;
    const telefoneParam = searchParams.get('telefone');
    const nomeParam = searchParams.get('nome');
    if (telefoneParam || nomeParam) {
      setFormData(prev => ({
        ...prev,
        ...(telefoneParam ? { telefone: telefoneParam } : {}),
        ...(nomeParam ? { nome: nomeParam } : {}),
      }));
    }
  }, [isNew, searchParams]);

  if (isLoading || loadingFranqueados) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isNew && !lead) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Lead não encontrado</h2>
          <p className="text-muted-foreground mb-4">O lead solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/")}>Voltar para Leads</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de permissão
    if (isNew && !hasPermission('leads.create')) {
      toast.error('Você não tem permissão para criar leads');
      return;
    }
    if (!isNew && !hasPermission('leads.edit')) {
      toast.error('Você não tem permissão para editar leads');
      return;
    }

    if (!formData.nome || !formData.telefone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setIsSaving(true);

    try {
      // Sync servico_interesse (coluna real) com o primeiro do array multi-select
      const dataWithSync = {
        ...formData,
        servico_interesse: formData.servicos_interesse.length > 0 ? formData.servicos_interesse[0] : null,
        interesse: formData.servicos_interesse.length > 0 ? formData.servicos_interesse[0] : null,
      };

      // Limpa valores vazios
      const cleanData = Object.fromEntries(
        Object.entries(dataWithSync).map(([key, value]) => [
          key,
          value === "" ? null : value
        ])
      );

      if (isNew) {
        createLeadMutation.mutate(cleanData as Record<string, unknown>);
        toast.success("Lead criado com sucesso!");
        navigate("/");
      } else {
        updateLeadMutation.mutate({ id: lead!.id, ...cleanData } as Record<string, unknown> & { id: string });
        toast.success("Lead atualizado com sucesso!");
        navigate(`/leads/${lead!.id}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnidadeToggle = (unidadeId: string) => {
    setFormData(prev => {
      const current = prev.franquias_vinculadas;
      if (current.includes(unidadeId)) {
        return { ...prev, franquias_vinculadas: current.filter(u => u !== unidadeId) };
      } else {
        return { ...prev, franquias_vinculadas: [...current, unidadeId] };
      }
    });
  };

  // Filtrar franquias visíveis por nível de acesso
  const availableFranquias = useMemo(() => {
    if (accessLevel === 'franchise' && franchise) {
      return franqueados.filter(f => f.id === franchise.id);
    }
    return franqueados;
  }, [franqueados, accessLevel, franchise]);

  // Toggle de serviço para multi-select
  const handleServicoToggle = (servicoNome: string) => {
    setFormData(prev => {
      const current = prev.servicos_interesse;
      if (current.includes(servicoNome)) {
        return { ...prev, servicos_interesse: current.filter(s => s !== servicoNome) };
      } else {
        return { ...prev, servicos_interesse: [...current, servicoNome] };
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(isNew ? "/" : `/leads/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {isNew ? "Novo Lead" : "Editar Lead"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNew ? "Cadastre um novo lead" : `Editando: ${lead?.nome}`}
            </p>
          </div>
          <Button type="submit" form="lead-form" disabled={isSaving || !formData.nome || !formData.telefone}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {isNew ? "Criar Lead" : "Salvar"}
          </Button>
        </div>

        <form id="lead-form" onSubmit={handleSubmit}>
          <Tabs defaultValue="dados" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="dados" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Dados</span>
              </TabsTrigger>
              <TabsTrigger value="endereco" className="gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Endereço</span>
              </TabsTrigger>
              <TabsTrigger value="contato" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Contato</span>
              </TabsTrigger>
              <TabsTrigger value="saude" className="gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Saúde</span>
              </TabsTrigger>
              <TabsTrigger value="comercial" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Comercial</span>
              </TabsTrigger>
              <TabsTrigger value="rastreamento" className="gap-2">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">UTM</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Dados Pessoais */}
            <TabsContent value="dados">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Dados Pessoais
                  </CardTitle>
                  <CardDescription>Informações básicas do lead</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Nome */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sobrenome">Sobrenome</Label>
                      <Input
                        id="sobrenome"
                        value={formData.sobrenome}
                        onChange={(e) => setFormData(prev => ({ ...prev, sobrenome: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Documentos */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input
                        id="rg"
                        value={formData.rg}
                        onChange={(e) => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Dados Adicionais */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                      <Input
                        id="data_nascimento"
                        type="date"
                        value={formData.data_nascimento}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="genero">Gênero</Label>
                      <Select
                        value={formData.genero}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, genero: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                          <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado_civil">Estado Civil</Label>
                      <Select
                        value={formData.estado_civil}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, estado_civil: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                          <SelectItem value="casado">Casado(a)</SelectItem>
                          <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                          <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                          <SelectItem value="uniao_estavel">União Estável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profissao">Profissão</Label>
                      <Input
                        id="profissao"
                        value={formData.profissao}
                        onChange={(e) => setFormData(prev => ({ ...prev, profissao: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nacionalidade">Nacionalidade</Label>
                      <Input
                        id="nacionalidade"
                        value={formData.nacionalidade}
                        onChange={(e) => setFormData(prev => ({ ...prev, nacionalidade: e.target.value }))}
                        placeholder="Brasileira"
                      />
                    </div>
                  </div>

                  {/* Dados Financeiros */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Dados Financeiros (para reembolsos)
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tipo_chave_pix">Tipo de Chave PIX</Label>
                        <Select
                          value={formData.tipo_chave_pix}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_chave_pix: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cpf">CPF</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="telefone">Telefone</SelectItem>
                            <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="chave_pix">Chave PIX</Label>
                        <Input
                          id="chave_pix"
                          value={formData.chave_pix}
                          onChange={(e) => setFormData(prev => ({ ...prev, chave_pix: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Endereço */}
            <TabsContent value="endereco">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Endereço
                  </CardTitle>
                  <CardDescription>Localização do lead</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={formData.cep}
                        onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="endereco">Logradouro</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={formData.complemento}
                        onChange={(e) => setFormData(prev => ({ ...prev, complemento: e.target.value }))}
                        placeholder="Apto, Bloco, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        value={formData.bairro}
                        onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={formData.cidade}
                        onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={formData.estado}
                        onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                        placeholder="SP, RJ, MG..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pais">País</Label>
                      <Input
                        id="pais"
                        value={formData.pais}
                        onChange={(e) => setFormData(prev => ({ ...prev, pais: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proximidade">Ponto de Referência</Label>
                    <Input
                      id="proximidade"
                      value={formData.proximidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, proximidade: e.target.value }))}
                      placeholder="Próximo a..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Contato e Redes */}
            <TabsContent value="contato">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Contato e Redes Sociais
                  </CardTitle>
                  <CardDescription>Formas de contato e redes sociais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Telefones */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone Principal *</Label>
                      <PhoneInputInternational
                        id="telefone"
                        value={formData.telefone}
                        countryCode={formData.telefone_codigo_pais}
                        onChange={(value) => setFormData(prev => ({ ...prev, telefone: value }))}
                        onCountryChange={(code) => setFormData(prev => ({ ...prev, telefone_codigo_pais: code }))}
                        showCountryName
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <PhoneInputInternational
                        id="whatsapp"
                        value={formData.whatsapp}
                        countryCode={formData.whatsapp_codigo_pais}
                        onChange={(value) => setFormData(prev => ({ ...prev, whatsapp: value }))}
                        onCountryChange={(code) => setFormData(prev => ({ ...prev, whatsapp_codigo_pais: code }))}
                        placeholder="Se diferente do principal"
                        showCountryName
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone_secundario">Telefone Secundário</Label>
                      <PhoneInputInternational
                        id="telefone_secundario"
                        value={formData.telefone_secundario}
                        countryCode={formData.telefone_secundario_codigo_pais}
                        onChange={(value) => setFormData(prev => ({ ...prev, telefone_secundario: value }))}
                        onCountryChange={(code) => setFormData(prev => ({ ...prev, telefone_secundario_codigo_pais: code }))}
                        showCountryName
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  {/* Preferências de Contato */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4">Preferências de Contato</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="preferencia_contato">Canal Preferido</Label>
                        <Select
                          value={formData.preferencia_contato}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, preferencia_contato: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="telefone">Telefone</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="melhor_horario_contato">Melhor Horário</Label>
                        <Select
                          value={formData.melhor_horario_contato}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, melhor_horario_contato: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manha">Manhã (8h-12h)</SelectItem>
                            <SelectItem value="tarde">Tarde (12h-18h)</SelectItem>
                            <SelectItem value="noite">Noite (18h-21h)</SelectItem>
                            <SelectItem value="qualquer">Qualquer horário</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dia_preferencial">Dia Preferencial</Label>
                        <Input
                          id="dia_preferencial"
                          value={formData.dia_preferencial}
                          onChange={(e) => setFormData(prev => ({ ...prev, dia_preferencial: e.target.value }))}
                          placeholder="Segunda a Sexta, Sábado..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Redes Sociais */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4">Redes Sociais</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="instagram" className="flex items-center gap-2">
                          <Instagram className="h-4 w-4 text-pink-500" />
                          Instagram
                        </Label>
                        <Input
                          id="instagram"
                          value={formData.instagram}
                          onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                          placeholder="@usuario"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="facebook" className="flex items-center gap-2">
                          <Facebook className="h-4 w-4 text-blue-600" />
                          Facebook
                        </Label>
                        <Input
                          id="facebook"
                          value={formData.facebook}
                          onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                          placeholder="URL ou username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tiktok">TikTok</Label>
                        <Input
                          id="tiktok"
                          value={formData.tiktok}
                          onChange={(e) => setFormData(prev => ({ ...prev, tiktok: e.target.value }))}
                          placeholder="@usuario"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="youtube">YouTube</Label>
                        <Input
                          id="youtube"
                          value={formData.youtube}
                          onChange={(e) => setFormData(prev => ({ ...prev, youtube: e.target.value }))}
                          placeholder="URL do canal"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          value={formData.linkedin}
                          onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                          placeholder="URL do perfil"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter">Twitter/X</Label>
                        <Input
                          id="twitter"
                          value={formData.twitter}
                          onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
                          placeholder="@usuario"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  {/* Contato de Emergência */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Contato de Emergência
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="contato_emergencia_nome">Nome</Label>
                        <Input
                          id="contato_emergencia_nome"
                          value={formData.contato_emergencia_nome}
                          onChange={(e) => setFormData(prev => ({ ...prev, contato_emergencia_nome: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contato_emergencia_telefone">Telefone</Label>
                        <PhoneInputInternational
                          id="contato_emergencia_telefone"
                          value={formData.contato_emergencia_telefone}
                          countryCode={formData.contato_emergencia_telefone_codigo_pais}
                          onChange={(value) => setFormData(prev => ({ ...prev, contato_emergencia_telefone: value }))}
                          onCountryChange={(code) => setFormData(prev => ({ ...prev, contato_emergencia_telefone_codigo_pais: code }))}
                          showCountryName
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contato_emergencia_parentesco">Parentesco</Label>
                        <Input
                          id="contato_emergencia_parentesco"
                          value={formData.contato_emergencia_parentesco}
                          onChange={(e) => setFormData(prev => ({ ...prev, contato_emergencia_parentesco: e.target.value }))}
                          placeholder="Mãe, Pai, Cônjuge..."
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Saúde */}
            <TabsContent value="saude">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Informações de Saúde
                  </CardTitle>
                  <CardDescription>Dados importantes para tratamentos a laser</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tipo_pele">Tipo de Pele (Fitzpatrick)</Label>
                      <Select
                        value={formData.tipo_pele}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_pele: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="I">Tipo I - Muito clara</SelectItem>
                          <SelectItem value="II">Tipo II - Clara</SelectItem>
                          <SelectItem value="III">Tipo III - Morena clara</SelectItem>
                          <SelectItem value="IV">Tipo IV - Morena</SelectItem>
                          <SelectItem value="V">Tipo V - Morena escura</SelectItem>
                          <SelectItem value="VI">Tipo VI - Negra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="areas_interesse">Áreas de Interesse</Label>
                      <Input
                        id="areas_interesse"
                        value={formData.areas_interesse}
                        onChange={(e) => setFormData(prev => ({ ...prev, areas_interesse: e.target.value }))}
                        placeholder="Rosto, axilas, virilha..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alergias">Alergias</Label>
                    <Textarea
                      id="alergias"
                      value={formData.alergias}
                      onChange={(e) => setFormData(prev => ({ ...prev, alergias: e.target.value }))}
                      placeholder="Descreva alergias conhecidas..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condicoes_medicas">Condições Médicas</Label>
                    <Textarea
                      id="condicoes_medicas"
                      value={formData.condicoes_medicas}
                      onChange={(e) => setFormData(prev => ({ ...prev, condicoes_medicas: e.target.value }))}
                      placeholder="Diabetes, problemas de pele, etc..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medicamentos_uso">Medicamentos em Uso</Label>
                    <Textarea
                      id="medicamentos_uso"
                      value={formData.medicamentos_uso}
                      onChange={(e) => setFormData(prev => ({ ...prev, medicamentos_uso: e.target.value }))}
                      placeholder="Lista de medicamentos..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="historico_tratamentos">Histórico de Tratamentos</Label>
                    <Textarea
                      id="historico_tratamentos"
                      value={formData.historico_tratamentos}
                      onChange={(e) => setFormData(prev => ({ ...prev, historico_tratamentos: e.target.value }))}
                      placeholder="Tratamentos anteriores realizados..."
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label>Fotossensibilidade</Label>
                        <p className="text-xs text-muted-foreground">Sensibilidade à luz solar</p>
                      </div>
                      <Switch
                        checked={formData.fotossensibilidade}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, fotossensibilidade: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <Label>Gravidez/Lactação</Label>
                        <p className="text-xs text-muted-foreground">Contraindicação para tratamentos</p>
                      </div>
                      <Switch
                        checked={formData.gravidez_lactacao}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, gravidez_lactacao: checked }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Comercial */}
            <TabsContent value="comercial">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados Comerciais
                  </CardTitle>
                  <CardDescription>Informações de vendas e unidades</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status e Origem */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as LeadStatus }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_CONFIG[status]?.label || status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="origem">Origem</Label>
                      <Select
                        value={formData.origem || ""}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, origem: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                        <SelectContent>
                          {ORIGEM_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Funil de Vendas (read-only) */}
                  {funilData && (
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-medium">Funil de Vendas</h3>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <span className="text-xs text-muted-foreground">Funil</span>
                          <p className="text-sm font-medium">{funilData.funil?.nome || 'Sem funil'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Etapa Atual</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {funilData.etapa?.cor && (
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: funilData.etapa.cor }} />
                            )}
                            <p className="text-sm font-medium">{funilData.etapa?.nome || 'Sem etapa'}</p>
                          </div>
                        </div>
                        {funilData.valor_estimado ? (
                          <div>
                            <span className="text-xs text-muted-foreground">Valor Estimado</span>
                            <p className="text-sm font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(funilData.valor_estimado)}
                            </p>
                          </div>
                        ) : null}
                        {funilData.responsavel?.full_name && (
                          <div>
                            <span className="text-xs text-muted-foreground">Responsavel</span>
                            <p className="text-sm font-medium">{funilData.responsavel.full_name}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => funilData.funil && navigate(`/funil/${funilData.funil.id}`)}
                      >
                        <TrendingUp className="h-3.5 w-3.5 mr-2" />
                        Ver no Funil
                      </Button>
                    </div>
                  )}

                  {/* Marketing Info (read-only) */}
                  {lead && (lead.influenciador_id || lead.influenciador_codigo || lead.parceria_id || lead.landing_page) && (
                    <div className="border rounded-lg p-4 bg-purple-50/50 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <h3 className="text-sm font-medium text-purple-900">Origem de Marketing</h3>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        {lead.influenciador_codigo && (
                          <div>
                            <span className="text-xs text-muted-foreground">Influenciadora</span>
                            <p className="font-medium">{lead.influenciador_codigo}</p>
                          </div>
                        )}
                        {lead.parceria_id && (
                          <div>
                            <span className="text-xs text-muted-foreground">Parceria</span>
                            <p className="font-medium">{lead.parceria_codigo || 'Vinculado'}</p>
                          </div>
                        )}
                        {lead.landing_page && (
                          <div className="sm:col-span-2">
                            <span className="text-xs text-muted-foreground">Landing Page</span>
                            <p className="font-medium text-xs truncate">
                              <a href={lead.landing_page} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {lead.landing_page}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Franquia */}
                  <div className="space-y-2">
                    <Label htmlFor="franqueado_id">Unidade Principal</Label>
                    <Select
                      value={formData.franqueado_id}
                      onValueChange={(value) => {
                        const franqueado = franqueados.find(f => f.id === value);
                        setFormData(prev => ({
                          ...prev,
                          franqueado_id: value,
                          unidade: franqueado?.nome_fantasia || prev.unidade
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {franqueados.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome_fantasia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Serviços de Interesse (multi-select) e Como Conheceu */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Serviços de Interesse</Label>
                      {formData.servicos_interesse.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {formData.servicos_interesse.map((s) => (
                            <Badge key={s} variant="secondary" className="gap-1 text-xs">
                              {s}
                              <button
                                type="button"
                                onClick={() => handleServicoToggle(s)}
                                className="ml-0.5 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                        {availableServicos.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-1">Selecione uma unidade primeiro</p>
                        ) : (
                          availableServicos.map((servicoNome) => (
                            <div key={servicoNome} className="flex items-center space-x-2">
                              <Checkbox
                                id={`servico-${servicoNome}`}
                                checked={formData.servicos_interesse.includes(servicoNome)}
                                onCheckedChange={() => handleServicoToggle(servicoNome)}
                              />
                              <label htmlFor={`servico-${servicoNome}`} className="text-sm cursor-pointer">
                                {servicoNome}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="como_conheceu">Como Conheceu</Label>
                      <Select
                        value={formData.como_conheceu || ""}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          como_conheceu: value,
                          como_conheceu_outro: value !== 'outro' ? '' : prev.como_conheceu_outro
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione como conheceu" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMO_CONHECEU_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.como_conheceu === 'outro' && (
                        <Input
                          id="como_conheceu_outro"
                          value={formData.como_conheceu_outro}
                          onChange={(e) => setFormData(prev => ({ ...prev, como_conheceu_outro: e.target.value }))}
                          placeholder="Especifique como conheceu..."
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Indicação */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <UserPlus className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">Indicação</h3>
                    </div>

                    {selectedIndicador ? (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{selectedIndicador.nome}</p>
                            {selectedIndicador.codigo && (
                              <p className="text-xs text-muted-foreground">
                                Código: {selectedIndicador.codigo}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedIndicador(null);
                              setFormData((prev) => ({ ...prev, indicado_por_id: "" }));
                              setIndicadorSearch("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por nome ou código de indicação..."
                            value={indicadorSearch}
                            onChange={(e) => setIndicadorSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>

                        {filteredIndicadores.length > 0 && (
                          <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                            {filteredIndicadores.map((indicador) => (
                              <button
                                key={indicador.id}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  setSelectedIndicador({
                                    id: indicador.id,
                                    nome: indicador.nome,
                                    codigo: indicador.codigo_indicacao,
                                  });
                                  setFormData((prev) => ({ ...prev, indicado_por_id: indicador.id }));
                                  setIndicadorSearch("");
                                }}
                              >
                                <p className="font-medium text-sm">{indicador.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {indicador.codigo_indicacao || indicador.telefone}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="codigo_indicacao">Código de Indicação (deste lead)</Label>
                        <Input
                          id="codigo_indicacao"
                          value={formData.codigo_indicacao}
                          onChange={(e) => setFormData(prev => ({ ...prev, codigo_indicacao: e.target.value.toUpperCase() }))}
                          placeholder="ABC123"
                          maxLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="campanha">Campanha</Label>
                        {campanhasAtivas && campanhasAtivas.length > 0 ? (
                          <Select
                            value={formData.campanha || ""}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, campanha: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a campanha" />
                            </SelectTrigger>
                            <SelectContent>
                              {campanhasAtivas.map((c) => (
                                <SelectItem key={c.id} value={c.nome}>
                                  {c.nome}
                                </SelectItem>
                              ))}
                              <SelectItem value="__manual__">Digitar manualmente...</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="campanha"
                            value={formData.campanha}
                            onChange={(e) => setFormData(prev => ({ ...prev, campanha: e.target.value }))}
                            placeholder="Nome da campanha"
                          />
                        )}
                        {formData.campanha === '__manual__' && (
                          <Input
                            value=""
                            onChange={(e) => setFormData(prev => ({ ...prev, campanha: e.target.value }))}
                            placeholder="Digite o nome da campanha..."
                            className="mt-2"
                            autoFocus
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unidades Vinculadas */}
                  <div className="border-t pt-4">
                    <Label className="mb-4 block">Unidades Vinculadas (múltiplas)</Label>

                    {formData.franquias_vinculadas.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.franquias_vinculadas.map((unidadeId) => {
                          const franquia = franqueados.find(f => f.id === unidadeId);
                          return (
                            <Badge key={unidadeId} variant="secondary" className="gap-1">
                              {franquia?.nome_fantasia || unidadeId}
                              <button
                                type="button"
                                onClick={() => handleUnidadeToggle(unidadeId)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {availableFranquias.map((f) => (
                        <div key={f.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`unidade-${f.id}`}
                            checked={formData.franquias_vinculadas.includes(f.id)}
                            onCheckedChange={() => handleUnidadeToggle(f.id)}
                          />
                          <label htmlFor={`unidade-${f.id}`} className="text-sm cursor-pointer">
                            {f.nome_fantasia}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* IDs Externos */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4">Integrações</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="id_giga">ID Giga (Viniun Office (deprecated))</Label>
                        <Input
                          id="id_giga"
                          type="number"
                          value={formData.id_giga || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, id_giga: e.target.value ? Number(e.target.value) : null }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="id_api">ID API Externa</Label>
                        <Input
                          id="id_api"
                          value={formData.id_api}
                          onChange={(e) => setFormData(prev => ({ ...prev, id_api: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferências de Comunicação */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Consentimentos
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <Label>Aceita Marketing</Label>
                          <p className="text-xs text-muted-foreground">Receber promoções e novidades</p>
                        </div>
                        <Switch
                          checked={formData.aceita_marketing}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aceita_marketing: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <Label>Aceita Pesquisas</Label>
                          <p className="text-xs text-muted-foreground">Participar de pesquisas de satisfação</p>
                        </div>
                        <Switch
                          checked={formData.aceita_pesquisa}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aceita_pesquisa: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <Label>Consentimento LGPD</Label>
                          <p className="text-xs text-muted-foreground">Aceita os termos de uso de dados</p>
                        </div>
                        <Switch
                          checked={formData.consentimento}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consentimento: checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="observacoes">Observações</Label>
                      <Textarea
                        id="observacoes"
                        value={formData.observacoes}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                        placeholder="Anotações visíveis para a equipe..."
                        className="min-h-[100px]"
                      />
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="nota_interna">Nota Interna (privada)</Label>
                      <Textarea
                        id="nota_interna"
                        value={formData.nota_interna}
                        onChange={(e) => setFormData(prev => ({ ...prev, nota_interna: e.target.value }))}
                        placeholder="Notas privadas para uso interno..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Rastreamento UTM */}
            <TabsContent value="rastreamento">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Rastreamento e UTM
                  </CardTitle>
                  <CardDescription>Parâmetros de origem e rastreamento de campanhas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Landing Page */}
                  <div className="space-y-2">
                    <Label htmlFor="landing_page">Landing Page</Label>
                    <Input
                      id="landing_page"
                      value={formData.landing_page}
                      onChange={(e) => setFormData(prev => ({ ...prev, landing_page: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>

                  {/* UTM */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4">Parâmetros UTM</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="utm_source">UTM Source</Label>
                        <Input
                          id="utm_source"
                          value={formData.utm_source}
                          onChange={(e) => setFormData(prev => ({ ...prev, utm_source: e.target.value }))}
                          placeholder="google, facebook, instagram..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="utm_medium">UTM Medium</Label>
                        <Input
                          id="utm_medium"
                          value={formData.utm_medium}
                          onChange={(e) => setFormData(prev => ({ ...prev, utm_medium: e.target.value }))}
                          placeholder="cpc, social, email..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="utm_campaign">UTM Campaign</Label>
                        <Input
                          id="utm_campaign"
                          value={formData.utm_campaign}
                          onChange={(e) => setFormData(prev => ({ ...prev, utm_campaign: e.target.value }))}
                          placeholder="Nome da campanha"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="utm_content">UTM Content</Label>
                        <Input
                          id="utm_content"
                          value={formData.utm_content}
                          onChange={(e) => setFormData(prev => ({ ...prev, utm_content: e.target.value }))}
                          placeholder="Variação do anúncio"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="utm_term">UTM Term</Label>
                        <Input
                          id="utm_term"
                          value={formData.utm_term}
                          onChange={(e) => setFormData(prev => ({ ...prev, utm_term: e.target.value }))}
                          placeholder="Palavras-chave"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Click IDs */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4">Click IDs de Plataformas</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="gclid">GCLID (Google)</Label>
                        <Input
                          id="gclid"
                          value={formData.gclid}
                          onChange={(e) => setFormData(prev => ({ ...prev, gclid: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fbclid">FBCLID (Facebook)</Label>
                        <Input
                          id="fbclid"
                          value={formData.fbclid}
                          onChange={(e) => setFormData(prev => ({ ...prev, fbclid: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ttclid">TTCLID (TikTok)</Label>
                        <Input
                          id="ttclid"
                          value={formData.ttclid}
                          onChange={(e) => setFormData(prev => ({ ...prev, ttclid: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="msclkid">MSCLKID (Microsoft/Bing)</Label>
                        <Input
                          id="msclkid"
                          value={formData.msclkid}
                          onChange={(e) => setFormData(prev => ({ ...prev, msclkid: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="li_fat_id">LI_FAT_ID (LinkedIn)</Label>
                        <Input
                          id="li_fat_id"
                          value={formData.li_fat_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, li_fat_id: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* URLs */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-4">URLs de Origem</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="embed_url">Embed URL</Label>
                        <Input
                          id="embed_url"
                          value={formData.embed_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, embed_url: e.target.value }))}
                          placeholder="URL onde o formulário foi incorporado"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="referrer_url">Referrer URL</Label>
                        <Input
                          id="referrer_url"
                          value={formData.referrer_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, referrer_url: e.target.value }))}
                          placeholder="URL de origem do visitante"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions - Mobile Floating */}
          <div className="fixed bottom-4 right-4 sm:hidden">
            <Button type="submit" size="lg" disabled={isSaving || !formData.nome || !formData.telefone} className="rounded-full shadow-lg">
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            </Button>
          </div>

          {/* Actions - Desktop */}
          <div className="hidden sm:flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(isNew ? "/" : `/leads/${id}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !formData.nome || !formData.telefone}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {isNew ? "Criar Lead" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
