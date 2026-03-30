import { useParams, useNavigate, Link } from "react-router-dom";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useDiretoriasAdapter } from "@/hooks/useDiretoriasAdapter";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useServiceCategoriesMT } from "@/hooks/multitenant/useServiceCategoriesMT";
import { formatPhoneDisplay } from "@/utils/phone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FranqueadoIntegracaoCard } from "@/components/franqueados/FranqueadoIntegracaoCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Pencil,
  ExternalLink,
  Instagram,
  Facebook,
  Youtube,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Briefcase,
  FolderTree,
} from "lucide-react";

export default function FranqueadoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { franqueados, isLoading, generateToken, isGeneratingToken } = useFranqueadosAdapter();
  const { diretorias, isLoading: isLoadingDiretorias } = useDiretoriasAdapter();
  const { servicos, franchiseServices, isLoading: isLoadingServicos, getServicosByFranqueado } = useServicosAdapter();
  const { getCategoryLabel } = useServiceCategoriesMT();

  const franqueado = franqueados.find((f) => f.id === id);
  const diretoria = franqueado?.diretoria_id
    ? diretorias.find((d) => d.id === franqueado.diretoria_id)
    : null;

  // Obter serviços vinculados - usar o método correto do adapter
  const servicosVinculados = id ? getServicosByFranqueado(id) : [];

  // Agrupar serviços por categoria
  const servicosPorCategoria = servicosVinculados.reduce((acc, servico) => {
    if (!servico) return acc;
    const cat = servico.categoria || "outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(servico);
    return acc;
  }, {} as Record<string, typeof servicosVinculados>);

  if (isLoading || isLoadingServicos) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!franqueado) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Franqueado não encontrado</h2>
          <p className="text-muted-foreground mb-4">O franqueado solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate("/franqueados")}>Voltar para Franqueados</Button>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Concluído":
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Em configuração":
        return <Badge className="bg-blue-600"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Falta LP":
        return <Badge className="bg-amber-600"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case "Não inaugurada":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const socialLinks = [
    { name: "Instagram", url: franqueado.instagram ? `https://www.instagram.com/${franqueado.instagram}` : null, icon: Instagram, color: "text-pink-500" },
    { name: "Facebook", url: franqueado.facebook_pagina ? `https://www.facebook.com/${franqueado.facebook_pagina}` : null, icon: Facebook, color: "text-blue-600" },
    { name: "YouTube", url: franqueado.youtube ? `https://www.youtube.com/${franqueado.youtube}` : null, icon: Youtube, color: "text-red-500" },
  ].filter(social => social.url);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/franqueados")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{franqueado.nome_fantasia}</h1>
                <div className="mt-1">{getStatusBadge(franqueado.status)}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {franqueado.landing_page_site && (
              <Button variant="outline" asChild>
                <a href={franqueado.landing_page_site} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Landing Page
                </a>
              </Button>
            )}
            <Button asChild>
              <Link to={`/franqueados/${franqueado.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Localização */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {franqueado.endereco && (
                  <p className="text-sm">{franqueado.endereco}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span>{franqueado.cidade || "Cidade não informada"}</span>
                  {franqueado.estado && <span>/ {franqueado.estado}</span>}
                </div>
                {franqueado.cep && (
                  <p className="text-sm text-muted-foreground">CEP: {franqueado.cep}</p>
                )}
              </CardContent>
            </Card>

            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {franqueado.responsavel && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{franqueado.responsavel}</span>
                    {franqueado.relacionamento && (
                      <Badge variant="outline">{franqueado.relacionamento}</Badge>
                    )}
                  </div>
                )}
                {franqueado.whatsapp_business && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{formatPhoneDisplay(franqueado.whatsapp_business, (franqueado as any).whatsapp_business_codigo_pais || '55')}</span>
                  </div>
                )}
                {franqueado.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{franqueado.email}</span>
                  </div>
                )}
                {franqueado.cnpj && (
                  <p className="text-sm text-muted-foreground">CNPJ: {franqueado.cnpj}</p>
                )}
              </CardContent>
            </Card>

            {/* Informações Adicionais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">ID API</p>
                    <p className="font-medium">{franqueado.id_api || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última Recarga</p>
                    <p className="font-medium">{franqueado.ultima_recarga ? formatDate(franqueado.ultima_recarga) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <p className="font-medium">{formatDate(franqueado.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Atualizado em</p>
                    <p className="font-medium">{formatDate(franqueado.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Diretoria Regional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Diretoria Regional
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diretoria ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{diretoria.nome}</p>
                        {diretoria.regiao && (
                          <p className="text-sm text-muted-foreground">{diretoria.regiao}</p>
                        )}
                      </div>
                      <Badge variant={diretoria.is_active ? "default" : "secondary"}>
                        {diretoria.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    {diretoria.descricao && (
                      <p className="text-sm text-muted-foreground">{diretoria.descricao}</p>
                    )}
                    {diretoria.franquias_count !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Esta diretoria gerencia {diretoria.franquias_count} unidade(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FolderTree className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma diretoria vinculada</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Edite a franquia para vincular a uma diretoria
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações Realizadas */}
            {franqueado.acoes_realizadas && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ações Realizadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{franqueado.acoes_realizadas}</p>
                </CardContent>
              </Card>
            )}

            {/* Card de Integração */}
            <FranqueadoIntegracaoCard
              franqueado={franqueado}
              servicosVinculados={servicosVinculados.map((s) => ({
                id: s.id,
                nome: s.nome,
                descricao: s.descricao,
                categoria: s.categoria,
              }))}
              onGenerateToken={() => generateToken(franqueado.id)}
              isGenerating={isGeneratingToken}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Redes Sociais */}
            {socialLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Redes Sociais</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {socialLinks.map((social) => {
                    const Icon = social.icon;
                    return (
                      <Button
                        key={social.name}
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                      >
                        <a href={social.url!} target="_blank" rel="noopener noreferrer">
                          {Icon && <Icon className={`h-4 w-4 ${social.color}`} />}
                          {social.name}
                        </a>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Serviços Vinculados */}
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Serviços ({servicosVinculados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {servicosVinculados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum serviço vinculado
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(servicosPorCategoria).map(([categoria, servicosCat]) => (
                      <div key={categoria}>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          {getCategoryLabel(categoria)}
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {servicosCat.map((servico) => (
                            <Badge key={servico.id} variant="secondary" className="text-xs">
                              {servico.nome}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
