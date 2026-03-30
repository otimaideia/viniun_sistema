import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Megaphone,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAdCampaignsMT } from '@/hooks/multitenant/useAdCampaignsMT';
import {
  CAMPAIGN_STATUS_LABELS,
  PLATFORM_LABELS,
} from '@/types/ad-campaigns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function AdCampaigns() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { campaigns, isLoading, remove } = useAdCampaignsMT({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    plataforma: platformFilter !== 'all' ? platformFilter : undefined,
  });

  const handleDelete = () => {
    if (deleteId) {
      remove.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/ia" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          YESia
        </Link>
        <span>/</span>
        <Link to="/ia/trafego" className="hover:text-foreground">
          Trafego
        </Link>
        <span>/</span>
        <span className="text-foreground">Campanhas</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campanhas de Anuncios</h1>
          <p className="text-muted-foreground">
            {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''}
            {tenant && ` - ${tenant.nome_fantasia}`}
          </p>
        </div>
        <Button onClick={() => navigate('/ia/trafego/campanhas/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Plataformas</SelectItem>
            {Object.entries(PLATFORM_LABELS).map(([key, val]) => (
              <SelectItem key={key} value={key}>
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">Nenhuma campanha encontrada</p>
              <p className="text-sm mt-1">Crie sua primeira campanha de anuncios.</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/ia/trafego/campanhas/novo')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Investido</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const statusInfo = CAMPAIGN_STATUS_LABELS[campaign.status] || {
                    label: campaign.status,
                    color: 'text-gray-600 bg-gray-100',
                  };
                  const platformInfo = PLATFORM_LABELS[campaign.plataforma] || {
                    label: campaign.plataforma,
                  };

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/ia/trafego/campanhas/${campaign.id}`}
                          className="hover:underline"
                        >
                          {campaign.nome}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{platformInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(campaign.budget_gasto)}
                      </TableCell>
                      <TableCell className="text-right">{campaign.leads_gerados}</TableCell>
                      <TableCell className="text-right">{campaign.vendas}</TableCell>
                      <TableCell className="text-right font-medium">
                        {campaign.roas.toFixed(2)}x
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/ia/trafego/campanhas/${campaign.id}`)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/ia/trafego/campanhas/${campaign.id}/editar`)
                              }
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A campanha sera removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
