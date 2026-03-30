import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, Trash2, Eye, ArrowDownCircle, ArrowUpCircle, Landmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBankStatementsMT } from '@/hooks/multitenant/useBankStatementsMT';
import { useFinancialAccountsMT } from '@/hooks/multitenant/useFinanceiroMT';
import {
  BANK_STATEMENT_STATUS_LABELS,
  BANK_STATEMENT_STATUS_COLORS,
  BANK_FILE_FORMAT_LABELS,
} from '@/types/conciliacao';
import type { BankStatementStatus, BankStatementFilters } from '@/types/conciliacao';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function ConciliacaoIndex() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BankStatementFilters>({});
  const { statements, isLoading, deleteStatement } = useBankStatementsMT(filters);
  const { accounts } = useFinancialAccountsMT();

  const bankAccounts = accounts.filter(a => a.tipo === 'banco');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Conciliação Bancária</span>
          </div>
          <h1 className="text-2xl font-bold">Conciliação Bancária</h1>
          <p className="text-muted-foreground mt-1">Importe extratos do banco e concilie com seus lançamentos</p>
        </div>
        <Button onClick={() => navigate('/financeiro/conciliacao/importar')}>
          <Upload className="h-4 w-4 mr-2" /> Importar Extrato
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Extratos</p>
                <p className="text-xl font-bold">{statements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(statements.reduce((s, st) => s + st.total_entradas, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Saídas</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(statements.reduce((s, st) => s + st.total_saidas, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conciliados</p>
                <p className="text-xl font-bold">
                  {statements.filter(s => s.status === 'conciliado').length} / {statements.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={filters.account_id || 'all'}
          onValueChange={v => setFilters(prev => ({ ...prev, account_id: v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {bankAccounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.nome} {a.banco && `(${a.banco})`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={v => setFilters(prev => ({ ...prev, status: v === 'all' ? undefined : v as BankStatementStatus }))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(BANK_STATEMENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card><CardContent className="p-8"><div className="h-40 bg-muted animate-pulse rounded" /></CardContent></Card>
      ) : statements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum extrato importado</h3>
            <p className="text-muted-foreground mb-4">Importe um extrato do Santander em formato OFX ou Excel para começar a conciliação.</p>
            <Button onClick={() => navigate('/financeiro/conciliacao/importar')}>
              <Upload className="h-4 w-4 mr-2" /> Importar Extrato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Import</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statements.map((stmt) => {
                const total = stmt.total_entries || 1;
                const resolved = stmt.entries_matched + stmt.entries_created + (total - stmt.entries_matched - stmt.entries_created - stmt.entries_unmatched);
                const progress = Math.round((resolved / total) * 100);

                return (
                  <TableRow key={stmt.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/financeiro/conciliacao/${stmt.id}`)}>
                    <TableCell className="text-sm">
                      {new Date(stmt.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{stmt.account?.nome || '-'}</div>
                      {stmt.account?.banco && (
                        <div className="text-xs text-muted-foreground">{stmt.account.banco}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(stmt.periodo_inicio)} - {formatDate(stmt.periodo_fim)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {BANK_FILE_FORMAT_LABELS[stmt.file_format] || stmt.file_format}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(stmt.total_entradas)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {formatCurrency(stmt.total_saidas)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-20 h-2" />
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={BANK_STATEMENT_STATUS_COLORS[stmt.status]}>
                        {BANK_STATEMENT_STATUS_LABELS[stmt.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/financeiro/conciliacao/${stmt.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {stmt.status !== 'conciliado' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover extrato?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá remover o extrato "{stmt.file_name}" e todos os vínculos de conciliação.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteStatement(stmt.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
