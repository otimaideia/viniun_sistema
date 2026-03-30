import { Link, useNavigate } from 'react-router-dom';
import { Upload, Target, Trash2, Eye, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useProjectionsMT } from '@/hooks/multitenant/useProjectionsMT';

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

export default function ProjecaoIndex() {
  const navigate = useNavigate();
  const { projections, isLoading, deleteProjection } = useProjectionsMT();

  const totalInvestimento = projections.reduce((s, p) => s + (p.investimento_inicial || 0), 0);
  const avgTIR = projections.length > 0
    ? projections.reduce((s, p) => s + (p.tir_projetada || 0), 0) / projections.length
    : 0;
  const avgROI = projections.length > 0
    ? projections.reduce((s, p) => s + (p.roi_projetado || 0), 0) / projections.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Projeção Financeira</span>
          </div>
          <h1 className="text-2xl font-bold">Projeção Financeira</h1>
          <p className="text-muted-foreground mt-1">Planos de negócio importados — compare projeção vs realidade linha a linha</p>
        </div>
        <Button onClick={() => navigate('/financeiro/projecao/importar')}>
          <Upload className="h-4 w-4 mr-2" /> Importar Plano de Negócio
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Planos Importados</p>
                <p className="text-xl font-bold">{projections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Investimento Total</p>
                <p className="text-xl font-bold">{formatCurrency(totalInvestimento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">TIR Média</p>
                <p className="text-xl font-bold">{formatPercent(avgTIR)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">ROI Médio</p>
                <p className="text-xl font-bold">{avgROI > 0 ? `${avgROI.toFixed(1)}x` : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando projeções...</div>
          ) : projections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Target className="h-12 w-12 opacity-30" />
              <p>Nenhum plano de negócio importado</p>
              <Button variant="outline" onClick={() => navigate('/financeiro/projecao/importar')}>
                <Upload className="h-4 w-4 mr-2" /> Importar Plano
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Franquia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-center">PayBack</TableHead>
                  <TableHead className="text-center">TIR</TableHead>
                  <TableHead className="text-center">ROI</TableHead>
                  <TableHead className="text-center">Meses</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projections.map((proj) => (
                  <TableRow key={proj.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/financeiro/projecao/${proj.id}`)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{proj.nome}</p>
                        {proj.file_name && <p className="text-xs text-muted-foreground">{proj.file_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {proj.franchise ? (
                        <Badge variant="outline">{proj.franchise.nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Todas</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(proj.data_inicio)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(proj.investimento_inicial)}</TableCell>
                    <TableCell className="text-center">
                      {proj.payback_mes ? (
                        <Badge variant="secondary">Mês {proj.payback_mes}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center font-mono">{formatPercent(proj.tir_projetada)}</TableCell>
                    <TableCell className="text-center font-mono">{proj.roi_projetado ? `${proj.roi_projetado.toFixed(1)}x` : '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{proj.total_meses}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/financeiro/projecao/${proj.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir projeção?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Isso removerá o plano "{proj.nome}" e todas as suas linhas. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProjection(proj.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
