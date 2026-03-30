import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Search, DollarSign, Package, BarChart3 } from 'lucide-react';
import { usePrecificacaoListMT } from '@/hooks/multitenant/usePrecificacaoMT';
import { useState } from 'react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const STATUS_CONFIG = {
  saudavel: { label: 'Saudável', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  atencao: { label: 'Atenção', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  critico: { label: 'Crítico', color: 'bg-red-100 text-red-700', icon: TrendingDown },
  sem_dados: { label: 'Sem Dados', color: 'bg-gray-100 text-gray-500', icon: Package },
};

export default function PrecificacaoDashboard() {
  const navigate = useNavigate();
  const { services, isLoading, metricas } = usePrecificacaoListMT();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filtered = services.filter(s => {
    const matchSearch = !search || s.nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Precificação
        </h1>
        <p className="text-muted-foreground text-sm">
          Análise de custos, margens e precificação de serviços
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('')}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Serviços</p>
            <p className="text-2xl font-bold">{metricas.total}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200" onClick={() => setStatusFilter('saudavel')}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-600">Saudáveis</p>
            <p className="text-2xl font-bold text-green-700">{metricas.saudaveis}</p>
            <p className="text-xs text-muted-foreground">margem {'>'}40%</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200" onClick={() => setStatusFilter('atencao')}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-amber-600">Atenção</p>
            <p className="text-2xl font-bold text-amber-700">{metricas.atencao}</p>
            <p className="text-xs text-muted-foreground">margem 20-40%</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200" onClick={() => setStatusFilter('critico')}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-red-600">Críticos</p>
            <p className="text-2xl font-bold text-red-700">{metricas.criticos}</p>
            <p className="text-xs text-muted-foreground">margem {'<'}20%</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-gray-200" onClick={() => setStatusFilter('sem_dados')}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Sem Dados</p>
            <p className="text-2xl font-bold text-gray-500">{metricas.semDados}</p>
            <p className="text-xs text-muted-foreground">sem custo/preço</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo */}
      {metricas.custoMedio > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Custo Médio/Sessão</p>
                <p className="text-lg font-bold">{formatCurrency(metricas.custoMedio)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Margem Média</p>
                <p className="text-lg font-bold">{metricas.margemMedia.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtro */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar serviço..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {statusFilter && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('')}>
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Insumos</TableHead>
                  <TableHead className="text-right">Mão de Obra</TableHead>
                  <TableHead className="text-right">Custos Fixos</TableHead>
                  <TableHead className="text-right font-bold">Custo Total</TableHead>
                  <TableHead className="text-right">Preço Maior</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {search ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(svc => {
                  const cfg = STATUS_CONFIG[svc.status];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={svc.service_id} className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/precificacao/${svc.service_id}`)}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{svc.nome}</p>
                          {svc.categoria && <p className="text-xs text-muted-foreground">{svc.categoria}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{svc.custo_insumos > 0 ? formatCurrency(svc.custo_insumos) : '-'}</TableCell>
                      <TableCell className="text-right text-sm">{svc.custo_mao_obra > 0 ? formatCurrency(svc.custo_mao_obra) : '-'}</TableCell>
                      <TableCell className="text-right text-sm">{svc.custo_fixo_rateado > 0 ? formatCurrency(svc.custo_fixo_rateado) : '-'}</TableCell>
                      <TableCell className="text-right text-sm font-bold">
                        {svc.custo_total_sessao > 0 ? formatCurrency(svc.custo_total_sessao) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {svc.preco_tabela_maior ? formatCurrency(svc.preco_tabela_maior) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {svc.preco_tabela_maior && svc.custo_total_sessao > 0 ? (
                          <span className={svc.margem_maior >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {svc.margem_maior_pct.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={`${cfg.color} text-xs`}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
