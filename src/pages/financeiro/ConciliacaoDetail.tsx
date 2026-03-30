import { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wand2, CheckCircle, XCircle, Link2, Unlink, Plus, Eye, EyeOff,
  ArrowDownCircle, ArrowUpCircle, FileSpreadsheet, AlertCircle, Search, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useBankStatementMT } from '@/hooks/multitenant/useBankStatementMT';
import { useFinancialTransactionsMT, useFinancialCategoriesMT } from '@/hooks/multitenant/useFinanceiroMT';
import { useTenantContext } from '@/contexts/TenantContext';
import {
  BANK_STATEMENT_STATUS_LABELS,
  BANK_STATEMENT_STATUS_COLORS,
  ENTRY_MATCH_STATUS_LABELS,
  ENTRY_MATCH_STATUS_COLORS,
} from '@/types/conciliacao';
import type { BankStatementEntry, EntryMatchStatus } from '@/types/conciliacao';
import type { FinancialTransaction } from '@/types/financeiro';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function ConciliacaoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { franchise } = useTenantContext();

  const {
    statement, entries, summary, isLoading, error,
    matchEntry, unmatchEntry, ignoreEntry, createTransactionFromEntry,
    runAutoMatch, finalizeReconciliation,
  } = useBankStatementMT(id);

  const { categories } = useFinancialCategoriesMT();
  const { transactions } = useFinancialTransactionsMT(
    statement ? {
      date_from: statement.periodo_inicio ? (() => { const d = new Date(statement.periodo_inicio!); d.setDate(d.getDate() - 5); return d.toISOString().split('T')[0]; })() : undefined,
      date_to: statement.periodo_fim ? (() => { const d = new Date(statement.periodo_fim!); d.setDate(d.getDate() + 5); return d.toISOString().split('T')[0]; })() : undefined,
    } : undefined
  );

  const [activeTab, setActiveTab] = useState('todos');
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [searchTx, setSearchTx] = useState('');

  // Manual match dialog
  const [matchDialogEntry, setMatchDialogEntry] = useState<BankStatementEntry | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string>('');

  // Create transaction dialog
  const [createDialogEntry, setCreateDialogEntry] = useState<BankStatementEntry | null>(null);
  const [createForm, setCreateForm] = useState({ descricao: '', category_id: '', forma_pagamento: '' });

  // Finalize confirmation
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

  // Filter entries by tab
  const filteredEntries = entries.filter(e => {
    switch (activeTab) {
      case 'pendentes': return e.match_status === 'pendente';
      case 'conciliados': return ['auto_matched', 'manual_matched'].includes(e.match_status);
      case 'criados': return e.match_status === 'created';
      case 'ignorados': return e.match_status === 'ignored';
      default: return true;
    }
  });

  // Auto-match handler
  const handleAutoMatch = async () => {
    setIsAutoMatching(true);
    try {
      await runAutoMatch();
    } catch (err) {
      toast.error('Erro ao executar conciliação automática');
    } finally {
      setIsAutoMatching(false);
    }
  };

  // Manual match handler
  const handleManualMatch = async () => {
    if (!matchDialogEntry || !selectedTxId) return;
    try {
      await matchEntry(matchDialogEntry.id, selectedTxId, 0.90, 'manual_matched');
      toast.success('Lançamento vinculado');
      setMatchDialogEntry(null);
      setSelectedTxId('');
    } catch {
      toast.error('Erro ao vincular');
    }
  };

  // Create transaction handler
  const handleCreateTransaction = async () => {
    if (!createDialogEntry || !createForm.descricao) return;
    try {
      await createTransactionFromEntry(createDialogEntry.id, {
        descricao: createForm.descricao,
        category_id: createForm.category_id || undefined,
        franchise_id: franchise?.id || null,
        forma_pagamento: createForm.forma_pagamento || undefined,
      });
      setCreateDialogEntry(null);
      setCreateForm({ descricao: '', category_id: '', forma_pagamento: '' });
    } catch {
      toast.error('Erro ao criar lançamento');
    }
  };

  // Open create dialog with pre-filled data
  const openCreateDialog = (entry: BankStatementEntry) => {
    setCreateDialogEntry(entry);
    setCreateForm({
      descricao: entry.descricao_banco,
      category_id: '',
      forma_pagamento: '',
    });
  };

  // Finalize handler
  const handleFinalize = async () => {
    try {
      await finalizeReconciliation();
      setShowFinalizeDialog(false);
    } catch {
      toast.error('Erro ao finalizar');
    }
  };

  // Get unmatched transactions for manual match
  const getAvailableTransactions = useCallback((entry: BankStatementEntry) => {
    const matchedTxIds = new Set(entries.filter(e => e.transaction_id).map(e => e.transaction_id));
    const entryTypeFilter = entry.tipo === 'entrada' ? 'receita' : 'despesa';

    return transactions
      .filter(tx =>
        tx.tipo === entryTypeFilter &&
        !matchedTxIds.has(tx.id) &&
        tx.status !== 'cancelado' &&
        (!searchTx || tx.descricao.toLowerCase().includes(searchTx.toLowerCase()))
      )
      .sort((a, b) => {
        // Sort by value similarity then date proximity
        const aDiff = Math.abs(a.valor - entry.valor);
        const bDiff = Math.abs(b.valor - entry.valor);
        return aDiff - bDiff;
      })
      .slice(0, 20);
  }, [transactions, entries, searchTx]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold">Extrato não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/financeiro/conciliacao')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const total = summary.total || 1;
  const resolvedCount = summary.matched + summary.created + summary.ignored;
  const progressPercent = Math.round((resolvedCount / total) * 100);
  const canFinalize = summary.pending === 0 && summary.suggestions === 0 && summary.total > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/financeiro" className="hover:text-foreground">Financeiro</Link>
            <span>/</span>
            <Link to="/financeiro/conciliacao" className="hover:text-foreground">Conciliação</Link>
            <span>/</span>
            <span>{statement.file_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {statement.account?.nome || 'Conciliação'}
            </h1>
            <Badge className={BANK_STATEMENT_STATUS_COLORS[statement.status]}>
              {BANK_STATEMENT_STATUS_LABELS[statement.status]}
            </Badge>
          </div>
          {statement.account?.banco && (
            <p className="text-sm text-muted-foreground mt-1">
              {statement.account.banco}
              {statement.account.agencia && ` | Ag: ${statement.account.agencia}`}
              {statement.account.conta && ` | Cc: ${statement.account.conta}`}
              {' | '}Período: {formatDate(statement.periodo_inicio)} a {formatDate(statement.periodo_fim)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {statement.status !== 'conciliado' && (
            <>
              <Button variant="outline" onClick={handleAutoMatch} disabled={isAutoMatching || summary.pending === 0}>
                {isAutoMatching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Conciliar Automaticamente
              </Button>
              <Button onClick={() => setShowFinalizeDialog(true)} disabled={!canFinalize}>
                <CheckCircle className="h-4 w-4 mr-2" /> Finalizar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso</span>
              <span className="text-sm text-muted-foreground">{resolvedCount}/{total}</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">{progressPercent}% concluído</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ArrowDownCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="font-bold text-green-600">{formatCurrency(statement.total_entradas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ArrowUpCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground">Saídas</p>
            <p className="font-bold text-red-600">{formatCurrency(statement.total_saidas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Link2 className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xs text-muted-foreground">Conciliados</p>
            <p className="font-bold">{summary.matched}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="font-bold">{summary.pending + summary.suggestions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({summary.total})</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes ({summary.pending + summary.suggestions})</TabsTrigger>
          <TabsTrigger value="conciliados">Conciliados ({summary.matched})</TabsTrigger>
          <TabsTrigger value="criados">Criados ({summary.created})</TabsTrigger>
          <TabsTrigger value="ignorados">Ignorados ({summary.ignored})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Data</TableHead>
                  <TableHead>Descrição do Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lançamento Vinculado</TableHead>
                  <TableHead>Confiança</TableHead>
                  {statement.status !== 'conciliado' && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento nesta categoria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">{formatDate(entry.data_transacao)}</TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate" title={entry.descricao_banco}>
                        {entry.descricao_banco}
                        {entry.memo && <p className="text-xs text-muted-foreground truncate">{entry.memo}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.tipo === 'entrada' ? 'default' : 'destructive'} className="text-xs">
                          {entry.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${entry.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.tipo === 'saida' ? '-' : ''}{formatCurrency(entry.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge className={ENTRY_MATCH_STATUS_COLORS[entry.match_status]}>
                          {ENTRY_MATCH_STATUS_LABELS[entry.match_status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.transaction ? (
                          <div className="max-w-[200px]">
                            <p className="truncate font-medium">{entry.transaction.descricao}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.transaction.data_competencia)} | {formatCurrency(entry.transaction.valor)}
                            </p>
                          </div>
                        ) : entry.match_confidence && entry.match_confidence > 0 ? (
                          <span className="text-xs text-yellow-600">Sugestão disponível</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {entry.match_confidence ? (
                          <div className="flex items-center gap-2">
                            <Progress value={entry.match_confidence * 100} className="w-14 h-2" />
                            <span className="text-xs text-muted-foreground">{Math.round(entry.match_confidence * 100)}%</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      {statement.status !== 'conciliado' && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {entry.match_status === 'pendente' && (
                              <>
                                {/* Accept suggestion if available */}
                                {entry.transaction_id && entry.match_confidence && entry.match_confidence > 0 && (
                                  <Button
                                    variant="ghost" size="icon"
                                    title="Aceitar sugestão"
                                    onClick={() => matchEntry(entry.id, entry.transaction_id!, entry.match_confidence!, 'manual_matched')}
                                  >
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" title="Vincular manualmente" onClick={() => { setMatchDialogEntry(entry); setSearchTx(''); setSelectedTxId(''); }}>
                                  <Link2 className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Criar lançamento" onClick={() => openCreateDialog(entry)}>
                                  <Plus className="h-4 w-4 text-purple-500" />
                                </Button>
                                <Button variant="ghost" size="icon" title="Ignorar" onClick={() => ignoreEntry(entry.id)}>
                                  <EyeOff className="h-4 w-4 text-orange-500" />
                                </Button>
                              </>
                            )}
                            {['auto_matched', 'manual_matched', 'created'].includes(entry.match_status) && (
                              <Button variant="ghost" size="icon" title="Desvincular" onClick={() => unmatchEntry(entry.id)}>
                                <Unlink className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                            {entry.match_status === 'ignored' && (
                              <Button variant="ghost" size="icon" title="Restaurar" onClick={() => unmatchEntry(entry.id)}>
                                <Eye className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Manual Match Dialog */}
      <Dialog open={!!matchDialogEntry} onOpenChange={open => !open && setMatchDialogEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular Lançamento</DialogTitle>
          </DialogHeader>
          {matchDialogEntry && (
            <div className="space-y-4">
              {/* Entry info */}
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{matchDialogEntry.descricao_banco}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(matchDialogEntry.data_transacao)}</p>
                    </div>
                    <p className={`text-lg font-bold ${matchDialogEntry.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {matchDialogEntry.tipo === 'saida' ? '-' : ''}{formatCurrency(matchDialogEntry.valor)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lançamento..."
                  value={searchTx}
                  onChange={e => setSearchTx(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Transaction list */}
              <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const availableTxs = getAvailableTransactions(matchDialogEntry);
                      if (availableTxs.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                              Nenhum lançamento compatível encontrado
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return availableTxs.map(tx => (
                        <TableRow
                          key={tx.id}
                          className={`cursor-pointer ${selectedTxId === tx.id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                          onClick={() => setSelectedTxId(tx.id)}
                        >
                          <TableCell>
                            <input type="radio" checked={selectedTxId === tx.id} readOnly className="accent-primary" />
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(tx.data_competencia)}</TableCell>
                          <TableCell className="text-sm">{tx.descricao}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(tx.valor)}</TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogEntry(null)}>Cancelar</Button>
            <Button onClick={handleManualMatch} disabled={!selectedTxId}>
              <Link2 className="h-4 w-4 mr-2" /> Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Transaction Dialog */}
      <Dialog open={!!createDialogEntry} onOpenChange={open => !open && setCreateDialogEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Lançamento</DialogTitle>
          </DialogHeader>
          {createDialogEntry && (
            <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm">
                  <p><strong>Data:</strong> {formatDate(createDialogEntry.data_transacao)}</p>
                  <p><strong>Tipo:</strong> {createDialogEntry.tipo === 'entrada' ? 'Receita' : 'Despesa'}</p>
                  <p><strong>Valor:</strong> {formatCurrency(createDialogEntry.valor)}</p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div>
                  <Label>Descrição *</Label>
                  <Input
                    value={createForm.descricao}
                    onChange={e => setCreateForm(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição do lançamento"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={createForm.category_id} onValueChange={v => setCreateForm(prev => ({ ...prev, category_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(c => c.tipo === (createDialogEntry.tipo === 'entrada' ? 'receita' : 'despesa'))
                        .map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.codigo ? `${c.codigo} - ` : ''}{c.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={createForm.forma_pagamento} onValueChange={v => setCreateForm(prev => ({ ...prev, forma_pagamento: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogEntry(null)}>Cancelar</Button>
            <Button onClick={handleCreateTransaction} disabled={!createForm.descricao}>
              <Plus className="h-4 w-4 mr-2" /> Criar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Conciliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os {summary.total} lançamentos foram resolvidos ({summary.matched} conciliados, {summary.created} criados, {summary.ignored} ignorados).
              Deseja marcar este extrato como conciliado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>
              <CheckCircle className="h-4 w-4 mr-2" /> Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
