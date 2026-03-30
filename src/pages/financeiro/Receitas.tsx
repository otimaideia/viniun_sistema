import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, CheckCircle, Paperclip, RefreshCw, Play, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFinancialTransactionsMT, useFinancialCategoriesMT, useFinancialAccountsMT } from '@/hooks/multitenant/useFinanceiroMT';
import { useFinancialRecurringMT } from '@/hooks/multitenant/useFinanceiroRecurringMT';
import { TRANSACTION_STATUS_LABELS, RECURRING_FREQUENCY_LABELS } from '@/types/financeiro';
import { BaixaDialog } from '@/components/financeiro/BaixaDialog';
import type { TransactionStatus, FinancialTransactionFilters, FinancialTransaction } from '@/types/financeiro';
import type { BaixaOptions } from '@/components/financeiro/BaixaDialog';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const statusColors: Record<TransactionStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800',
  cancelado: 'bg-gray-100 text-gray-800',
  atrasado: 'bg-red-100 text-red-800',
};

export default function Receitas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'lancamentos';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Baixa dialog state
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [baixaDialogOpen, setBaixaDialogOpen] = useState(false);

  // Recorrentes state
  const [generating, setGenerating] = useState(false);

  const filters: FinancialTransactionFilters = useMemo(() => ({
    tipo: 'receita' as const,
    status: status !== 'all' ? (status as TransactionStatus) : undefined,
    category_id: categoryId !== 'all' ? categoryId : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    search: search || undefined,
  }), [status, categoryId, dateFrom, dateTo, search]);

  const { transactions, isLoading, deleteTransaction, payTransaction } = useFinancialTransactionsMT(filters);
  const { categories } = useFinancialCategoriesMT();
  const { accounts } = useFinancialAccountsMT();
  const {
    recurrings,
    isLoading: isLoadingRecurrings,
    generatePending,
    generateForMonth,
    updateRecurring,
    deleteRecurring,
  } = useFinancialRecurringMT();

  // Filtrar apenas recorrentes tipo receita
  const receitaRecurrings = useMemo(() => recurrings.filter(r => r.tipo === 'receita'), [recurrings]);
  const activeRecurringsCount = useMemo(() => receitaRecurrings.filter(r => r.is_active).length, [receitaRecurrings]);

  const receitaCategories = useMemo(() => categories.filter(c => c.tipo === 'receita'), [categories]);

  const totalReceitas = useMemo(() => {
    return transactions.reduce((s, t) => s + t.valor, 0);
  }, [transactions]);

  const totalMensalEstimado = useMemo(() => {
    return receitaRecurrings.filter(r => r.is_active).reduce((s, r) => s + r.valor, 0);
  }, [receitaRecurrings]);

  const handleBaixa = (tx: FinancialTransaction) => {
    setSelectedTransaction(tx);
    setBaixaDialogOpen(true);
  };

  const handleConfirmBaixa = async (options: BaixaOptions) => {
    if (!selectedTransaction) return;
    await payTransaction(selectedTransaction.id, options);
  };

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'lancamentos' ? {} : { tab: value });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try { await generatePending(); } finally { setGenerating(false); }
  };

  const handleGenerateMonth = async () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setGenerating(true);
    try { await generateForMonth(yearMonth); } finally { setGenerating(false); }
  };

  const handleToggleRecurring = async (id: string, isActive: boolean) => {
    await updateRecurring(id, { is_active: !isActive });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <span>Receitas</span>
          </div>
          <h1 className="text-2xl font-bold">Receitas</h1>
        </div>
        <div className="flex gap-2">
          {activeTab === 'recorrentes' && (
            <>
              <Button variant="outline" size="sm" onClick={handleGenerateMonth} disabled={generating}>
                <Calendar className="h-4 w-4 mr-2" />
                Gerar do Mês
              </Button>
              <Button variant="secondary" size="sm" onClick={handleGenerate} disabled={generating}>
                <Play className="h-4 w-4 mr-2" />
                {generating ? 'Gerando...' : 'Gerar Pendentes'}
              </Button>
              <Button onClick={() => navigate('/financeiro/recorrentes/novo?tipo=receita')}>
                <Plus className="h-4 w-4 mr-2" /> Nova Recorrente
              </Button>
            </>
          )}
          {activeTab === 'lancamentos' && (
            <Button onClick={() => navigate('/financeiro/lancamentos/novo?tipo=receita')}>
              <Plus className="h-4 w-4 mr-2" /> Nova Receita
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="recorrentes">
            Fixas/Recorrentes
            {activeRecurringsCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                {activeRecurringsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === ABA LANÇAMENTOS === */}
        <TabsContent value="lancamentos" className="space-y-4 mt-4">
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
                    {receitaCategories.map((c) => (
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
                <div className="p-8 text-center text-muted-foreground">Nenhuma receita encontrada</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Categoria</TableHead>
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
                          <div className="flex items-center gap-1.5">
                            {tx.recurring_id && (
                              <RefreshCw className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" title="Lançamento recorrente" />
                            )}
                            <div className="max-w-[250px] truncate">{tx.descricao}</div>
                            {tx.comprovante_url && (
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          {tx.parcela_atual && tx.parcela_total && (
                            <span className="text-xs text-muted-foreground">
                              Parcela {tx.parcela_atual}/{tx.parcela_total}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{tx.category?.nome || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(tx.valor)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[tx.status]}>
                            {TRANSACTION_STATUS_LABELS[tx.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {tx.status === 'pendente' && (
                              <Button variant="ghost" size="icon" title="Dar Baixa" onClick={() => handleBaixa(tx)}>
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
                                  <AlertDialogTitle>Cancelar receita?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta acao ira cancelar a receita "{tx.descricao}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTransaction(tx.id)}>Cancelar receita</AlertDialogAction>
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
                      <TableCell colSpan={3} className="font-medium">Total Receitas</TableCell>
                      <TableCell className="text-right">
                        <div className="text-green-600 font-bold">{formatCurrency(totalReceitas)}</div>
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ABA FIXAS/RECORRENTES === */}
        <TabsContent value="recorrentes" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoadingRecurrings ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : receitaRecurrings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma receita fixa/recorrente cadastrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Próximo Vencimento</TableHead>
                      <TableHead>Gerados</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receitaRecurrings.map(rec => (
                      <TableRow key={rec.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{rec.descricao}</span>
                            {rec.category && (
                              <span className="text-xs text-muted-foreground ml-2">({rec.category.nome})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(rec.valor)}
                        </TableCell>
                        <TableCell>{RECURRING_FREQUENCY_LABELS[rec.frequencia]}</TableCell>
                        <TableCell>
                          {new Date(rec.next_due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>{rec.total_gerados}</TableCell>
                        <TableCell>
                          <Switch checked={rec.is_active} onCheckedChange={() => handleToggleRecurring(rec.id, rec.is_active)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => navigate(`/financeiro/recorrentes/${rec.id}/editar`)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover recorrente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{rec.descricao}" não gerará mais lançamentos. Lançamentos pendentes serão cancelados. Lançamentos já recebidos não serão afetados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteRecurring(rec.id)}>Remover</AlertDialogAction>
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

          {receitaRecurrings.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Total mensal estimado:{' '}
              <span className="font-medium text-green-600">{formatCurrency(totalMensalEstimado)}</span>
              {' '}({receitaRecurrings.filter(r => r.is_active).length} receitas fixas ativas)
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Baixa Dialog */}
      {selectedTransaction && (
        <BaixaDialog
          transaction={selectedTransaction}
          open={baixaDialogOpen}
          onOpenChange={setBaixaDialogOpen}
          onConfirm={handleConfirmBaixa}
          accounts={accounts}
        />
      )}
    </div>
  );
}
