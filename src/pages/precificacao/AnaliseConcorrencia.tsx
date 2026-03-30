import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingDown, TrendingUp, Minus, BarChart3, Building2, Plus, RefreshCw,
  ArrowDown, ArrowUp, ExternalLink, AlertCircle,
} from 'lucide-react';
import { useComparativoMT } from '@/hooks/multitenant/useCompetitivoMT';
import type { ComparativoArea } from '@/types/competitivo';

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const POSICAO_CONFIG = {
  abaixo: { label: 'Abaixo', color: 'bg-green-100 text-green-700 border-green-300', icon: ArrowDown },
  dentro: { label: 'Na média', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Minus },
  acima: { label: 'Acima', color: 'bg-red-100 text-red-700 border-red-300', icon: ArrowUp },
  sem_dados: { label: 'S/ dados', color: 'bg-gray-100 text-gray-500 border-gray-300', icon: AlertCircle },
};

function PriceCell({ value, className }: { value: number | null; className?: string }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  return <span className={className}>{formatCurrency(value)}</span>;
}

function ComparativoTable({ data, competitors }: { data: ComparativoArea[]; competitors: { id: string; nome: string }[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum dado de concorrência</p>
        <p className="text-sm">Execute o scraper para coletar preços dos concorrentes.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {/* Linha 1: Grupos de colunas por concorrente */}
          <tr className="border-b bg-muted/50">
            <th rowSpan={2} className="text-left p-3 font-semibold sticky left-0 bg-muted/50 min-w-[140px]">
              Área
            </th>
            {competitors.map(comp => (
              <th key={comp.id} colSpan={6} className="text-center p-2 font-semibold border-l">
                {comp.nome}
              </th>
            ))}
            <th colSpan={2 + competitors.length + 1} rowSpan={1} className="text-center p-2 font-semibold border-l bg-primary/5">
              YESlaser (18x)
            </th>
            <th rowSpan={2} className="text-center p-2 font-semibold border-l min-w-[80px]">
              Posição
            </th>
          </tr>
          {/* Linha 2: Sub-colunas */}
          <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
            {competitors.map(comp => (
              <React.Fragment key={`sub-${comp.id}`}>
                <th className="p-2 border-l text-center">Total</th>
                <th className="p-2 text-center">Promo</th>
                <th className="p-2 text-center">Parcelas</th>
                <th className="p-2 text-center">Créd. Total</th>
                <th className="p-2 text-center">PIX</th>
                <th className="p-2 text-center">Recorr.</th>
              </React.Fragment>
            ))}
            <th className="p-2 border-l text-center bg-primary/5">Preço</th>
            <th className="p-2 text-center bg-primary/5">18x de</th>
            {competitors.map(comp => (
              <th key={`vs-${comp.id}`} className="p-2 text-center bg-primary/5 text-xs">
                vs {comp.nome.split(' ')[0]}
              </th>
            ))}
            <th className="p-2 text-center bg-primary/5">vs Média</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const posConfig = POSICAO_CONFIG[row.posicao];
            const PosIcon = posConfig.icon;

            return (
              <tr key={`${row.area_corporal}-${row.genero}`} className={idx % 2 === 0 ? '' : 'bg-muted/20'}>
                <td className="p-3 font-medium sticky left-0 bg-background">
                  {row.area_nome}
                </td>

                {competitors.map(comp => {
                  const c = row.concorrentes.find(x => x.competitor_id === comp.id);
                  // Calcular crédito total = parcelas × valor_parcela (usando números direto)
                  const creditoTotal = c?.parcelas_num && c?.valor_parcela_num
                    ? Math.round(c.parcelas_num * c.valor_parcela_num * 100) / 100
                    : null;
                  return (
                    <React.Fragment key={`${row.area_corporal}-${comp.id}`}>
                      <td className="p-2 text-center border-l tabular-nums">
                        <PriceCell value={c?.preco_total ?? null} />
                      </td>
                      <td className="p-2 text-center tabular-nums">
                        <PriceCell value={c?.preco_promocional ?? null} className="text-green-600" />
                      </td>
                      <td className="p-2 text-center tabular-nums text-xs">
                        {c?.parcelas ? c.parcelas : '—'}
                      </td>
                      <td className="p-2 text-center tabular-nums text-xs font-medium">
                        <PriceCell value={creditoTotal} className="text-orange-600" />
                      </td>
                      <td className="p-2 text-center tabular-nums">
                        <PriceCell value={c?.preco_pix ?? null} className="text-blue-600" />
                      </td>
                      <td className="p-2 text-center tabular-nums">
                        <PriceCell value={c?.preco_recorrencia ?? null} className="text-purple-600" />
                      </td>
                    </React.Fragment>
                  );
                })}

                {/* Nossa coluna YESlaser */}
                <td className="p-2 text-center border-l bg-primary/5 font-semibold tabular-nums">
                  <PriceCell value={row.nosso_preco} />
                </td>
                <td className="p-2 text-center bg-primary/5 tabular-nums text-xs">
                  {row.nosso_preco ? (
                    <span className="text-primary font-medium">
                      {formatCurrency(row.nosso_preco / 18)}
                    </span>
                  ) : '—'}
                </td>
                {/* vs cada concorrente individual */}
                {competitors.map(comp => {
                  const c = row.concorrentes.find(x => x.competitor_id === comp.id);
                  const concCredito = c?.parcelas_num && c?.valor_parcela_num
                    ? Math.round(c.parcelas_num * c.valor_parcela_num * 100) / 100
                    : c?.preco_promocional ?? c?.preco_total ?? null;
                  const vsPct = row.nosso_preco && concCredito
                    ? Math.round(((row.nosso_preco - concCredito) / concCredito) * 1000) / 10
                    : null;
                  return (
                    <td key={`vs-${comp.id}`} className="p-2 text-center bg-primary/5 tabular-nums text-xs">
                      {vsPct !== null ? (
                        <span className={vsPct < 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {vsPct > 0 ? '+' : ''}{vsPct}%
                        </span>
                      ) : '—'}
                    </td>
                  );
                })}
                <td className="p-2 text-center bg-primary/5 tabular-nums">
                  {row.diferenca_pct !== 0 ? (
                    <span className={row.diferenca_pct < 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {row.diferenca_pct > 0 ? '+' : ''}{row.diferenca_pct}%
                    </span>
                  ) : '—'}
                </td>

                {/* Posição */}
                <td className="p-2 text-center border-l">
                  <Badge variant="outline" className={`text-xs ${posConfig.color}`}>
                    <PosIcon className="h-3 w-3 mr-1" />
                    {posConfig.label}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import React from 'react';

export default function AnaliseConcorrencia() {
  const navigate = useNavigate();
  const [genero, setGenero] = useState<'feminino' | 'masculino'>('feminino');
  const { comparativo, metricas, competitors, isLoading, refetch } = useComparativoMT(genero);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Análise Competitiva
          </h1>
          <p className="text-muted-foreground text-sm">
            Compare seus preços com a concorrência em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/precificacao/concorrentes')}>
            <Building2 className="h-4 w-4 mr-2" />
            Concorrentes
          </Button>
          <Button size="sm" onClick={() => navigate('/precificacao/concorrentes/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Concorrente
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Áreas Comparadas</p>
            <p className="text-2xl font-bold">{metricas.total_areas}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-600">Abaixo do Mercado</p>
            <p className="text-2xl font-bold text-green-700">{metricas.abaixo_mercado}</p>
            <p className="text-xs text-muted-foreground">mais barato</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-amber-600">Na Média</p>
            <p className="text-2xl font-bold text-amber-700">{metricas.dentro_mercado}</p>
            <p className="text-xs text-muted-foreground">+/- 10%</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-red-600">Acima do Mercado</p>
            <p className="text-2xl font-bold text-red-700">{metricas.acima_mercado}</p>
            <p className="text-xs text-muted-foreground">mais caro</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Diferença Média</p>
            <p className={`text-2xl font-bold ${metricas.economia_media_pct < 0 ? 'text-green-700' : metricas.economia_media_pct > 0 ? 'text-red-700' : ''}`}>
              {metricas.economia_media_pct > 0 ? '+' : ''}{metricas.economia_media_pct}%
            </p>
            <p className="text-xs text-muted-foreground">vs mercado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Feminino / Masculino */}
      <Tabs value={genero} onValueChange={(v) => setGenero(v as 'feminino' | 'masculino')}>
        <TabsList>
          <TabsTrigger value="feminino">Depilação Feminina</TabsTrigger>
          <TabsTrigger value="masculino">Depilação Masculina</TabsTrigger>
        </TabsList>

        <TabsContent value={genero}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Comparativo de Preços — {genero === 'feminino' ? 'Feminino' : 'Masculino'}
              </CardTitle>
              {competitors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {competitors.length} concorrente(s): {competitors.map(c => c.nome).join(', ')}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <ComparativoTable data={comparativo} competitors={competitors} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Instrução do scraper */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Para atualizar preços automaticamente:</strong> Execute no terminal:
          </p>
          <code className="text-xs bg-muted p-2 rounded block mt-2">
            node scripts/scrape-competitors.mjs
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            O scraper usa Playwright para navegar nos sites da Espaço Laser e Vialaser e extrair preços automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
