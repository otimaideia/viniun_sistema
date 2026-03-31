import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { usePromocaoIndicacoesAdapter } from "@/hooks/usePromocaoIndicacoesAdapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  UserPlus
} from "lucide-react";
import { LeadStatusBadge } from "@/components/dashboard/LeadStatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MinhaFranquia() {
  const navigate = useNavigate();
  const { profile, unidadeId, isLoading: profileLoading } = useUserProfileAdapter();
  const { franqueados, isLoading: franqueadosLoading } = useFranqueadosAdapter();
  const { leads, isLoading: leadsLoading } = useLeadsAdapter();
  const { indicacoes, isLoading: indicacoesLoading } = usePromocaoIndicacoesAdapter();
  const [searchLeads, setSearchLeads] = useState("");
  const [searchIndicacoes, setSearchIndicacoes] = useState("");

  // Encontra a franquia do usuário
  const minhaFranquia = useMemo(() => {
    if (!unidadeId) return null;
    return franqueados.find(f => f.id_api === unidadeId);
  }, [franqueados, unidadeId]);

  // Filtra leads direcionados para esta franquia
  const meusLeads = useMemo(() => {
    if (!minhaFranquia) return [];
    const nomeFantasia = minhaFranquia.nome_fantasia.toLowerCase();
    return leads.filter(lead => 
      lead.unidade?.toLowerCase().includes(nomeFantasia) ||
      lead.unidade?.toLowerCase().includes(nomeFantasia)
    );
  }, [leads, minhaFranquia]);

  // Filtra indicações vinculadas aos leads da franquia
  const minhasIndicacoes = useMemo(() => {
    if (!minhaFranquia) return [];
    const nomeFantasia = minhaFranquia.nome_fantasia.toLowerCase();
    return indicacoes.filter(ind => 
      ind.cadastro?.unidade?.toLowerCase().includes(nomeFantasia) ||
      ind.cadastro?.unidade?.toLowerCase().includes(nomeFantasia)
    );
  }, [indicacoes, minhaFranquia]);

  // Filtra leads por busca
  const filteredLeads = useMemo(() => {
    if (!searchLeads) return meusLeads;
    const searchLower = searchLeads.toLowerCase();
    return meusLeads.filter(lead =>
      lead.nome.toLowerCase().includes(searchLower) ||
      lead.telefone.includes(searchLeads) ||
      lead.email.toLowerCase().includes(searchLower)
    );
  }, [meusLeads, searchLeads]);

  // Filtra indicações por busca
  const filteredIndicacoes = useMemo(() => {
    if (!searchIndicacoes) return minhasIndicacoes;
    const searchLower = searchIndicacoes.toLowerCase();
    return minhasIndicacoes.filter(ind =>
      ind.nome.toLowerCase().includes(searchLower) ||
      ind.telefone.includes(searchIndicacoes) ||
      ind.email.toLowerCase().includes(searchLower)
    );
  }, [minhasIndicacoes, searchIndicacoes]);

  // Métricas
  const metrics = useMemo(() => {
    const total = meusLeads.length;
    const novos = meusLeads.filter(l => l.status === "novo").length;
    const emContato = meusLeads.filter(l => l.status === "contato").length;
    const convertidos = meusLeads.filter(l => l.status === "convertido").length;
    const totalIndicacoes = minhasIndicacoes.length;
    
    return { total, novos, emContato, convertidos, totalIndicacoes };
  }, [meusLeads, minhasIndicacoes]);

  const handleWhatsApp = (telefone: string) => {
    const cleanPhone = telefone.replace(/\D/g, "");
    const phone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const isLoading = profileLoading || franqueadosLoading || leadsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!minhaFranquia) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Franquia não vinculada</h1>
          <p className="text-muted-foreground max-w-md">
            Seu usuário ainda não está vinculado a uma franquia. 
            Entre em contato com a central para realizar a vinculação.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header da Franquia */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{minhaFranquia.nome_fantasia}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{minhaFranquia.cidade}, {minhaFranquia.estado}</span>
                  </div>
                </div>
              </div>
              <Badge variant={minhaFranquia.status === "Concluído" ? "default" : "secondary"}>
                {minhaFranquia.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
              {minhaFranquia.responsavel && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Responsável:</span>
                  <span className="font-medium">{minhaFranquia.responsavel}</span>
                </div>
              )}
              {minhaFranquia.whatsapp_business && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="font-medium">{minhaFranquia.whatsapp_business}</span>
                </div>
              )}
              {minhaFranquia.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">E-mail:</span>
                  <span className="font-medium">{minhaFranquia.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  <TrendingUp className="h-5 w-5 text-green-600" />
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
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
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
        </div>

        {/* Tabs: Leads e Indicações */}
        <Tabs defaultValue="leads" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads ({meusLeads.length})
            </TabsTrigger>
            <TabsTrigger value="indicacoes" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Indicações ({minhasIndicacoes.length})
            </TabsTrigger>
          </TabsList>

          {/* Aba Leads */}
          <TabsContent value="leads">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Meus Leads</CardTitle>
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
                  <div className="divide-y">
                    {filteredLeads.map((lead) => (
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
                  Total: {filteredLeads.length} leads
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
                  <div className="divide-y">
                    {filteredIndicacoes.map((indicacao) => (
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}