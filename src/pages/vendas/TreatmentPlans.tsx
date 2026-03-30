import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar, Search, Filter, Eye, MoreHorizontal,
  Pause, Play, X, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useTreatmentPlansMT, useTreatmentDashboardMT } from '@/hooks/multitenant/useTreatmentPlansMT';
import {
  TREATMENT_PLAN_STATUS_LABELS,
} from '@/types/treatment-plan';
import type { TreatmentPlanStatus } from '@/types/treatment-plan';

const STATUS_COLORS: Record<TreatmentPlanStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  ativo: 'bg-green-100 text-green-800',
  pausado: 'bg-orange-100 text-orange-800',
  concluido: 'bg-blue-100 text-blue-800',
  cancelado: 'bg-red-100 text-red-800',
};

export default function TreatmentPlans() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TreatmentPlanStatus | ''>('');

  const { plans, isLoading, pausePlan, resumePlan, cancelPlan } = useTreatmentPlansMT({
    status: statusFilter || undefined,
    search: search || undefined,
  });

  const { metrics } = useTreatmentDashboardMT();

  const handlePause = async (planId: string) => {
    await pausePlan(planId, 'Pausado pelo operador');
  };

  const handleResume = async (planId: string) => {
    await resumePlan(planId);
  };

  const handleCancel = async (planId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este plano?')) return;
    await cancelPlan(planId, 'Cancelado pelo operador');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <span>Planos de Tratamento</span>
          </div>
          <h1 className="text-2xl font-bold">Planos de Tratamento</h1>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.planos_ativos}</div>
              <p className="text-sm text-muted-foreground">Planos Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.sessoes_pendentes_semana}</div>
              <p className="text-sm text-muted-foreground">Sessoes esta Semana</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{metrics.sessoes_atrasadas}</div>
              <p className="text-sm text-muted-foreground">Sessoes Atrasadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{metrics.taxa_conclusao.toFixed(0)}%</div>
                {metrics.inadimplentes > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {metrics.inadimplentes} inadimplentes
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Taxa de Conclusao</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, servico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter || '__all__'}
              onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v as TreatmentPlanStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {Object.entries(TREATMENT_PLAN_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Servico</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="h-6 w-48 mx-auto bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ) : !plans || plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum plano de tratamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const progresso = plan.total_sessoes > 0
                    ? (plan.sessoes_concluidas / plan.total_sessoes) * 100
                    : 0;

                  return (
                    <TableRow
                      key={plan.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/vendas/tratamentos/${plan.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{plan.cliente_nome}</div>
                        {plan.cliente_telefone && (
                          <div className="text-xs text-muted-foreground">{plan.cliente_telefone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{plan.service?.nome || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center justify-between text-xs">
                            <span>{plan.sessoes_concluidas}/{plan.total_sessoes}</span>
                            <span className="text-muted-foreground">{progresso.toFixed(0)}%</span>
                          </div>
                          <Progress value={progresso} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[plan.status]}>
                          {TREATMENT_PLAN_STATUS_LABELS[plan.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {plan.pagamento_em_dia ? (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Em dia
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Inadimplente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vendas/tratamentos/${plan.id}`);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            {plan.status === 'ativo' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handlePause(plan.id);
                              }}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pausar
                              </DropdownMenuItem>
                            )}
                            {plan.status === 'pausado' && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleResume(plan.id);
                              }}>
                                <Play className="h-4 w-4 mr-2" />
                                Retomar
                              </DropdownMenuItem>
                            )}
                            {(plan.status === 'ativo' || plan.status === 'pausado') && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(plan.id);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
