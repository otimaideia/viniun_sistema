import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, AlertTriangle, DollarSign, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePriceComplianceMT } from '@/hooks/multitenant/usePriceComplianceMT';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = ['#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B', '#F44336', '#3F51B5'];

export default function RelatorioPrecos() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { metrics, belowFloorSales, revenueByService, serviceCompliance, isLoading } = usePriceComplianceMT({
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const paymentDistribution = [
    { name: 'Recorrencia', value: metrics?.percentual_recorrencia || 0, color: '#4CAF50' },
    { name: 'Cartao', value: metrics?.percentual_cartao || 0, color: '#2196F3' },
    { name: 'Outros', value: Math.max(0, 100 - (metrics?.percentual_recorrencia || 0) - (metrics?.percentual_cartao || 0)), color: '#9E9E9E' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <span>Relatorios</span>
          </div>
          <h1 className="text-2xl font-bold">Relatorios de Precos e Compliance</h1>
        </div>
        <Link to="/vendas">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-sm font-medium">Data Inicio</label>
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Data Fim</label>
              <input
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : metrics ? (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  % Recorrencia
                </div>
                <p className="text-2xl font-bold mt-1">
                  {metrics.percentual_recorrencia.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Meta: 70%</p>
                {metrics.percentual_recorrencia < 70 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-700 mt-1">Abaixo da meta</Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Compliance Piso
                </div>
                <p className="text-2xl font-bold mt-1">
                  {metrics.percentual_compliance.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">{metrics.vendas_acima_piso}/{metrics.total_vendas} acima do piso</p>
                {metrics.percentual_compliance >= 95 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 mt-1">Excelente</Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Ticket Medio
                </div>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(metrics.ticket_medio)}
                </p>
                <p className="text-xs text-muted-foreground">{metrics.total_vendas} vendas no periodo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Vendas Abaixo Piso
                </div>
                <p className={`text-2xl font-bold mt-1 ${metrics.vendas_abaixo_piso > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {metrics.vendas_abaixo_piso}
                </p>
                {metrics.vendas_abaixo_piso === 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 mt-1">Nenhuma</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue by Service */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Receita por Servico (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                {revenueByService.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByService} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="service_nome" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="total" fill="#E91E63" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados de receita por servico.</p>
                )}
              </CardContent>
            </Card>

            {/* Payment Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribuicao por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentDistribution.length > 0 ? (
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                        >
                          {paymentDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Sem dados de pagamento.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Service-Level Compliance Table */}
          {serviceCompliance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4" />
                  Compliance por Servico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servico</TableHead>
                        <TableHead className="text-right">Preco Tabela</TableHead>
                        <TableHead className="text-right">Preco Piso</TableHead>
                        <TableHead className="text-right">Preco Medio Vendido</TableHead>
                        <TableHead className="text-center">Qtd Vendas</TableHead>
                        <TableHead className="text-right">Total Vendido</TableHead>
                        <TableHead className="text-center">Abaixo Piso</TableHead>
                        <TableHead className="text-center">Margem %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceCompliance.map((svc, idx) => {
                        const isAboveFloor = svc.preco_piso > 0 && svc.preco_medio_vendido >= svc.preco_piso;
                        const isBelowFloor = svc.preco_piso > 0 && svc.preco_medio_vendido < svc.preco_piso;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-sm">{svc.service_nome}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(svc.preco_tabela)}</TableCell>
                            <TableCell className="text-right text-sm">
                              {svc.preco_piso > 0 ? formatCurrency(svc.preco_piso) : '-'}
                            </TableCell>
                            <TableCell className={`text-right text-sm font-medium ${isBelowFloor ? 'text-destructive' : ''}`}>
                              {formatCurrency(svc.preco_medio_vendido)}
                            </TableCell>
                            <TableCell className="text-center text-sm">{svc.quantidade_vendas}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatCurrency(svc.total_vendido)}</TableCell>
                            <TableCell className="text-center">
                              {svc.vendas_abaixo_piso > 0 ? (
                                <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                                  {svc.vendas_abaixo_piso}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">0</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  svc.margem_media_pct >= 50 ? 'bg-green-100 text-green-700' :
                                  svc.margem_media_pct >= 20 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}
                              >
                                {svc.margem_media_pct.toFixed(1)}%
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
          )}

          {/* Below Floor Sales Audit */}
          {belowFloorSales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Vendas Abaixo do Piso (Auditoria)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicos</TableHead>
                        <TableHead className="text-right">Valor Venda</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Justificativa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {belowFloorSales.map((sale, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">
                            {new Date(sale.data).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{sale.cliente_nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {sale.service_nome || '-'}
                          </TableCell>
                          <TableCell className="text-right text-destructive font-medium">
                            {formatCurrency(sale.valor_venda)}
                          </TableCell>
                          <TableCell>{sale.forma_pagamento}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {sale.justificativa || 'Sem justificativa'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum dado disponivel.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
