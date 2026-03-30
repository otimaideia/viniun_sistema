// Pagina: Listagem de Campanhas de Broadcast WhatsApp

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Send,
  CheckCircle2,
  Eye,
  Trash2,
  Pencil,
  BarChart3,
  Radio,
  AlertCircle,
  Search,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  useBroadcastCampaignsMT,
  type BroadcastCampaignStatus,
  type BroadcastProviderType,
  type MTBroadcastCampaign,
} from '@/hooks/multitenant/useBroadcastCampaignsMT';

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhatsAppBroadcast() {
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();

  const [statusFilter, setStatusFilter] = useState<BroadcastCampaignStatus | undefined>(undefined);
  const [providerFilter, setProviderFilter] = useState<BroadcastProviderType | undefined>(undefined);
  const [search, setSearch] = useState('');

  const {
    campaigns,
    isLoading,
    deleteCampaign,
    duplicateCampaign,
    isDeleting,
  } = useBroadcastCampaignsMT({
    status: statusFilter,
    provider_type: providerFilter,
    search: search || undefined,
  });

  // Stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'processing').length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent_count, 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered_count, 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Disparo em Massa</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie campanhas de envio de mensagens em massa via WhatsApp
          </p>
        </div>
        <Button asChild>
          <Link to="/whatsapp/broadcast/novo">
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campanhas</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCampaigns)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <Radio className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(activeCampaigns)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalSent)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanha..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter || 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as BroadcastCampaignStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="processing">Enviando</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="completed">Concluida</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={providerFilter || 'all'}
              onValueChange={(v) => setProviderFilter(v === 'all' ? undefined : v as BroadcastProviderType)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todos os providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os providers</SelectItem>
                <SelectItem value="waha">WAHA</SelectItem>
                <SelectItem value="meta_api">Meta API</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhuma campanha encontrada</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search || statusFilter || providerFilter
                ? 'Tente ajustar os filtros de busca.'
                : 'Crie sua primeira campanha de disparo em massa.'}
            </p>
            {!search && !statusFilter && !providerFilter && (
              <Button asChild>
                <Link to="/whatsapp/broadcast/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Campanha
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Destinatarios</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Entregues</TableHead>
                  <TableHead className="text-right">Lidos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <CampaignRow
                    key={campaign.id}
                    campaign={campaign}
                    onView={() => navigate(`/whatsapp/broadcast/${campaign.id}`)}
                    onEdit={() => navigate(`/whatsapp/broadcast/${campaign.id}/editar`)}
                    onDelete={() => deleteCampaign.mutate(campaign.id)}
                    onDuplicate={async () => {
                      const newId = await duplicateCampaign.mutateAsync(campaign.id);
                      navigate(`/whatsapp/broadcast/${newId}/editar`);
                    }}
                    isDeleting={isDeleting}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row Component
// ---------------------------------------------------------------------------

function CampaignRow({
  campaign,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  isDeleting,
}: {
  campaign: MTBroadcastCampaign;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDeleting: boolean;
}) {
  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const providerCfg = PROVIDER_LABELS[campaign.provider_type] || PROVIDER_LABELS.waha;

  return (
    <TableRow className="cursor-pointer" onClick={onView}>
      <TableCell className="font-medium max-w-[200px] truncate">
        {campaign.nome}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={providerCfg.className}>
          {providerCfg.label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusCfg.variant} className={statusCfg.className}>
          {statusCfg.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right">{formatNumber(campaign.total_recipients)}</TableCell>
      <TableCell className="text-right">{formatNumber(campaign.sent_count)}</TableCell>
      <TableCell className="text-right">{formatNumber(campaign.delivered_count)}</TableCell>
      <TableCell className="text-right">{formatNumber(campaign.read_count)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(campaign.created_at)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {campaign.status === 'draft' && (
            <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar">
            <Copy className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Deletar" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  A campanha "{campaign.nome}" sera removida. Esta acao nao pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
