import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Building2,
  ArrowLeft,
  Pencil,
  Copy,
  Link as LinkIcon,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  TrendingUp,
  Users,
  Target,
  Gift,
  Calendar,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useParceriasAdapter } from "@/hooks/useParceriasAdapter";
import { useIndicacoesByParceriaAdapter, useParceriaIndicacoesAdapter } from "@/hooks/useParceriaIndicacoesAdapter";
import {
  PARCERIA_STATUS_LABELS,
  PARCERIA_STATUS_COLORS,
  INDICACAO_STATUS_LABELS,
  INDICACAO_STATUS_COLORS,
  BENEFICIO_TIPO_LABELS,
  formatarCNPJ,
  formatarCEP,
  gerarLinkIndicacaoParceria,
  filtrarBeneficiosValidos,
  formatarValorBeneficio,
} from "@/types/parceria";
import { formatPhoneDisplay, cleanPhoneNumber } from "@/utils/phone";

// =====================================================
// Componente Principal
// =====================================================

export default function ParceriaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("indicacoes");

  // Hooks - usando adapter
  const { parcerias, deleteParceria, isDeleting, isLoading } = useParceriasAdapter();
  const parceria = parcerias.find(p => p.id === id);
  const { indicacoes, metrics, isLoading: isLoadingIndicacoes } = useIndicacoesByParceriaAdapter(id);
  const { marcarComoConvertido, marcarComoPerdido } = useParceriaIndicacoesAdapter();

  // Benefícios válidos
  const beneficiosValidos = useMemo(
    () => (parceria?.beneficios ? filtrarBeneficiosValidos(parceria.beneficios) : []),
    [parceria?.beneficios]
  );

  // Handlers
  const handleCopyCode = () => {
    if (parceria?.codigo_indicacao) {
      navigator.clipboard.writeText(parceria.codigo_indicacao);
      toast.success("Código copiado!");
    }
  };

  const handleCopyLink = () => {
    if (parceria?.codigo_indicacao) {
      const link = gerarLinkIndicacaoParceria(parceria.codigo_indicacao);
      navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteParceria(id);
      navigate("/parcerias");
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Not found
  if (!parceria) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Parceria não encontrada</h2>
        <p className="text-muted-foreground mb-4">
          A parceria solicitada não existe ou foi removida.
        </p>
        <Button asChild>
          <Link to="/parcerias">Voltar para Parcerias</Link>
        </Button>
      </div>
    );
  }

  // =====================================================
  // Render
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/parcerias">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            {parceria.logo_url ? (
              <img
                src={parceria.logo_url}
                alt={parceria.nome_fantasia}
                className="h-16 w-16 rounded-lg object-contain bg-muted border"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{parceria.nome_fantasia}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={PARCERIA_STATUS_COLORS[parceria.status]}>
                  {PARCERIA_STATUS_LABELS[parceria.status]}
                </Badge>
                {parceria.ramo_atividade && (
                  <Badge variant="outline">{parceria.ramo_atividade}</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/parcerias/${id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyCode}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar Código
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copiar Link
              </DropdownMenuItem>
              {parceria.codigo_indicacao && (
                <DropdownMenuItem asChild>
                  <Link to={`/parceiro/${parceria.codigo_indicacao}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Portal
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Parceria
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Código de Indicação */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Código de Indicação</p>
              <div className="flex items-center gap-3">
                <code className="text-2xl font-mono font-bold text-primary">
                  {parceria.codigo_indicacao}
                </code>
                <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyLink}>
                <LinkIcon className="mr-2 h-4 w-4" />
                Copiar Link
              </Button>
              {parceria.codigo_indicacao && (
                <Button asChild>
                  <Link to={`/parceiro/${parceria.codigo_indicacao}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Portal
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Indicações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.convertidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.taxa_conversao}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Esquerda - Indicações e Benefícios */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="indicacoes">
                Indicações ({metrics.total})
              </TabsTrigger>
              <TabsTrigger value="beneficios">
                Benefícios ({beneficiosValidos.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Indicações */}
            <TabsContent value="indicacoes">
              <Card>
                <CardHeader>
                  <CardTitle>Indicações Recentes</CardTitle>
                  <CardDescription>
                    Leads indicados por esta parceria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingIndicacoes ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : indicacoes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-12 w-12 mb-4" />
                      <p>Nenhuma indicação registrada ainda</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indicacoes.slice(0, 10).map((indicacao) => (
                          <TableRow key={indicacao.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{indicacao.lead?.nome || "—"}</div>
                                {indicacao.lead?.email && (
                                  <div className="text-sm text-muted-foreground">
                                    {indicacao.lead.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(indicacao.data_indicacao), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge className={INDICACAO_STATUS_COLORS[indicacao.status]}>
                                {INDICACAO_STATUS_LABELS[indicacao.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {indicacao.status === "pendente" && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => marcarComoConvertido(indicacao.id)}
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => marcarComoPerdido(indicacao.id)}
                                  >
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Benefícios */}
            <TabsContent value="beneficios">
              <Card>
                <CardHeader>
                  <CardTitle>Benefícios Ativos</CardTitle>
                  <CardDescription>
                    Benefícios oferecidos aos clientes indicados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {beneficiosValidos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gift className="mx-auto h-12 w-12 mb-4" />
                      <p>Nenhum benefício cadastrado</p>
                      <Button asChild variant="outline" className="mt-4">
                        <Link to={`/parcerias/${id}/editar`}>Adicionar Benefícios</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {beneficiosValidos.map((beneficio) => (
                        <div
                          key={beneficio.id}
                          className={`p-4 rounded-lg border ${
                            beneficio.destaque ? "border-primary bg-primary/5" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{beneficio.titulo}</h4>
                                {beneficio.destaque && (
                                  <Badge variant="secondary">Destaque</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {BENEFICIO_TIPO_LABELS[beneficio.tipo]}
                                {beneficio.valor && ` - ${beneficio.valor}`}
                              </p>
                              {beneficio.descricao && (
                                <p className="text-sm mt-2">{beneficio.descricao}</p>
                              )}
                            </div>
                            <Gift className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna Direita - Informações */}
        <div className="space-y-6">
          {/* Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Razão Social</p>
                <p className="font-medium">{parceria.razao_social}</p>
              </div>
              {parceria.cnpj && (
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-medium">{formatarCNPJ(parceria.cnpj)}</p>
                </div>
              )}
              {parceria.porte && (
                <div>
                  <p className="text-sm text-muted-foreground">Porte</p>
                  <p className="font-medium">{parceria.porte}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsável */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{parceria.responsavel_nome}</p>
                {parceria.responsavel_cargo && (
                  <p className="text-sm text-muted-foreground">{parceria.responsavel_cargo}</p>
                )}
              </div>
              {parceria.responsavel_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${parceria.responsavel_email}`} className="hover:underline">
                    {parceria.responsavel_email}
                  </a>
                </div>
              )}
              {parceria.responsavel_telefone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:+${parceria.responsavel_telefone_codigo_pais || '55'}${cleanPhoneNumber(parceria.responsavel_telefone)}`} className="hover:underline">
                    {formatPhoneDisplay(parceria.responsavel_telefone, parceria.responsavel_telefone_codigo_pais || '55')}
                  </a>
                </div>
              )}
              {parceria.responsavel_whatsapp && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-green-500" />
                  <a
                    href={`https://wa.me/${parceria.responsavel_whatsapp_codigo_pais || '55'}${cleanPhoneNumber(parceria.responsavel_whatsapp)}`}
                    target="_blank"
                    className="hover:underline"
                  >
                    {formatPhoneDisplay(parceria.responsavel_whatsapp, parceria.responsavel_whatsapp_codigo_pais || '55')} (WhatsApp)
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consultora Responsável */}
          {(parceria as unknown as { responsavel?: { nome: string; cargo: string | null } | null }).responsavel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Consultora Responsável</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const resp = (parceria as unknown as { responsavel?: { nome: string; cargo: string | null } | null }).responsavel!;
                  return (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="font-medium">{resp.nome}</span>
                        {resp.cargo && (
                          <span className="text-muted-foreground ml-1">({resp.cargo})</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Endereço */}
          {(parceria.endereco || parceria.cidade) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Endereço</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="text-sm">
                    {parceria.endereco && (
                      <p>
                        {parceria.endereco}
                        {parceria.numero && `, ${parceria.numero}`}
                        {parceria.complemento && ` - ${parceria.complemento}`}
                      </p>
                    )}
                    {parceria.bairro && <p>{parceria.bairro}</p>}
                    <p>
                      {parceria.cidade && parceria.cidade}
                      {parceria.estado && ` - ${parceria.estado}`}
                      {parceria.cep && ` - ${formatarCEP(parceria.cep)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          {(parceria.website || parceria.instagram || parceria.facebook || parceria.linkedin) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {parceria.website && (
                  <a
                    href={parceria.website}
                    target="_blank"
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {parceria.instagram && (
                  <a
                    href={`https://instagram.com/${parceria.instagram.replace("@", "")}`}
                    target="_blank"
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <Instagram className="h-4 w-4" />
                    {parceria.instagram}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {parceria.facebook && (
                  <a
                    href={parceria.facebook}
                    target="_blank"
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {parceria.linkedin && (
                  <a
                    href={parceria.linkedin}
                    target="_blank"
                    className="flex items-center gap-2 text-sm hover:underline"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Datas */}
          {(parceria.data_inicio_parceria || parceria.created_at) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {parceria.data_inicio_parceria && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Início:{" "}
                      {format(new Date(parceria.data_inicio_parceria), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                )}
                {parceria.data_fim_parceria && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Término:{" "}
                      {format(new Date(parceria.data_fim_parceria), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Cadastrado em:{" "}
                    {format(new Date(parceria.created_at), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a parceria "{parceria.nome_fantasia}"? Esta ação não
              pode ser desfeita. Todas as indicações associadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
