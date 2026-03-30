import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, DollarSign, Settings, Download, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTenantContext } from '@/contexts/TenantContext';
import { useWhatsAppCostsMT } from '@/hooks/multitenant/useWhatsAppCostsMT';
import { CostSummaryCards, BudgetConfigForm } from '@/components/whatsapp/hybrid';
import { formatCostBRL } from '@/types/whatsapp-hybrid';
import type { PeriodType, UpdateBudgetInput } from '@/types/whatsapp-hybrid';

export default function WhatsAppCustos() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const [periodFilter, setPeriodFilter] = useState<PeriodType | undefined>('monthly');
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  const {
    costs,
    currentMonthCosts,
    summary,
    isLoading,
    refetch,
    updateBudget,
  } = useWhatsAppCostsMT({ period_type: periodFilter });

  const isAdmin = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  const handleBudgetSubmit = (data: UpdateBudgetInput) => {
    updateBudget.mutate(data, {
      onSuccess: () => setShowBudgetForm(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/whatsapp')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Custos WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe gastos com Meta Cloud API
              {tenant && ` - ${tenant.nome_fantasia}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={periodFilter}
            onValueChange={(v) => setPeriodFilter(v as PeriodType)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowBudgetForm(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Orçamento
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <CostSummaryCards summary={summary} isLoading={isLoading} />

      {/* Cost table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Histórico de Custos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 animate-pulse bg-muted rounded" />
          ) : costs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum registro de custo encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  {accessLevel !== 'franchise' && <TableHead>Franquia</TableHead>}
                  <TableHead className="text-right">Total Msgs</TableHead>
                  <TableHead className="text-right">WAHA</TableHead>
                  <TableHead className="text-right">Meta (grátis)</TableHead>
                  <TableHead className="text-right">Meta (pago)</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Orçamento</TableHead>
                  <TableHead className="text-right">Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => {
                  const usage = cost.budget_usage_pct;
                  return (
                    <TableRow key={cost.id}>
                      <TableCell className="text-xs">
                        {new Date(cost.period_start).toLocaleDateString('pt-BR')}
                        {' → '}
                        {new Date(cost.period_end).toLocaleDateString('pt-BR')}
                      </TableCell>
                      {accessLevel !== 'franchise' && (
                        <TableCell className="text-xs">
                          {cost.franchise ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {cost.franchise.nome}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Global</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-medium">{cost.total_messages}</TableCell>
                      <TableCell className="text-right text-green-600">{cost.messages_waha}</TableCell>
                      <TableCell className="text-right text-blue-600">{cost.messages_meta_free}</TableCell>
                      <TableCell className="text-right text-orange-600">{cost.messages_meta_paid}</TableCell>
                      <TableCell className="text-right font-medium">{formatCostBRL(cost.cost_total)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {cost.budget_limit ? formatCostBRL(cost.budget_limit) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {usage !== undefined ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              usage > 95 ? 'border-red-300 text-red-600' :
                              usage > 80 ? 'border-yellow-300 text-yellow-600' :
                              'border-green-300 text-green-600'
                            }`}
                          >
                            {usage.toFixed(0)}%
                          </Badge>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Budget Dialog */}
      <Dialog open={showBudgetForm} onOpenChange={setShowBudgetForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Orçamento</DialogTitle>
          </DialogHeader>
          <BudgetConfigForm
            currentBudget={summary.budgetTotal}
            onSubmit={handleBudgetSubmit}
            onCancel={() => setShowBudgetForm(false)}
            isSubmitting={updateBudget.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
