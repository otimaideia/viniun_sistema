import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import type { FormularioWithRelations, FormularioSubmissao } from '@/types/formulario';
import { STATUS_LABELS, STATUS_COLORS } from '@/types/formulario';

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Copy,
  Share2,
  Code,
  BarChart3,
  FlaskConical,
  Settings,
  Eye,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  Palette,
  FileText,
  List,
  Send,
  Trash2,
  ChevronRight,
} from 'lucide-react';

// Modals
import EmbedCodeModal from '@/components/formularios/EmbedCodeModal';
import FormularioShareModal from '@/components/formularios/FormularioShareModal';
import FormularioAnalyticsDashboard from '@/components/formularios/FormularioAnalyticsDashboard';
import FormularioABTestManager from '@/components/formularios/FormularioABTestManager';
import FormularioPersonalizacaoEditor from '@/components/formularios/FormularioPersonalizacaoEditor';

import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Stats Card Component
const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1 leading-tight">{description}</p>}
    </CardContent>
  </Card>
);

export default function FormularioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState<FormularioWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissoes, setSubmissoes] = useState<FormularioSubmissao[]>([]);
  const [loadingSubmissoes, setLoadingSubmissoes] = useState(false);
  const [stats, setStats] = useState({
    views: 0,
    starts: 0,
    submits: 0,
    conversionRate: 0,
    avgTimeSeconds: 0,
  });

  // Modal states
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [savingPersonalizacao, setSavingPersonalizacao] = useState(false);

  // Handler para salvar personalizacao
  const handleSavePersonalizacao = async (updates: Partial<FormularioWithRelations>) => {
    if (!formulario?.id) return;

    setSavingPersonalizacao(true);
    try {
      const { error } = await supabase
        .from('mt_forms')
        .update(updates)
        .eq('id', formulario.id);

      if (error) throw error;

      // Atualizar estado local
      setFormulario((prev) => (prev ? { ...prev, ...updates } : null));
      toast.success('Personalizacao salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar personalizacao:', err);
      toast.error('Erro ao salvar personalizacao');
    } finally {
      setSavingPersonalizacao(false);
    }
  };

  // Carregar formulario
  useEffect(() => {
    const loadFormulario = async () => {
      if (!id) return;

      setLoading(true);

      try {
        // Buscar formulario com campos e franqueado
        const { data, error } = await supabase
          .from('mt_forms')
          .select(`
            *,
            franqueado:mt_franchises(id, nome_fantasia),
            campos:mt_form_fields(*)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        setFormulario(data as FormularioWithRelations);

        // Buscar estatisticas
        const { data: analyticsData } = await supabase
          .from('mt_form_analytics')
          .select('evento, tempo_total_segundos')
          .eq('formulario_id', id);

        if (analyticsData) {
          const views = analyticsData.filter((a) => a.evento === 'view').length;
          const starts = analyticsData.filter((a) => a.evento === 'start').length;
          const submits = analyticsData.filter((a) => a.evento === 'submit').length;
          const submitTimes = analyticsData
            .filter((a) => a.evento === 'submit' && a.tempo_total_segundos)
            .map((a) => a.tempo_total_segundos || 0);
          const avgTime =
            submitTimes.length > 0
              ? submitTimes.reduce((sum, t) => sum + t, 0) / submitTimes.length
              : 0;

          setStats({
            views,
            starts,
            submits,
            conversionRate: views > 0 ? (submits / views) * 100 : 0,
            avgTimeSeconds: avgTime,
          });
        }
      } catch (err) {
        console.error('Erro ao carregar formulario:', err);
        toast.error('Erro ao carregar formulario');
      } finally {
        setLoading(false);
      }
    };

    loadFormulario();
  }, [id]);

  // Carregar submissoes
  useEffect(() => {
    const loadSubmissoes = async () => {
      if (!id) return;

      setLoadingSubmissoes(true);
      try {
        const { data, error } = await supabase
          .from('mt_form_submissions')
          .select('*')
          .eq('formulario_id', id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setSubmissoes(data || []);
      } catch (err) {
        console.error('Erro ao carregar submissoes:', err);
      } finally {
        setLoadingSubmissoes(false);
      }
    };

    loadSubmissoes();
  }, [id]);

  // Copiar URL publica
  const copyPublicUrl = () => {
    if (!formulario) return;
    const url = `${window.location.origin}/form/${formulario.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copiada para a area de transferencia!');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!formulario) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-2">Formulario nao encontrado</h2>
          <p className="text-muted-foreground mb-4">O formulario solicitado nao existe.</p>
          <Button onClick={() => navigate('/formularios')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Formularios
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/formularios" className="hover:text-foreground transition-colors">
            Formulários
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{formulario.nome}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{formulario.nome}</h1>
              {formulario.descricao && (
                <p className="text-muted-foreground mt-1 text-sm">{formulario.descricao}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => navigate(`/formularios/${formulario.id}/editar`)}>
                <Edit className="h-4 w-4 mr-1.5" />
                Editar
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1.5" />
                Excluir
              </Button>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(`/form/${formulario.slug}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Visualizar
            </Button>
            <Button variant="outline" size="sm" onClick={copyPublicUrl}>
              <Copy className="h-4 w-4 mr-1.5" />
              Copiar Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEmbedModalOpen(true)}>
              <Code className="h-4 w-4 mr-1.5" />
              Incorporar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareModalOpen(true)}>
              <Share2 className="h-4 w-4 mr-1.5" />
              Compartilhar
            </Button>
          </div>
        </div>

        {/* Info Card com badges */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Badge
                variant={formulario.ativo ? 'default' : 'secondary'}
                className={formulario.ativo ? 'bg-green-500 hover:bg-green-500' : ''}
              >
                {formulario.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              <Badge variant="outline">
                {formulario.modo === 'wizard' ? 'Wizard' : 'Simples'}
              </Badge>
              <Badge variant="outline">
                {formulario.campos?.length || 0} campos
              </Badge>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <span className="text-sm text-muted-foreground">
                Slug: <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/form/{formulario.slug}</code>
              </span>
              {formulario.franqueado && (
                <>
                  <Separator orientation="vertical" className="h-4 hidden sm:block" />
                  <span className="text-sm text-muted-foreground">
                    Clínica: <span className="font-medium text-foreground">{formulario.franqueado.nome_fantasia}</span>
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            title="Visualizações"
            value={stats.views}
            icon={Eye}
            description="Total de acessos"
          />
          <StatCard
            title="Iniciados"
            value={stats.starts}
            icon={Users}
            description="Começaram a preencher"
          />
          <StatCard
            title="Enviados"
            value={stats.submits}
            icon={CheckCircle2}
            description="Formulários completos"
          />
          <StatCard
            title="Conversão"
            value={`${stats.conversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            description="Taxa de conversão"
          />
          <StatCard
            title="Tempo Médio"
            value={`${Math.round(stats.avgTimeSeconds)}s`}
            icon={Clock}
            description="Tempo de preenchimento"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="submissoes" className="w-full">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="submissoes" className="flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Submissões
              </TabsTrigger>
              <TabsTrigger value="campos" className="flex items-center gap-1.5">
                <List className="h-3.5 w-3.5" />
                Campos
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Config
              </TabsTrigger>
              <TabsTrigger value="personalizacao" className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="ab-tests" className="flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5" />
                A/B Test
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Submissões */}
          <TabsContent value="submissoes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Submissões Recentes</CardTitle>
                <CardDescription>Últimas submissões recebidas neste formulário</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSubmissoes ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : submissoes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Send className="h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma submissão ainda</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissoes.map((sub) => {
                        const dados = sub.dados as Record<string, unknown> || {};
                        return (
                          <TableRow key={sub.id}>
                            <TableCell className="text-sm">
                              {sub.created_at
                                ? format(new Date(sub.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                : '-'}
                            </TableCell>
                            <TableCell>{String(dados.nome || dados.name || '-')}</TableCell>
                            <TableCell>{String(dados.email || '-')}</TableCell>
                            <TableCell>{String(dados.telefone || dados.phone || dados.tel || '-')}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Recebido
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campos */}
          <TabsContent value="campos" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Campos do Formulário</CardTitle>
                  <CardDescription>Lista de campos configurados</CardDescription>
                </div>
                <Button onClick={() => navigate(`/formularios/${formulario.id}/editar`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Campos
                </Button>
              </CardHeader>
              <CardContent>
                {!formulario.campos || formulario.campos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <List className="h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhum campo configurado</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate(`/formularios/${formulario.id}/editar`)}
                    >
                      Adicionar Campos
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Obrigatório</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formulario.campos
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((campo) => (
                          <TableRow key={campo.id}>
                            <TableCell>{campo.ordem}</TableCell>
                            <TableCell className="font-medium">{campo.label}</TableCell>
                            <TableCell className="font-mono text-sm">{campo.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{campo.tipo}</Badge>
                            </TableCell>
                            <TableCell>
                              {campo.obrigatorio ? (
                                <Badge className="bg-amber-500">Sim</Badge>
                              ) : (
                                <Badge variant="secondary">Não</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {campo.ativo ? (
                                <Badge className="bg-green-500">Ativo</Badge>
                              ) : (
                                <Badge variant="secondary">Inativo</Badge>
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

          <TabsContent value="analytics" className="mt-6">
            <FormularioAnalyticsDashboard formularioId={formulario.id} />
          </TabsContent>

          <TabsContent value="personalizacao" className="mt-6">
            <FormularioPersonalizacaoEditor
              formulario={formulario}
              onChange={handleSavePersonalizacao}
              saving={savingPersonalizacao}
            />
          </TabsContent>

          <TabsContent value="ab-tests" className="mt-6">
            <FormularioABTestManager
              formularioId={formulario.id}
              formularioNome={formulario.nome}
            />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuracoes do Formulario</CardTitle>
                <CardDescription>Informacoes e configuracoes atuais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Info Basica */}
                <div>
                  <h3 className="font-medium mb-3">Informacoes Basicas</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{formulario.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Slug</p>
                      <p className="font-medium">{formulario.slug}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Modo</p>
                      <p className="font-medium capitalize">{formulario.modo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Campos</p>
                      <p className="font-medium">{formulario.campos?.length || 0} campos</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Criado em</p>
                      <p className="font-medium">
                        {formulario.created_at
                          ? format(new Date(formulario.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Atualizado em</p>
                      <p className="font-medium">
                        {formulario.updated_at
                          ? format(new Date(formulario.updated_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Acao Pos-Envio */}
                <div>
                  <h3 className="font-medium mb-3">Acao Pos-Envio</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-medium capitalize">{formulario.acao_pos_envio}</p>
                    </div>
                    {formulario.acao_pos_envio === 'mensagem' && (
                      <div>
                        <p className="text-sm text-muted-foreground">Mensagem de Sucesso</p>
                        <p className="font-medium">{formulario.mensagem_sucesso || '-'}</p>
                      </div>
                    )}
                    {formulario.acao_pos_envio === 'redirect' && (
                      <div>
                        <p className="text-sm text-muted-foreground">URL de Redirecionamento</p>
                        <p className="font-medium">{formulario.redirect_url || '-'}</p>
                      </div>
                    )}
                    {formulario.acao_pos_envio === 'whatsapp' && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Numero WhatsApp</p>
                          <p className="font-medium">{formulario.whatsapp_numero || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mensagem WhatsApp</p>
                          <p className="font-medium">{formulario.whatsapp_mensagem || '-'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Pixels */}
                <div>
                  <h3 className="font-medium mb-3">Pixels de Rastreamento</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Facebook Pixel</p>
                      <p className="font-medium">{formulario.pixel_facebook || 'Nao configurado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Google Analytics (GA4)</p>
                      <p className="font-medium">{formulario.pixel_ga4 || 'Nao configurado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">TikTok Pixel</p>
                      <p className="font-medium">{formulario.pixel_tiktok || 'Nao configurado'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Webhook */}
                <div>
                  <h3 className="font-medium mb-3">Webhook</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={formulario.webhook_ativo ? 'default' : 'secondary'}>
                        {formulario.webhook_ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    {formulario.webhook_ativo && (
                      <div>
                        <p className="text-sm text-muted-foreground">URL</p>
                        <p className="font-medium text-sm break-all">
                          {formulario.webhook_url || '-'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <EmbedCodeModal
        open={embedModalOpen}
        onOpenChange={setEmbedModalOpen}
        formularioSlug={formulario.slug}
        formularioNome={formulario.nome}
      />

      <FormularioShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        formularioSlug={formulario.slug}
        formularioNome={formulario.nome}
      />
    </DashboardLayout>
  );
}
