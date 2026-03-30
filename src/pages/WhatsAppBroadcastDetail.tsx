// Pagina: Detalhe de Campanha de Broadcast com Progresso Real-Time

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  XCircle,
  Pencil,
  Send,
  CheckCircle2,
  Eye,
  AlertCircle,
  Clock,
  Radio,
  Users,
  Loader2,
  RefreshCw,
  Phone,
  User,
  Calendar,
  MessageSquare,
  Settings,
  Megaphone,
  Search,
  Copy,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTenantContext } from '@/contexts/TenantContext';
import {
  useBroadcastCampaignMT,
  useBroadcastCampaignsMT,
  type BroadcastCampaignStatus,
} from '@/hooks/multitenant/useBroadcastCampaignsMT';
import {
  useBroadcastMessagesMT,
  useBroadcastStatsMT,
  type BroadcastMessageStatus,
} from '@/hooks/multitenant/useBroadcastMessagesMT';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  BroadcastCampaignStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  scheduled: { label: 'Agendada', variant: 'default', className: 'bg-blue-500 hover:bg-blue-600' },
  processing: { label: 'Enviando', variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-600 animate-pulse' },
  paused: { label: 'Pausada', variant: 'default', className: 'bg-orange-500 hover:bg-orange-600' },
  completed: { label: 'Concluida', variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
  failed: { label: 'Falhou', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

const MSG_STATUS_CONFIG: Record<
  BroadcastMessageStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  sending: { label: 'Enviando', variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-600' },
  sent: { label: 'Enviado', variant: 'default', className: 'bg-blue-500 hover:bg-blue-600' },
  delivered: { label: 'Entregue', variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
  read: { label: 'Lido', variant: 'default', className: 'bg-emerald-500 hover:bg-emerald-600' },
  failed: { label: 'Falhou', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
};

const PROVIDER_LABELS: Record<string, { label: string; className: string }> = {
  waha: { label: 'WAHA', className: 'bg-green-100 text-green-700 border-green-200' },
  meta_api: { label: 'Meta', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  evolution: { label: 'Evolution', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}

function formatPhone(phone: string): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhatsAppBroadcastDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();

  // State
  const [messagesTab, setMessagesTab] = useState<BroadcastMessageStatus | 'all'>('all');
  const [messagesPage, setMessagesPage] = useState(0);
  const [messagesSearch, setMessagesSearch] = useState('');
  const pageSize = 50;

  // Hooks
  const { campaign, isLoading: isLoadingCampaign } = useBroadcastCampaignMT(id);
  const { stats, isLoading: isLoadingStats } = useBroadcastStatsMT(id);
  const {
    messages,
    total: totalMessages,
    totalPages,
    isLoading: isLoadingMessages,
    isFetching: isFetchingMessages,
  } = useBroadcastMessagesMT(id, {
    status: messagesTab === 'all' ? undefined : messagesTab,
    search: messagesSearch || undefined,
    page: messagesPage,
    pageSize,
  });

  const {
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,
    duplicateCampaign,
    isStarting,
    isPausing,
    isResuming,
    isCancelling,
    isDuplicating,
  } = useBroadcastCampaignsMT();

  const isActionPending = isStarting || isPausing || isResuming || isCancelling || isDuplicating;

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (isLoadingCampaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold mb-2">Campanha nao encontrada</h2>
        <p className="text-muted-foreground text-sm mb-4">
          A campanha pode ter sido removida ou voce nao tem permissao para acessa-la.
        </p>
        <Button variant="outline" asChild>
          <Link to="/whatsapp/broadcast">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const providerCfg = PROVIDER_LABELS[campaign.provider_type] || PROVIDER_LABELS.waha;

  const progressPercent =
    campaign.total_recipients > 0
      ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
      : 0;

  const deliveryRate =
    campaign.sent_count > 0
      ? Math.round((campaign.delivered_count / campaign.sent_count) * 100)
      : 0;

  const readRate =
    campaign.delivered_count > 0
      ? Math.round((campaign.read_count / campaign.delivered_count) * 100)
      : 0;

  const showProgress = ['processing', 'paused', 'completed', 'failed'].includes(campaign.status);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link to="/whatsapp/broadcast">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{campaign.nome}</h1>
              <Badge variant={statusCfg.variant} className={statusCfg.className}>
                {statusCfg.label}
              </Badge>
              <Badge variant="outline" className={providerCfg.className}>
                {providerCfg.label}
              </Badge>
            </div>
            {campaign.descricao && (
              <p className="text-muted-foreground">{campaign.descricao}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {campaign.status === 'draft' && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/whatsapp/broadcast/${campaign.id}/editar`)}
                disabled={isActionPending}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isActionPending}>
                    {isStarting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Iniciar Envio
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Iniciar campanha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      As mensagens serao enviadas para todos os destinatarios da lista. Essa acao nao pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => startCampaign.mutate(campaign.id)}>
                      Iniciar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {campaign.status === 'processing' && (
            <Button
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
              onClick={() => pauseCampaign.mutate(campaign.id)}
              disabled={isActionPending}
            >
              {isPausing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              Pausar
            </Button>
          )}

          {campaign.status === 'wave_pause' && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Onda {campaign.current_wave || 1} concluída
              </Badge>
              {campaign.next_wave_at && (
                <span className="text-xs text-muted-foreground">
                  Próxima onda: {new Date(campaign.next_wave_at).toLocaleString('pt-BR')}
                </span>
              )}
              <Button
                size="sm"
                onClick={() => resumeCampaign.mutate(campaign.id)}
                disabled={isActionPending}
              >
                {isResuming ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Retomar agora
              </Button>
            </div>
          )}

          {campaign.status === 'paused' && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/whatsapp/broadcast/${campaign.id}/editar`)}
                disabled={isActionPending}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                onClick={() => resumeCampaign.mutate(campaign.id)}
                disabled={isActionPending}
              >
                {isResuming ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Retomar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isActionPending}>
                    {isCancelling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Cancelar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar campanha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      As mensagens pendentes nao serao enviadas. Mensagens ja enviadas nao serao afetadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelCampaign.mutate(campaign.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmar Cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {/* Duplicar - disponível em qualquer status */}
          <Button
            variant="outline"
            onClick={async () => {
              const newId = await duplicateCampaign.mutateAsync(campaign.id);
              navigate(`/whatsapp/broadcast/${newId}/editar`);
            }}
            disabled={isActionPending}
          >
            {isDuplicating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Duplicar
          </Button>
        </div>
      </div>

      {/* Progress section */}
      {showProgress && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Progresso de envio
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(campaign.sent_count)} / {formatNumber(campaign.total_recipients)} ({progressPercent}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Send className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{formatNumber(campaign.sent_count)}</p>
                  <p className="text-xs text-blue-600">Enviados</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{formatNumber(campaign.delivered_count)}</p>
                  <p className="text-xs text-green-600">Entregues</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <Eye className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{formatNumber(campaign.read_count)}</p>
                  <p className="text-xs text-emerald-600">Lidos</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{formatNumber(campaign.failed_count)}</p>
                  <p className="text-xs text-red-600">Falhados</p>
                </div>
              </div>

              {/* Rates */}
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Taxa de entrega: </span>
                  <span className="font-semibold">{deliveryRate}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Taxa de leitura: </span>
                  <span className="font-semibold">{readRate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Detalhes da Campanha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider:</span>
              <Badge variant="outline" className={providerCfg.className}>
                {providerCfg.label}
              </Badge>
            </div>
            {campaign.session && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessao:</span>
                <span className="font-medium">
                  {campaign.session.display_name || campaign.session.session_name}
                </span>
              </div>
            )}
            {campaign.list && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lista:</span>
                <span className="font-medium">{campaign.list.nome}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destinatarios:</span>
              <span className="font-medium">{formatNumber(campaign.total_recipients)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delay:</span>
              <span className="font-medium">{campaign.delay_between_messages_ms}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lote:</span>
              <span className="font-medium">{campaign.batch_size || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency cap:</span>
              <span className="font-medium">
                {campaign.frequency_cap_hours
                  ? `${campaign.frequency_cap_hours}h`
                  : 'Sem limite'}
              </span>
            </div>
            {campaign.scheduled_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agendamento:</span>
                <span className="font-medium">{formatDate(campaign.scheduled_at)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criado em:</span>
              <span className="font-medium">{formatDate(campaign.created_at)}</span>
            </div>
            {campaign.started_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Iniciado em:</span>
                <span className="font-medium">{formatDate(campaign.started_at)}</span>
              </div>
            )}
            {campaign.completed_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concluido em:</span>
                <span className="font-medium">{formatDate(campaign.completed_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message preview card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {campaign.provider_type === 'waha' ? 'Preview da Mensagem' : 'Informacoes do Template'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaign.provider_type === 'waha' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="capitalize">
                    {campaign.message_type}
                  </Badge>
                </div>
                {campaign.message_text && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{campaign.message_text}</p>
                  </div>
                )}
                {campaign.media_url && (
                  <div className="mt-3">
                    {campaign.message_type === 'image' ? (
                      <a href={campaign.media_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={campaign.media_url}
                          alt="Mídia da campanha"
                          className="max-h-48 rounded-lg object-contain border"
                        />
                      </a>
                    ) : campaign.message_type === 'video' ? (
                      <video
                        src={campaign.media_url}
                        controls
                        className="max-h-48 rounded-lg"
                      />
                    ) : (
                      <a
                        href={campaign.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" />
                        {campaign.media_url.split('/').pop()}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {campaign.template_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template:</span>
                    <span className="font-medium">{campaign.template_name}</span>
                  </div>
                )}
                {campaign.template_components && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Parametros:</span>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(campaign.template_components, null, 2)}
                    </pre>
                  </div>
                )}
                {campaign.message_text && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Conteudo de referencia:</span>
                    <div className="bg-muted/50 p-3 rounded">
                      <p className="text-sm whitespace-pre-wrap">{campaign.message_text}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Messages table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Mensagens ({formatNumber(totalMessages)})</CardTitle>
            {isFetchingMessages && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message tabs */}
          <Tabs
            value={messagesTab}
            onValueChange={(v) => {
              setMessagesTab(v as BroadcastMessageStatus | 'all');
              setMessagesPage(0);
            }}
          >
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">
                  Todos
                  {stats.total > 0 && <span className="ml-1 text-xs">({stats.total})</span>}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pendentes
                  {stats.pending > 0 && <span className="ml-1 text-xs">({stats.pending})</span>}
                </TabsTrigger>
                <TabsTrigger value="sent">
                  Enviados
                  {stats.sent > 0 && <span className="ml-1 text-xs">({stats.sent})</span>}
                </TabsTrigger>
                <TabsTrigger value="delivered">
                  Entregues
                  {stats.delivered > 0 && <span className="ml-1 text-xs">({stats.delivered})</span>}
                </TabsTrigger>
                <TabsTrigger value="read">
                  Lidos
                  {stats.read > 0 && <span className="ml-1 text-xs">({stats.read})</span>}
                </TabsTrigger>
                <TabsTrigger value="failed">
                  Falhados
                  {stats.failed > 0 && <span className="ml-1 text-xs">({stats.failed})</span>}
                </TabsTrigger>
              </TabsList>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar telefone ou nome..."
                  value={messagesSearch}
                  onChange={(e) => {
                    setMessagesSearch(e.target.value);
                    setMessagesPage(0);
                  }}
                  className="pl-10 w-[250px]"
                />
              </div>
            </div>

            {/* Messages table content (shared across all tabs) */}
            <div className="mt-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {messagesSearch
                      ? 'Nenhuma mensagem encontrada com esses filtros.'
                      : campaign.status === 'draft'
                      ? 'As mensagens serao criadas quando a campanha for iniciada.'
                      : 'Nenhuma mensagem nesta categoria.'}
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Entregue em</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => {
                        const msgStatusCfg = MSG_STATUS_CONFIG[msg.status] || MSG_STATUS_CONFIG.pending;
                        return (
                          <TableRow key={msg.id}>
                            <TableCell className="font-mono text-sm">
                              {formatPhone(msg.phone)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {msg.nome || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={msgStatusCfg.variant} className={msgStatusCfg.className}>
                                {msgStatusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(msg.sent_at)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(msg.delivered_at)}
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px]">
                              {msg.error_message ? (
                                <span className="text-destructive truncate block" title={msg.error_message}>
                                  {msg.error_message}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-muted-foreground">
                        Pagina {messagesPage + 1} de {totalPages} ({formatNumber(totalMessages)} mensagens)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMessagesPage((p) => Math.max(0, p - 1))}
                          disabled={messagesPage === 0}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMessagesPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={messagesPage >= totalPages - 1}
                        >
                          Proximo
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
