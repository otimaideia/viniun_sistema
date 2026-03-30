import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Activity, CheckCircle, XCircle, Clock, Zap, Shield, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTenantContext } from '@/contexts/TenantContext';
import { useWhatsAppRoutingLogsMT } from '@/hooks/multitenant/useWhatsAppRoutingLogsMT';
import { formatCostBRL, PROVIDER_TYPE_LABELS } from '@/types/whatsapp-hybrid';
import type { ProviderType } from '@/types/whatsapp-hybrid';

export default function WhatsAppRoutingLogs() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const [providerFilter, setProviderFilter] = useState<ProviderType | 'all'>('all');
  const [successFilter, setSuccessFilter] = useState<'all' | 'true' | 'false'>('all');
  const [limit, setLimit] = useState(100);

  const { logs, stats, isLoading, refetch } = useWhatsAppRoutingLogsMT({
    provider_selected: providerFilter === 'all' ? undefined : providerFilter,
    success: successFilter === 'all' ? undefined : successFilter === 'true',
    limit,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Logs de Roteamento</h1>
            <p className="text-sm text-muted-foreground">
              Histórico de decisões do router
              {tenant && ` - ${tenant.nome_fantasia}`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{stats.wahaCount}</p>
            <p className="text-[10px] text-muted-foreground">Via WAHA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.metaCount}</p>
            <p className="text-[10px] text-muted-foreground">Via Meta</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats.successRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Sucesso</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{stats.avgResponseTime.toFixed(0)}ms</p>
            <p className="text-[10px] text-muted-foreground">Tempo médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={providerFilter}
          onValueChange={(v) => setProviderFilter(v as ProviderType | 'all')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos providers</SelectItem>
            <SelectItem value="waha">WAHA</SelectItem>
            <SelectItem value="meta_cloud_api">Meta Cloud API</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={successFilter}
          onValueChange={(v) => setSuccessFilter(v as 'all' | 'true' | 'false')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Sucesso</SelectItem>
            <SelectItem value="false">Falha</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={String(limit)}
          onValueChange={(v) => setLimit(Number(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50 registros</SelectItem>
            <SelectItem value="100">100 registros</SelectItem>
            <SelectItem value="500">500 registros</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="h-64 animate-pulse bg-muted rounded" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum log de roteamento encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Regra</TableHead>
                  <TableHead>Janela</TableHead>
                  <TableHead>Razão</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className={log.success === false ? 'bg-red-50/50' : ''}>
                    <TableCell>
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : log.success === false ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{log.error_message || 'Erro desconhecido'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          log.provider_selected === 'waha'
                            ? 'border-green-300 text-green-700'
                            : 'border-blue-300 text-blue-700'
                        }`}
                      >
                        {log.provider_selected === 'waha' ? (
                          <Zap className="h-2.5 w-2.5 mr-0.5" />
                        ) : (
                          <Shield className="h-2.5 w-2.5 mr-0.5" />
                        )}
                        {PROVIDER_TYPE_LABELS[log.provider_selected]}
                      </Badge>
                      {log.fallback_used && (
                        <Badge variant="outline" className="text-[10px] ml-1 border-orange-300 text-orange-600">
                          fallback
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {log.rule_applied_name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          log.window_status === 'open'
                            ? 'border-green-300 text-green-600'
                            : 'border-gray-300 text-gray-500'
                        }`}
                      >
                        {log.window_status === 'open' ? 'Aberta' : 'Fechada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {log.decision_reason || '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {(log.actual_cost || log.estimated_cost) > 0 ? (
                        <span className="text-orange-600">{formatCostBRL(log.actual_cost || log.estimated_cost)}</span>
                      ) : (
                        <span className="text-green-600">Grátis</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
