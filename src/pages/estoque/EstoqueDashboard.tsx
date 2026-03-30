import { Link } from "react-router-dom";
import {
  useEstoqueDashboardMT,
  useInventoryAlertsMT,
} from "@/hooks/multitenant/useEstoqueMT";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowDownToLine,
  TrendingDown,
  Bell,
  PackagePlus,
  PackageSearch,
  Truck,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { ALERT_TYPE_LABELS } from "@/types/estoque";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const severityColor: Record<string, string> = {
  baixa: "bg-blue-100 text-blue-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  critica: "bg-red-100 text-red-800",
};

export default function EstoqueDashboard() {
  const { metrics, isLoading } = useEstoqueDashboardMT();
  const { alerts, isLoading: alertsLoading, resolveAlert } = useInventoryAlertsMT();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">
            Visao geral do inventario e alertas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/estoque/insumos">
              <PackageSearch className="mr-2 h-4 w-4" />
              Insumos
            </Link>
          </Button>
          <Button asChild>
            <Link to="/estoque/movimentacoes/entrada">
              <PackagePlus className="mr-2 h-4 w-4" />
              Nova Entrada
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.valor_total_estoque || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total investido em insumos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Cadastrados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_produtos || 0}</div>
            <p className="text-xs text-muted-foreground">
              Produtos ativos no catalogo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics?.produtos_estoque_baixo || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Abaixo do estoque minimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencendo em 30 dias</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics?.produtos_vencendo_30dias || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.produtos_vencidos || 0} ja vencidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimentacoes Hoje</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.movimentacoes_hoje || 0}</div>
            <p className="text-xs text-muted-foreground">
              Entradas e saidas no dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consumo Medio Mensal</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.consumo_medio_mensal || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unidades/produto/mes
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alertas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Pendentes
              {(metrics?.alertas_pendentes || 0) > 0 && (
                <Badge variant="destructive">{metrics?.alertas_pendentes}</Badge>
              )}
            </CardTitle>
            <CardDescription>Alertas que precisam de atenao</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                <p>Nenhum alerta pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className={severityColor[alert.severidade] || ""}
                        >
                          {alert.severidade}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {ALERT_TYPE_LABELS[alert.tipo]}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{alert.titulo}</p>
                      {alert.product && (
                        <p className="text-xs text-muted-foreground">
                          {alert.product.nome}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-sm text-center text-muted-foreground">
                    E mais {alerts.length - 5} alertas...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acoes Rapidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acoes Rapidas</CardTitle>
            <CardDescription>Atalhos para operacoes frequentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link to="/estoque/movimentacoes/entrada">
                  <ArrowDownToLine className="mr-3 h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Registrar Entrada</div>
                    <div className="text-xs text-muted-foreground">
                      Compra de insumos
                    </div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link to="/estoque/insumos/novo">
                  <PackagePlus className="mr-3 h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Novo Insumo</div>
                    <div className="text-xs text-muted-foreground">
                      Cadastrar insumo
                    </div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link to="/estoque/movimentacoes">
                  <PackageSearch className="mr-3 h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Movimentacoes</div>
                    <div className="text-xs text-muted-foreground">
                      Historico completo
                    </div>
                  </div>
                </Link>
              </Button>

              <Button variant="outline" className="justify-start h-auto py-3" asChild>
                <Link to="/estoque/fornecedores">
                  <Truck className="mr-3 h-5 w-5 text-orange-600" />
                  <div className="text-left">
                    <div className="font-medium">Fornecedores</div>
                    <div className="text-xs text-muted-foreground">
                      Gerenciar fornecedores
                    </div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
