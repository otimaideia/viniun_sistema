import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, CheckCircle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFinancialTransactionsMT, useFinancialCategoriesMT } from '@/hooks/multitenant/useFinanceiroMT';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from '@/types/financeiro';
import type { TransactionType, TransactionStatus, FinancialTransactionFilters } from '@/types/financeiro';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const statusColors: Record<TransactionStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-800',
  atrasado: 'bg-red-100 text-red-800',
};

const tipoColors: Record<TransactionType, string> = {
  receita: 'bg-green-100 text-green-800',
  despesa: 'bg-red-100 text-red-800',
};

export default function Lancamentos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters: FinancialTransactionFilters = useMemo(() => ({
    tipo: tipo !== 'all' ? (tipo as TransactionType) : undefined,
    status: status !== 'all' ? (status as TransactionStatus) : undefined,
    category_id: categoryId !== 'all' ? categoryId : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: search || undefined,
  }), [tipo, status, categoryId, dateFrom, dateTo, search]);

  const { transactions, isLoading, deleteTransaction, payTransaction } = useFinancialTransactionsMT(filters);
  const { categories } = useFinancialCategoriesMT();

  const totals = useMemo(() => {
    const receitas = transactions.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const despesas = transactions.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Lancamentos</span>
          </div>
          <h1 className="text-2xl font-bold">Lancamentos</h1>
        </div>
        <Button onClick={() => navigate('/financeiro/lancamentos/novo')}>
          <Plus className="h-4 w-4 mr-2" /> Novo Lancamento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar descricao..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" placeholder="De" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" placeholder="Ate" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum lancamento encontrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(tx.data_competencia + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px] truncate">{tx.descricao}</div>
                      {tx.parcela_atual && tx.parcela_total && (
                        <span className="text-xs text-muted-foreground">
                          Parcela {tx.parcela_atual}/{tx.parcela_total}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{tx.category?.nome || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={tipoColors[tx.tipo]}>
                        {TRANSACTION_TYPE_LABELS[tx.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.tipo === 'despesa' ? '-' : ''}{formatCurrency(tx.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[tx.status]}>
                        {TRANSACTION_STATUS_LABELS[tx.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {tx.status === 'pendente' && (
                          <Button variant="ghost" size="icon" title="Marcar como pago" onClick={() => payTransaction(tx.id)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/financeiro/lancamentos/${tx.id}/editar`)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar lancamento?</AlertDialogTitle>
                              <AlertDialogDescription>Esta acao ira cancelar o lancamento "{tx.descricao}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTransaction(tx.id)}>Cancelar lancamento</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-medium">Totais</TableCell>
                  <TableCell className="text-right">
                    <div className="text-green-600 font-medium">{formatCurrency(totals.receitas)}</div>
                    <div className="text-red-600 font-medium">-{formatCurrency(totals.despesas)}</div>
                    <div className={`font-bold ${totals.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      = {formatCurrency(totals.saldo)}
                    </div>
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
