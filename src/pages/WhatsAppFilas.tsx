// Página: Listagem de Filas WhatsApp Multi-Tenant

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, Settings, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppQueuesMT } from '@/hooks/multitenant/useWhatsAppQueuesMT';
import { useWhatsAppSessionsMT } from '@/hooks/multitenant/useWhatsAppSessionsMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { formatWaitTime, calculateUtilizationRate, getDistributionTypeLabel } from '@/types/whatsapp-queue';
import type { QueueFilters } from '@/types/whatsapp-queue';

export default function WhatsAppFilas() {
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();
  const [filters, setFilters] = useState<QueueFilters>({ is_active: true });

  const { queues, stats, isLoading, isLoadingStats } = useWhatsAppQueuesMT(filters);
  const { sessions } = useWhatsAppSessionsMT({ is_active: true });

  const getQueueStats = (queueId: string) => {
    return stats?.find(s => s.queue_id === queueId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando filas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Filas de Atendimento</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie filas e distribua conversas automaticamente
          </p>
        </div>
        {(accessLevel === 'platform' || accessLevel === 'tenant') && (
          <Button asChild data-testid="btn-nova-fila">
            <Link to="/whatsapp/filas/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Fila
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select
            value={filters.session_id || 'all'}
            onValueChange={(v) => setFilters({ ...filters, session_id: v === 'all' ? undefined : v })}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as sessões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as sessões</SelectItem>
              {sessions?.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
            onValueChange={(v) => setFilters({ ...filters, is_active: v === 'all' ? undefined : v === 'true' })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Ativos</SelectItem>
              <SelectItem value="false">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista de Filas */}
      {queues && queues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma fila cadastrada</p>
            <p className="text-muted-foreground mb-4">Crie sua primeira fila de atendimento</p>
            <Button asChild>
              <Link to="/whatsapp/filas/novo">
                <Plus className="h-4 w-4 mr-2" />
                Nova Fila
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {queues?.map(queue => {
            const queueStats = getQueueStats(queue.id);
            const utilization = calculateUtilizationRate(
              queueStats?.current_load || 0,
              queueStats?.total_capacity || 0
            );

            return (
              <Card
                key={queue.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/whatsapp/filas/${queue.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: queue.cor }}
                      />
                      <CardTitle className="text-lg">{queue.nome}</CardTitle>
                    </div>
                    {queue.is_default && (
                      <Badge variant="secondary">Padrão</Badge>
                    )}
                  </div>
                  <CardDescription>{queue.descricao || 'Sem descrição'}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-2xl font-bold text-primary">
                        {queueStats?.queued_conversations || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Na fila</div>
                    </div>

                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {queueStats?.active_conversations || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Em atendimento</div>
                    </div>

                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-2xl font-bold">
                        {queueStats?.available_agents || 0}/{queueStats?.total_agents || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Disponíveis</div>
                    </div>

                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-2xl font-bold">
                        {utilization}%
                      </div>
                      <div className="text-xs text-muted-foreground">Utilização</div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Distribuição:</span>
                      <span className="font-medium">
                        {getDistributionTypeLabel(queue.distribution_type)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tempo médio:</span>
                      <span className="font-medium">
                        {formatWaitTime(queueStats?.avg_wait_time_seconds || 0)}
                      </span>
                    </div>

                    {!queue.is_active && (
                      <Badge variant="destructive" className="w-full justify-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Inativa
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/whatsapp/filas/${queue.id}`);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/whatsapp/filas/${queue.id}/editar`);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Config
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
