import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { usePatrimonioMT } from '@/hooks/multitenant/usePatrimonioMT';
import { useAssetCategoriesMT } from '@/hooks/multitenant/useAssetCategoriesMT';
import { generateDepreciationSchedule, formatBRL, isFullyDepreciated } from '@/lib/depreciation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { ASSET_STATUS_LABELS, DEPRECIATION_METHOD_LABELS } from '@/types/patrimonio';

type ReportView = 'depreciacao' | 'categoria' | 'status' | 'franquia';

export default function PatrimonioRelatorios() {
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { ativos, isLoading } = usePatrimonioMT();
  const { categories } = useAssetCategoriesMT();
  const [view, setView] = useState<ReportView>('depreciacao');

  // --- Report: Depreciação por Ativo ---
  const depReport = useMemo(() => {
    return ativos.map(a => {
      const schedule = generateDepreciationSchedule(a);
      const currentYear = new Date().getFullYear();
      const currentEntry = schedule.find(s => s.ano === currentYear);
      return {
        id: a.id,
        codigo: a.codigo,
        nome: a.nome,
        categoria: a.category?.nome || 'Sem Categoria',
        valor_aquisicao: a.valor_aquisicao,
        valor_residual: a.valor_residual,
        depreciacao_acumulada: a.depreciacao_acumulada,
        valor_contabil: a.valor_contabil,
        depreciacao_ano: currentEntry?.depreciacao_periodo || 0,
        metodo: DEPRECIATION_METHOD_LABELS[a.metodo_depreciacao],
        vida_util: a.vida_util_anos,
        fully_depreciated: isFullyDepreciated(a),
      };
    });
  }, [ativos]);

  // --- Report: Por Categoria ---
  const catReport = useMemo(() => {
    const map: Record<string, { nome: string; cor: string; quantidade: number; valor_aquisicao: number; valor_contabil: number; depreciacao: number }> = {};
    ativos.forEach(a => {
      const catName = a.category?.nome || 'Sem Categoria';
      const catCor = a.category?.cor || '#999';
      if (!map[catName]) map[catName] = { nome: catName, cor: catCor, quantidade: 0, valor_aquisicao: 0, valor_contabil: 0, depreciacao: 0 };
      map[catName].quantidade += 1;
      map[catName].valor_aquisicao += a.valor_aquisicao;
      map[catName].valor_contabil += a.valor_contabil;
      map[catName].depreciacao += a.depreciacao_acumulada;
    });
    return Object.values(map).sort((a, b) => b.valor_aquisicao - a.valor_aquisicao);
  }, [ativos]);

  // --- Report: Por Status ---
  const statusReport = useMemo(() => {
    const map: Record<string, { status: string; label: string; quantidade: number; valor: number }> = {};
    ativos.forEach(a => {
      if (!map[a.status]) map[a.status] = { status: a.status, label: ASSET_STATUS_LABELS[a.status], quantidade: 0, valor: 0 };
      map[a.status].quantidade += 1;
      map[a.status].valor += a.valor_aquisicao;
    });
    return Object.values(map);
  }, [ativos]);

  // --- Report: Por Franquia ---
  const franquiaReport = useMemo(() => {
    const map: Record<string, { nome: string; quantidade: number; valor_aquisicao: number; valor_contabil: number }> = {};
    ativos.forEach(a => {
      const fname = a.franchise?.nome_fantasia || 'Sem Franquia';
      if (!map[fname]) map[fname] = { nome: fname, quantidade: 0, valor_aquisicao: 0, valor_contabil: 0 };
      map[fname].quantidade += 1;
      map[fname].valor_aquisicao += a.valor_aquisicao;
      map[fname].valor_contabil += a.valor_contabil;
    });
    return Object.values(map).sort((a, b) => b.valor_aquisicao - a.valor_aquisicao);
  }, [ativos]);

  const PIE_COLORS = ['#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4', '#795548'];

  const totalAquisicao = ativos.reduce((s, a) => s + a.valor_aquisicao, 0);
  const totalContabil = ativos.reduce((s, a) => s + a.valor_contabil, 0);
  const totalDepreciacao = ativos.reduce((s, a) => s + a.depreciacao_acumulada, 0);

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/patrimonio')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Relatórios de Patrimônio</h1>
            <p className="text-muted-foreground">{ativos.length} ativos no sistema</p>
          </div>
        </div>
        <Select value={view} onValueChange={(v) => setView(v as ReportView)}>
          <SelectTrigger className="w-[220px]">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="depreciacao">Depreciação por Ativo</SelectItem>
            <SelectItem value="categoria">Valor por Categoria</SelectItem>
            <SelectItem value="status">Distribuição por Status</SelectItem>
            <SelectItem value="franquia">Valor por Franquia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valor Total Aquisição</p>
            <p className="text-xl font-bold">{formatBRL(totalAquisicao)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valor Contábil Atual</p>
            <p className="text-xl font-bold">{formatBRL(totalContabil)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Depreciação Acumulada Total</p>
            <p className="text-xl font-bold text-orange-600">{formatBRL(totalDepreciacao)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Report: Depreciação por Ativo */}
      {view === 'depreciacao' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Depreciação por Ativo</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Aquisição</TableHead>
                  <TableHead className="text-right">Dep. Acum.</TableHead>
                  <TableHead className="text-right">Valor Contábil</TableHead>
                  <TableHead className="text-right">Dep. Ano</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum ativo</TableCell>
                  </TableRow>
                ) : (
                  depReport.map(r => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patrimonio/${r.id}`)}>
                      <TableCell className="font-mono text-sm">{r.codigo}</TableCell>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell className="text-sm">{r.categoria}</TableCell>
                      <TableCell className="text-sm">{r.metodo}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(r.valor_aquisicao)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">{formatBRL(r.depreciacao_acumulada)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatBRL(r.valor_contabil)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(r.depreciacao_ano)}</TableCell>
                      <TableCell>
                        {r.fully_depreciated ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">100% Dep.</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Ativo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Report: Por Categoria */}
      {view === 'categoria' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Valor por Categoria</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={catReport}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Bar dataKey="valor_aquisicao" name="Aquisição" fill="#2196F3" />
                  <Bar dataKey="valor_contabil" name="Contábil" fill="#4CAF50" />
                  <Bar dataKey="depreciacao" name="Depreciação" fill="#FF9800" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor Aquisição</TableHead>
                    <TableHead className="text-right">Valor Contábil</TableHead>
                    <TableHead className="text-right">Depreciação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catReport.map(r => (
                    <TableRow key={r.nome}>
                      <TableCell><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: r.cor }} /></TableCell>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="text-right">{r.quantidade}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(r.valor_aquisicao)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(r.valor_contabil)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">{formatBRL(r.depreciacao)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report: Por Status */}
      {view === 'status' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusReport}
                    dataKey="quantidade"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ label, quantidade }) => `${label}: ${quantidade}`}
                  >
                    {statusReport.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${v} ativos`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Detalhamento</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusReport.map(r => (
                    <TableRow key={r.status}>
                      <TableCell>{r.label}</TableCell>
                      <TableCell className="text-right">{r.quantidade}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(r.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report: Por Franquia */}
      {view === 'franquia' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Valor por Franquia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={franquiaReport}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Bar dataKey="valor_aquisicao" name="Aquisição" fill="#2196F3" />
                  <Bar dataKey="valor_contabil" name="Contábil" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Franquia</TableHead>
                    <TableHead className="text-right">Qtd Ativos</TableHead>
                    <TableHead className="text-right">Valor Aquisição</TableHead>
                    <TableHead className="text-right">Valor Contábil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franquiaReport.map(r => (
                    <TableRow key={r.nome}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="text-right">{r.quantidade}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(r.valor_aquisicao)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(r.valor_contabil)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
