import { Link, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Bot,
  DollarSign,
  Settings,
  BarChart3,
  Loader2,
  ArrowRight,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useAIAgentsMT, useAIAgentsAdminMT } from '@/hooks/multitenant/useAIAgentsMT';
import { useAITokenUsageMT } from '@/hooks/multitenant/useAITokenUsageMT';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function IAHome() {
  const navigate = useNavigate();
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const { agents: activeAgents, isLoading: isAgentsLoading } = useAIAgentsMT();
  const { agents: allAgents } = useAIAgentsAdminMT();
  const { todayUsage, monthUsage, isLoading: isUsageLoading } = useAITokenUsageMT();

  if (isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalAgents = allAgents.length;
  const activeCount = activeAgents.length;
  const todayCostBrl = todayUsage.cost_brl;
  const monthCostBrl = monthUsage.totals.cost_brl;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            YESia - Inteligencia Artificial
          </h1>
          <p className="text-muted-foreground">
            Painel de gerenciamento da IA
            {tenant && (
              <span className="ml-1">- {tenant.nome_fantasia}</span>
            )}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isAgentsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalAgents}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCount} ativo(s) · {totalAgents - activeCount} inativo(s)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isAgentsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                <p className="text-xs text-muted-foreground">
                  {totalAgents > 0
                    ? `${((activeCount / totalAgents) * 100).toFixed(0)}% do total`
                    : 'Nenhum agente cadastrado'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isUsageLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(todayCostBrl)}</div>
                <p className="text-xs text-muted-foreground">
                  {todayUsage.requests} requisicao(oes) · {todayUsage.tokens.toLocaleString('pt-BR')} tokens
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isUsageLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(monthCostBrl)}</div>
                <p className="text-xs text-muted-foreground">
                  {monthUsage.totals.requests.toLocaleString('pt-BR')} requisicoes no mes
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/ia/config')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Configuracao Global
            </CardTitle>
            <CardDescription>
              Defina provedor padrao, chaves de API, limites de custo e funcionalidades da IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/ia/config">
                Configurar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/ia/agentes')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              Gerenciar Agentes
            </CardTitle>
            <CardDescription>
              Crie, edite e gerencie agentes de IA especializados para diferentes dominios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              {activeAgents.slice(0, 3).map((agent) => (
                <Badge key={agent.id} variant="secondary" className="text-xs">
                  {agent.nome}
                </Badge>
              ))}
              {activeAgents.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{activeAgents.length - 3}
                </Badge>
              )}
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/ia/agentes">
                Ver Agentes
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/ia/custos')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Custos e Uso
            </CardTitle>
            <CardDescription>
              Acompanhe o consumo de tokens, custos por provedor e agente, e limites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/ia/custos">
                Ver Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
