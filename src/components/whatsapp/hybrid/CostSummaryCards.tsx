import { MessageSquare, Zap, Shield, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCostBRL } from '@/types/whatsapp-hybrid';

interface CostSummary {
  totalMessages: number;
  messagesWaha: number;
  messagesMetaFree: number;
  messagesMetaPaid: number;
  costTotal: number;
  costTotalFormatted: string;
  budgetTotal: number;
}

interface CostSummaryCardsProps {
  summary: CostSummary;
  isLoading?: boolean;
}

export function CostSummaryCards({ summary, isLoading = false }: CostSummaryCardsProps) {
  const budgetUsage = summary.budgetTotal > 0
    ? (summary.costTotal / summary.budgetTotal) * 100
    : 0;
  const budgetWarning = budgetUsage > 80;
  const budgetCritical = budgetUsage > 95;

  const wahaPercentage = summary.totalMessages > 0
    ? ((summary.messagesWaha / summary.totalMessages) * 100).toFixed(0)
    : '0';

  const freePercentage = summary.totalMessages > 0
    ? (((summary.messagesWaha + summary.messagesMetaFree) / summary.totalMessages) * 100).toFixed(0)
    : '0';

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total de mensagens */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-100">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-muted-foreground">Total Mês</span>
          </div>
          <p className="text-2xl font-bold">{summary.totalMessages.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {freePercentage}% gratuitas
          </p>
        </CardContent>
      </Card>

      {/* WAHA (grátis) */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-green-100">
              <Zap className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xs text-muted-foreground">Via WAHA</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{summary.messagesWaha.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-green-600 mt-1">
            {wahaPercentage}% do total (grátis)
          </p>
        </CardContent>
      </Card>

      {/* Meta API */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-purple-100">
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs text-muted-foreground">Via Meta</span>
          </div>
          <p className="text-2xl font-bold">
            {(summary.messagesMetaFree + summary.messagesMetaPaid).toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {summary.messagesMetaFree} grátis / {summary.messagesMetaPaid} pagos
          </p>
        </CardContent>
      </Card>

      {/* Custo total */}
      <Card className={budgetCritical ? 'border-red-300 bg-red-50' : budgetWarning ? 'border-yellow-300 bg-yellow-50' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${budgetCritical ? 'bg-red-100' : budgetWarning ? 'bg-yellow-100' : 'bg-orange-100'}`}>
              {budgetCritical ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                <DollarSign className="h-4 w-4 text-orange-600" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">Custo Mês</span>
          </div>
          <p className={`text-2xl font-bold ${budgetCritical ? 'text-red-600' : ''}`}>
            {summary.costTotalFormatted}
          </p>

          {summary.budgetTotal > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Orçamento</span>
                <span className={budgetCritical ? 'text-red-600 font-medium' : ''}>
                  {budgetUsage.toFixed(0)}% de {formatCostBRL(summary.budgetTotal)}
                </span>
              </div>
              <Progress
                value={Math.min(budgetUsage, 100)}
                className={`h-1.5 ${budgetCritical ? '[&>div]:bg-red-500' : budgetWarning ? '[&>div]:bg-yellow-500' : ''}`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
