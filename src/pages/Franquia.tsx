import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { useAgendamentosAdapter } from "@/hooks/useAgendamentosAdapter";
import { usePromocaoIndicacoesAdapter } from "@/hooks/usePromocaoIndicacoesAdapter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Users,
  TrendingUp,
  Search,
  Eye,
  MessageCircle,
  UserPlus,
  CalendarDays,
  ArrowLeft,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";

// Função para gerar slug a partir do nome
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]+/g, "-") // Substitui caracteres especiais por hífen
    .replace(/(^-|-$)/g, ""); // Remove hífens do início e fim
}

export default function Franquia() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { profile, unidadeId, isAdmin, isCentral, isUnidade, isLoading: profileLoading } = useUserProfileAdapter();
  const { franqueados, isLoading: franqueadosLoading } = useFranqueadosAdapter();
  const { leads, isLoading: leadsLoading } = useLeadsAdapter();
  const { agendamentos, isLoading: agendamentosLoading } = useAgendamentosAdapter();
  const { indicacoes, isLoading: indicacoesLoading } = usePromocaoIndicacoesAdapter();
  const [searchLeads, setSearchLeads] = useState("");
  const [searchIndicacoes, setSearchIndicacoes] = useState("");

  // Encontra a franquia pelo slug ou pelo unidade_id do usuário
  const franquia = useMemo(() => {
    if (!franqueados.length) return null;

    // Se tem slug na URL, busca por slug
    if (slug) {
      return franqueados.find(f => generateSlug(f.nome_fantasia) === slug);
    }

    // Se usuário é de unidade, busca pela unidade_id
    if (isUnidade && unidadeId) {
      return franqueados.find(f => f.id === unidadeId);
    }

    return null;
  }, [franqueados, slug, isUnidade, unidadeId]);

  // Redireciona usuário de unidade para sua franquia
  useEffect(() => {
    if (!profileLoading && !franqueadosLoading && isUnidade && unidadeId && !slug) {
      const userFranquia = franqueados.find(f => f.id === unidadeId);
      if (userFranquia) {
        navigate(`/franquia/${generateSlug(userFranquia.nome_fantasia)}`, { replace: true });
      }
    }
  }, [profileLoading, franqueadosLoading, isUnidade, unidadeId, slug, franqueados, navigate]);

  // Filtra leads da franquia
  const franquiaLeads = useMemo(() => {
    if (!franquia) return [];
    const nomeFantasia = franquia.nome_fantasia.toLowerCase();
    return leads.filter(lead =>
      lead.franqueado_id === franquia.id ||
      lead.unidade?.toLowerCase().includes(nomeFantasia) ||
      lead.unidade?.toLowerCase().includes(nomeFantasia)
    );
  }, [leads, franquia]);

  // Filtra agendamentos da franquia
  const franquiaAgendamentos = useMemo(() => {
    if (!franquia) return [];
    return agendamentos.filter(a => a.unidade_id === franquia.id);
  }, [agendamentos, franquia]);

  // Filtra indicações da franquia
  const franquiaIndicacoes = useMemo(() => {
    if (!franquia) return [];
    const nomeFantasia = franquia.nome_fantasia.toLowerCase();
    return indicacoes.filter(ind =>
      ind.unidade?.toLowerCase().includes(nomeFantasia) ||
      ind.cadastro?.unidade?.toLowerCase().includes(nomeFantasia)
    );
  }, [indicacoes, franquia]);

  // Filtra por busca
  const filteredLeads = useMemo(() => {
    if (!searchLeads) return franquiaLeads;
    const searchLower = searchLeads.toLowerCase();
    return franquiaLeads.filter(lead =>
      lead.nome.toLowerCase().includes(searchLower) ||
      lead.telefone.includes(searchLeads) ||
      lead.email.toLowerCase().includes(searchLower)
    );
  }, [franquiaLeads, searchLeads]);

  const filteredIndicacoes = useMemo(() => {
    if (!searchIndicacoes) return franquiaIndicacoes;
    const searchLower = searchIndicacoes.toLowerCase();
    return franquiaIndicacoes.filter(ind =>
      ind.nome.toLowerCase().includes(searchLower) ||
      ind.telefone.includes(searchIndicacoes) ||
      ind.email.toLowerCase().includes(searchLower)
    );
  }, [franquiaIndicacoes, searchIndicacoes]);

  // Métricas
  const metrics = useMemo(() => {
    const total = franquiaLeads.length;
    const novos = franquiaLeads.filter(l => l.status === "novo").length;
    const emContato = franquiaLeads.filter(l => l.status === "contato").length;
    const agendados = franquiaLeads.filter(l => l.status === "agendado").length;
    const compareceram = franquiaLeads.filter(l => l.status === "atendido").length;
    const convertidos = franquiaLeads.filter(l => l.status === "convertido").length;
    const totalIndicacoes = franquiaIndicacoes.length;
    const agendamentosHoje = franquiaAgendamentos.filter(a => {
      const hoje = new Date().toISOString().split("T")[0];
      return a.data_agendamento === hoje;
    }).length;

    return { total, novos, emContato, agendados, compareceram, convertidos, totalIndicacoes, agendamentosHoje };
  }, [franquiaLeads, franquiaIndicacoes, franquiaAgendamentos]);

  // Dados do funil de conversão
  const funnelData = useMemo(() => {
    const total = franquiaLeads.length;
    const contatados = franquiaLeads.filter(l =>
      ["contato", "agendado", "confirmado", "atendido", "convertido"].includes(l.status)
    ).length;
    const agendados = franquiaLeads.filter(l =>
      ["agendado", "confirmado", "atendido", "convertido"].includes(l.status)
    ).length;
    const compareceram = franquiaLeads.filter(l =>
      ["atendido", "convertido"].includes(l.status)
    ).length;
    const convertidos = franquiaLeads.filter(l => l.status === "convertido").length;

    return [
      {
        etapa: "Recebidos",
        quantidade: total,
        percentual: 100,
        conversaoAnterior: 0,
      },
      {
        etapa: "Contatados",
        quantidade: contatados,
        percentual: total > 0 ? (contatados / total) * 100 : 0,
        conversaoAnterior: total > 0 ? (contatados / total) * 100 : 0,
      },
      {
        etapa: "Agendados",
        quantidade: agendados,
        percentual: total > 0 ? (agendados / total) * 100 : 0,
        conversaoAnterior: contatados > 0 ? (agendados / contatados) * 100 : 0,
      },
      {
        etapa: "Comparecimentos",
        quantidade: compareceram,
        percentual: total > 0 ? (compareceram / total) * 100 : 0,
        conversaoAnterior: agendados > 0 ? (compareceram / agendados) * 100 : 0,
      },
      {
        etapa: "Conversões",
        quantidade: convertidos,
        percentual: total > 0 ? (convertidos / total) * 100 : 0,
        conversaoAnterior: compareceram > 0 ? (convertidos / compareceram) * 100 : 0,
      },
    ];
  }, [franquiaLeads]);

  const handleWhatsApp = (telefone: string) => {
    const cleanPhone = telefone.replace(/\D/g, "");
    const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const isLoading = profileLoading || franqueadosLoading || leadsLoading;

  if (isLoading) {
    return (
      <>
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </>
    );
  }

  // Se não encontrou franquia
  if (!franquia) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Franquia não encontrada</h1>
          <p className="text-muted-foreground max-w-md mb-4">
            {isUnidade
              ? "Seu usuário ainda não está vinculado a uma franquia. Entre em contato com a central para realizar a vinculação."
              : "A franquia solicitada não foi encontrada no sistema."}
          </p>
          {(isAdmin || isCentral) && (
            <Button onClick={() => navigate("/franqueados")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ver todas as franquias
            </Button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Botão Voltar (para admin/central) */}
        {(isAdmin || isCentral) && (
          <Button variant="ghost" onClick={() => navigate("/franqueados")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Franqueados
          </Button>
        )}

        {/* Header da Franquia */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{franquia.nome_fantasia}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{franquia.cidade}, {franquia.estado}</span>
                  </div>
                </div>
              </div>
              <Badge variant={franquia.status === "Concluído" ? "default" : "secondary"}>
                {franquia.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
              {franquia.responsavel && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="font-medium">{franquia.responsavel}</span>
                </div>
              )}
              {franquia.whatsapp_business && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="font-medium">{franquia.whatsapp_business}</span>
                </div>
              )}
              {franquia.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">E-mail:</span>
                  <span className="font-medium">{franquia.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.total}</p>
                  <p className="text-xs text-muted-foreground">Total Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.novos}</p>
                  <p className="text-xs text-muted-foreground">Novos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.emContato}</p>
                  <p className="text-xs text-muted-foreground">Em Contato</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.agendados}</p>
                  <p className="text-xs text-muted-foreground">Agendados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.convertidos}</p>
                  <p className="text-xs text-muted-foreground">Convertidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalIndicacoes}</p>
                  <p className="text-xs text-muted-foreground">Indicações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.agendamentosHoje}</p>
                  <p className="text-xs text-muted-foreground">Agend. Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funil de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Funil de Conversão
            </CardTitle>
            <CardDescription>Performance de conversão dos leads</CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionFunnel data={funnelData} />
          </CardContent>
        </Card>

        {/* Tabs: Leads, Indicações e Agendamentos */}
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads ({franquiaLeads.length})
            </TabsTrigger>
            <TabsTrigger value="indicacoes" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Indicações ({franquiaIndicacoes.length})
            </TabsTrigger>
            <TabsTrigger value="agendamentos" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Agendamentos ({franquiaAgendamentos.length})
            </TabsTrigger>
          </TabsList>

          {/* Aba Leads */}
          <TabsContent value="leads">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Leads da Franquia</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar leads..."
                      value={searchLeads}
                      onChange={(e) => setSearchLeads(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredLeads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum lead encontrado</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {filteredLeads.slice(0, 50).map((lead) => (
                      <div key={lead.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{lead.nome}</p>
                            <LeadStatusBadge status={lead.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{lead.telefone}</span>
                            <span>{lead.email}</span>
                            <span>
                              {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWhatsApp(lead.telefone)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/leads/${lead.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Exibindo {Math.min(filteredLeads.length, 50)} de {filteredLeads.length} leads
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Indicações */}
          <TabsContent value="indicacoes">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Indicações</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar indicações..."
                      value={searchIndicacoes}
                      onChange={(e) => setSearchIndicacoes(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {indicacoesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : filteredIndicacoes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma indicação encontrada</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {filteredIndicacoes.slice(0, 50).map((indicacao) => (
                      <div key={indicacao.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{indicacao.nome}</p>
                            <Badge variant="outline" className="text-xs">
                              Indicação
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{indicacao.telefone}</span>
                            <span>{indicacao.email}</span>
                            {indicacao.cadastro && (
                              <span className="text-purple-600">
                                Indicado por: {indicacao.cadastro.nome}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWhatsApp(indicacao.telefone)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Total: {filteredIndicacoes.length} indicações
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Agendamentos */}
          <TabsContent value="agendamentos">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {agendamentosLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : franquiaAgendamentos.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum agendamento encontrado</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {franquiaAgendamentos.slice(0, 50).map((agendamento) => (
                      <div key={agendamento.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">
                              {format(new Date(agendamento.data_agendamento), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <Badge variant={
                              agendamento.status === "realizado" ? "default" :
                              agendamento.status === "cancelado" ? "destructive" :
                              agendamento.status === "confirmado" ? "default" :
                              "secondary"
                            }>
                              {agendamento.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{agendamento.hora_inicio} - {agendamento.hora_fim || "..."}</span>
                            {agendamento.servico && <span>{agendamento.servico}</span>}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/agendamentos/${agendamento.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Total: {franquiaAgendamentos.length} agendamentos
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
