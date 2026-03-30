import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, DollarSign, Filter, Users, Pencil, X,
  TrendingUp, UserCheck, Target, Settings, Play, RefreshCw, Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCommissionsMT } from '@/hooks/multitenant/useVendasMT';
import { useCommissionAutomationMT } from '@/hooks/multitenant/useCommissionAutomationMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import {
  COMMISSION_STATUS_LABELS,
  COMMISSION_CATEGORY_LABELS,
  COMMISSION_ROLE_LABELS,
} from '@/types/vendas';
import type {
  CommissionStatus, CommissionCategory, Commission, MonthlyCommissionSummary,
} from '@/types/vendas';
import { toast } from 'sonner';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '-';

const statusColor: Record<CommissionStatus, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  aprovado: 'bg-blue-100 text-blue-700',
  pago: 'bg-green-100 text-green-700',
};

interface ProfissionalOption {
  id: string;
  nome: string;
}

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function Comissoes() {
  const [activeTab, setActiveTab] = useState<string>('resumo');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | undefined>(undefined);
  const [profissionalFilter, setProfissionalFilter] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Map tab to category filter
  const categoryMap: Record<string, CommissionCategory | undefined> = {
    resumo: undefined,
    comissao_global: 'comissao_global',
    comissao_individual: 'comissao_individual',
    produtividade: 'produtividade',
    comissao_gerente: 'comissao_gerente',
  };

  const {
    commissions, isLoading,
    updateCommission, approveCommission, payCommission,
    bulkApprove, bulkPay,
  } = useCommissionsMT({
    categoria: categoryMap[activeTab],
    status: statusFilter,
    profissional_id: profissionalFilter,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const { tenant, franchise } = useTenantContext();
  const { isProcessing, lastResult, processMonthlyCommissions, reprocessMonth, fetchBatch } = useCommissionAutomationMT();

  // Check if month was already processed
  const [batchExists, setBatchExists] = useState(false);
  useEffect(() => {
    if (franchise?.id && selectedMonth) {
      fetchBatch(franchise.id, selectedMonth).then((batch) => {
        setBatchExists(!!batch);
      });
    }
  }, [franchise?.id, selectedMonth, fetchBatch]);

  // Profissionais dropdown
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([]);
  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from('mt_users')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome')
      .then(({ data }) => {
        setProfissionais((data || []) as ProfissionalOption[]);
      });
  }, [tenant?.id]);

  // Confirmation dialog
  const [confirmAction, setConfirmAction] = useState<'process' | 'reprocess' | null>(null);

  // Process month
  const handleProcessMonth = async () => {
    if (!franchise?.id) {
      toast.error('Selecione uma franquia');
      return;
    }
    setConfirmAction('process');
  };

  const handleReprocessMonth = async () => {
    if (!franchise?.id) return;
    setConfirmAction('reprocess');
  };

  const confirmProcess = async () => {
    if (!franchise?.id) return;
    setConfirmAction(null);
    if (confirmAction === 'process') {
      await processMonthlyCommissions(franchise.id, selectedMonth);
      setBatchExists(true);
    } else if (confirmAction === 'reprocess') {
      await reprocessMonth(franchise.id, selectedMonth);
    }
  };

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (id: string, currentValue: number) => {
    setEditingId(id);
    setEditValue(String(currentValue));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const parsed = parseFloat(editValue);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Valor invalido');
      return;
    }
    try {
      await updateCommission(editingId, { valor: parsed });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === commissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(commissions.map((c) => c.id)));
    }
  };

  const selectedPendentes = commissions.filter(
    (c) => selectedIds.has(c.id) && c.status === 'pendente'
  );
  const selectedAprovados = commissions.filter(
    (c) => selectedIds.has(c.id) && c.status === 'aprovado'
  );

  const handleBulkApprove = async () => {
    const ids = selectedPendentes.map((c) => c.id);
    if (ids.length === 0) return;
    await bulkApprove(ids);
    setSelectedIds(new Set());
  };

  const handleBulkPay = async () => {
    const ids = selectedAprovados.map((c) => c.id);
    if (ids.length === 0) return;
    await bulkPay(ids);
    setSelectedIds(new Set());
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  // Summary
  const totalPendente = commissions.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valor, 0);
  const totalAprovado = commissions.filter((c) => c.status === 'aprovado').reduce((s, c) => s + c.valor, 0);
  const totalPago = commissions.filter((c) => c.status === 'pago').reduce((s, c) => s + c.valor, 0);

  const getProfName = (id: string) =>
    profissionais.find(p => p.id === id)?.nome || id.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <span>Comissoes e Produtividade</span>
          </div>
          <h1 className="text-2xl font-bold">Comissoes e Produtividade</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/vendas/comissoes/configuracao">
              <Settings className="h-4 w-4 mr-2" />
              Configuracao
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/vendas">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      {/* Month selector + Process button */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mes de Referencia</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              {!batchExists ? (
                <Button
                  onClick={handleProcessMonth}
                  disabled={isProcessing || !franchise?.id}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processando...' : 'Processar Mes'}
                </Button>
              ) : (
                <>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 py-1">
                    <Check className="h-3 w-3 mr-1" />
                    Mes Processado
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReprocessMonth}
                    disabled={isProcessing}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Reprocessando...' : 'Reprocessar'}
                  </Button>
                </>
              )}
            </div>
            {!franchise?.id && (
              <p className="text-xs text-destructive pt-5">
                Selecione uma franquia para processar comissoes
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last result summary */}
      {lastResult && (
        <ProcessingSummary result={lastResult} />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumo" className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Resumo</span>
          </TabsTrigger>
          <TabsTrigger value="comissao_global" className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Global</span>
          </TabsTrigger>
          <TabsTrigger value="comissao_individual" className="flex items-center gap-1">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Individual</span>
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Produtividade</span>
          </TabsTrigger>
          <TabsTrigger value="comissao_gerente" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Gerente</span>
          </TabsTrigger>
        </TabsList>

        {/* Resumo tab */}
        <TabsContent value="resumo" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Users className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPendente)}</div>
                <p className="text-xs text-muted-foreground">
                  {commissions.filter((c) => c.status === 'pendente').length} registros
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
                <Check className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAprovado)}</div>
                <p className="text-xs text-muted-foreground">
                  {commissions.filter((c) => c.status === 'aprovado').length} registros
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagas</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
                <p className="text-xs text-muted-foreground">
                  {commissions.filter((c) => c.status === 'pago').length} registros
                </p>
              </CardContent>
            </Card>
          </div>

          {/* All commissions table */}
          <div className="mt-4">
            <FiltersCard
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              profissionalFilter={profissionalFilter}
              setProfissionalFilter={setProfissionalFilter}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              profissionais={profissionais}
            />
          </div>

          {/* Bulk actions */}
          <BulkActions
            selectedIds={selectedIds}
            selectedPendentes={selectedPendentes}
            selectedAprovados={selectedAprovados}
            handleBulkApprove={handleBulkApprove}
            handleBulkPay={handleBulkPay}
            clearSelection={() => setSelectedIds(new Set())}
          />

          <CommissionTable
            commissions={commissions}
            isLoading={isLoading}
            showCategory
            selectedIds={selectedIds}
            editingId={editingId}
            editValue={editValue}
            getProfName={getProfName}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            startEdit={startEdit}
            saveEdit={saveEdit}
            cancelEdit={cancelEdit}
            setEditValue={setEditValue}
            approveCommission={approveCommission}
            payCommission={payCommission}
          />
        </TabsContent>

        {/* Category tabs */}
        {['comissao_global', 'comissao_individual', 'produtividade', 'comissao_gerente'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <FiltersCard
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              profissionalFilter={profissionalFilter}
              setProfissionalFilter={setProfissionalFilter}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              profissionais={profissionais}
            />

            <BulkActions
              selectedIds={selectedIds}
              selectedPendentes={selectedPendentes}
              selectedAprovados={selectedAprovados}
              handleBulkApprove={handleBulkApprove}
              handleBulkPay={handleBulkPay}
              clearSelection={() => setSelectedIds(new Set())}
            />

            <CommissionTable
              commissions={commissions}
              isLoading={isLoading}
              showCategory={false}
              selectedIds={selectedIds}
              editingId={editingId}
              editValue={editValue}
              getProfName={getProfName}
              toggleSelect={toggleSelect}
              toggleSelectAll={toggleSelectAll}
              startEdit={startEdit}
              saveEdit={saveEdit}
              cancelEdit={cancelEdit}
              setEditValue={setEditValue}
              approveCommission={approveCommission}
              payCommission={payCommission}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'process' ? 'Processar Comissoes' : 'Reprocessar Comissoes'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {confirmAction === 'process' ? (
                  <p>Isso ira calcular e gerar todas as comissoes do mes <strong>{selectedMonth}</strong> para a franquia <strong>{franchise?.nome}</strong>.</p>
                ) : (
                  <p>Isso ira <strong>excluir</strong> todas as comissoes pendentes/aprovadas do mes <strong>{selectedMonth}</strong> e recalcular do zero. Comissoes ja pagas bloqueiam o reprocessamento.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  As comissoes serao geradas com status "pendente" e precisam ser aprovadas manualmente.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProcess}>
              {confirmAction === 'process' ? 'Processar' : 'Reprocessar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Processing Summary
// =============================================================================

function ProcessingSummary({ result }: { result: MonthlyCommissionSummary }) {
  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          Resultado do Processamento - {result.batch.referencia}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-lg font-bold">{formatCurrency(result.faturamento)}</p>
            <p className="text-xs">
              Meta: {formatCurrency(result.meta_global)}
              {result.meta_atingida ? (
                <Badge variant="secondary" className="ml-1 bg-green-100 text-green-700 text-xs">Atingida</Badge>
              ) : (
                <Badge variant="secondary" className="ml-1 bg-red-100 text-red-700 text-xs">Nao atingida</Badge>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pool Global</p>
            <p className="text-lg font-bold">{formatCurrency(result.pool_global)}</p>
            {result.tier && (
              <p className="text-xs">Tier: {result.tier.percentual}%</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Comissoes</p>
            <p className="text-lg font-bold">{formatCurrency(result.total_comissoes)}</p>
            <p className="text-xs">{result.batch.qtd_comissoes} registros gerados</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Distribuicao</p>
            <div className="space-y-1 mt-1">
              {result.supervisoras.map((s) => (
                <p key={s.user_id} className="text-xs">
                  <Badge variant="secondary" className="text-xs mr-1">Sup</Badge>
                  {s.nome}: {formatCurrency(s.valor)}
                </p>
              ))}
              {result.consultoras.map((c) => (
                <p key={c.user_id} className="text-xs">
                  <Badge variant="secondary" className="text-xs mr-1">Con</Badge>
                  {c.nome}: G {formatCurrency(c.valor_global)}
                  {c.valor_individual > 0 && ` + I ${formatCurrency(c.valor_individual)}`}
                  {!c.meta_batida && <span className="text-red-500 ml-1">(meta nao batida)</span>}
                </p>
              ))}
              {result.gerentes.map((g) => (
                <p key={g.user_id} className="text-xs">
                  <Badge variant="secondary" className="text-xs mr-1">Ger</Badge>
                  {g.nome}: {formatCurrency(g.valor)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Filters Card
// =============================================================================

function FiltersCard({
  statusFilter, setStatusFilter,
  profissionalFilter, setProfissionalFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  profissionais,
}: {
  statusFilter: CommissionStatus | undefined;
  setStatusFilter: (v: CommissionStatus | undefined) => void;
  profissionalFilter: string | undefined;
  setProfissionalFilter: (v: string | undefined) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  profissionais: ProfissionalOption[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : (v as CommissionStatus))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(COMMISSION_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Profissional</label>
            <Select
              value={profissionalFilter || 'all'}
              onValueChange={(v) => setProfissionalFilter(v === 'all' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profissionais.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data inicio</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Data fim</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Bulk Actions
// =============================================================================

function BulkActions({
  selectedIds, selectedPendentes, selectedAprovados,
  handleBulkApprove, handleBulkPay, clearSelection,
}: {
  selectedIds: Set<string>;
  selectedPendentes: Commission[];
  selectedAprovados: Commission[];
  handleBulkApprove: () => void;
  handleBulkPay: () => void;
  clearSelection: () => void;
}) {
  if (selectedIds.size === 0) return null;
  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mt-4">
      <span className="text-sm font-medium">{selectedIds.size} selecionada(s)</span>
      {selectedPendentes.length > 0 && (
        <Button variant="outline" size="sm" onClick={handleBulkApprove}>
          <Check className="h-3 w-3 mr-1" />
          Aprovar {selectedPendentes.length}
        </Button>
      )}
      {selectedAprovados.length > 0 && (
        <Button variant="outline" size="sm" onClick={handleBulkPay}>
          <DollarSign className="h-3 w-3 mr-1" />
          Pagar {selectedAprovados.length}
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={clearSelection}>
        Limpar selecao
      </Button>
    </div>
  );
}

// =============================================================================
// Commission Table
// =============================================================================

function CommissionTable({
  commissions,
  isLoading,
  showCategory,
  selectedIds,
  editingId,
  editValue,
  getProfName,
  toggleSelect,
  toggleSelectAll,
  startEdit,
  saveEdit,
  cancelEdit,
  setEditValue,
  approveCommission,
  payCommission,
}: {
  commissions: Commission[];
  isLoading: boolean;
  showCategory: boolean;
  selectedIds: Set<string>;
  editingId: string | null;
  editValue: string;
  getProfName: (id: string) => string;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  startEdit: (id: string, val: number) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  setEditValue: (v: string) => void;
  approveCommission: (id: string) => void;
  payCommission: (id: string) => void;
}) {
  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma comissao encontrada. Use "Processar Mes" para gerar comissoes automaticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === commissions.length && commissions.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Profissional</TableHead>
                  {showCategory && <TableHead>Categoria</TableHead>}
                  <TableHead>Papel</TableHead>
                  <TableHead className="text-center">Ref. Mes</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((comm) => (
                  <TableRow key={comm.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(comm.id)}
                        onCheckedChange={() => toggleSelect(comm.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {comm.profissional?.nome || getProfName(comm.profissional_id)}
                    </TableCell>
                    {showCategory && (
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {COMMISSION_CATEGORY_LABELS[comm.categoria as CommissionCategory] || comm.categoria}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      {comm.commission_role ? (
                        <Badge variant="outline" className="text-xs">
                          {COMMISSION_ROLE_LABELS[comm.commission_role as keyof typeof COMMISSION_ROLE_LABELS] || comm.commission_role}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {comm.referencia_mes || '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {comm.valor_base_calculo > 0 ? formatCurrency(comm.valor_base_calculo) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {comm.percentual != null ? `${comm.percentual}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {editingId === comm.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-28 h-7 text-right text-sm"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:underline inline-flex items-center gap-1 group"
                          onClick={() => startEdit(comm.id, comm.valor)}
                          title="Clique para editar"
                        >
                          {formatCurrency(comm.valor)}
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={statusColor[comm.status]}>
                        {COMMISSION_STATUS_LABELS[comm.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {comm.status === 'pendente' && (
                          <Button variant="outline" size="sm" onClick={() => approveCommission(comm.id)}>
                            <Check className="h-3 w-3 mr-1" />
                            Aprovar
                          </Button>
                        )}
                        {comm.status === 'aprovado' && (
                          <Button variant="outline" size="sm" onClick={() => payCommission(comm.id)}>
                            <DollarSign className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        )}
                        {comm.status === 'pago' && (
                          <span className="text-xs text-muted-foreground px-2">
                            Pago em {formatDate(comm.data_pagamento)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
