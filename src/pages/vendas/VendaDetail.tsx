import { useNavigate, useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Trash2, User, CreditCard, FileText, ClipboardList, ChevronRight, CheckCircle, RotateCcw } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useVendaMT, useVendasMT } from '@/hooks/multitenant/useVendasMT';
import { supabase } from '@/integrations/supabase/client';
import {
  SALE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PRICE_TIER_LABELS,
} from '@/types/vendas';
import { TREATMENT_PLAN_STATUS_LABELS } from '@/types/treatment-plan';
import type { TreatmentPlanStatus } from '@/types/treatment-plan';
import type { SaleStatus } from '@/types/vendas';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const statusColor: Record<SaleStatus, string> = {
  orcamento: 'bg-gray-100 text-gray-700',
  aprovado: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};

export default function VendaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sale, items, isLoading } = useVendaMT(id);
  const { deleteSale, updateSale } = useVendasMT();

  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Treatment plans for this sale
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  useEffect(() => {
    if (!id) return;
    supabase
      .from('mt_treatment_plans')
      .select('id, cliente_nome, total_sessoes, sessoes_concluidas, status, service:mt_services(nome)')
      .eq('sale_id', id)
      .is('deleted_at', null)
      .order('created_at')
      .then(({ data }) => {
        if (data) setTreatmentPlans(data);
      });
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteSale(id, motivoCancelamento || undefined);
      navigate('/vendas');
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleConcluir = async () => {
    if (!id) return;
    try {
      await updateSale({ id, status: 'concluido' });
      window.location.reload();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <Card>
          <CardContent className="p-8">
            <div className="h-64 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
          <span>/</span>
          <span>Nao encontrada</span>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Venda nao encontrada.</p>
            <Button className="mt-4" onClick={() => navigate('/vendas')}>
              Voltar para Vendas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const margem = sale.valor_total - (sale.custo_total || 0);
  const margemPercent = sale.valor_total > 0 ? (margem / sale.valor_total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <span>{sale.numero_venda || sale.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Venda {sale.numero_venda || `#${sale.id.slice(0, 8)}`}
            </h1>
            <Badge variant="secondary" className={statusColor[sale.status]}>
              {SALE_STATUS_LABELS[sale.status]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {sale.status !== 'cancelado' && (
            <>
              {sale.status === 'orcamento' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir Venda
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Concluir venda?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acao ira marcar a venda como concluida. O orcamento sera convertido em venda efetivada.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConcluir} className="bg-green-600 hover:bg-green-700">
                        Sim, concluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {sale.status !== 'concluido' && (
                <Button variant="outline" onClick={() => navigate(`/vendas/${id}/editar`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <AlertDialog onOpenChange={(open) => { if (!open) setMotivoCancelamento(''); }}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    {sale.status === 'concluido' ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Cancelar / Reembolso
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancelar Venda
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {sale.status === 'concluido' ? 'Cancelar venda concluida?' : 'Cancelar venda?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {sale.status === 'concluido'
                        ? 'Esta venda ja foi concluida. O cancelamento ira marcar como cancelada e cancelar os planos de tratamento vinculados. Essa operacao nao pode ser desfeita.'
                        : 'Esta acao ira cancelar a venda. Essa operacao nao pode ser desfeita.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-2">
                    <Label htmlFor="motivo" className="text-sm font-medium">
                      Motivo do cancelamento {sale.status === 'concluido' && <span className="text-destructive">*</span>}
                    </Label>
                    <Textarea
                      id="motivo"
                      placeholder="Ex: Cliente solicitou reembolso, desistencia, erro no cadastro..."
                      value={motivoCancelamento}
                      onChange={(e) => setMotivoCancelamento(e.target.value)}
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Nao</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={sale.status === 'concluido' && !motivoCancelamento.trim()}
                    >
                      Sim, cancelar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Nome</dt>
                  <dd className="font-medium">{sale.cliente_nome}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Telefone</dt>
                  <dd className="font-medium">{sale.cliente_telefone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Responsavel pela Venda</dt>
                  <dd className="font-medium">
                    {sale.profissional?.nome || sale.profissional_id || 'Nao atribuido'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Data</dt>
                  <dd className="font-medium">{formatDate(sale.created_at)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Items table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Itens da Venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum item registrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preco Unit.</TableHead>
                      <TableHead className="text-center">Desc. %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.preco_unitario)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.desconto_percentual > 0 ? `${item.desconto_percentual}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.valor_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Treatment Plans */}
          {treatmentPlans.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Planos de Tratamento
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/vendas/tratamentos">Ver Todos</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {treatmentPlans.map((plan) => {
                  const progresso = plan.total_sessoes > 0
                    ? (plan.sessoes_concluidas / plan.total_sessoes) * 100
                    : 0;
                  const statusColors: Record<string, string> = {
                    pendente: 'bg-yellow-100 text-yellow-800',
                    ativo: 'bg-green-100 text-green-800',
                    pausado: 'bg-orange-100 text-orange-800',
                    concluido: 'bg-blue-100 text-blue-800',
                    cancelado: 'bg-red-100 text-red-800',
                  };
                  return (
                    <Link
                      key={plan.id}
                      to={`/vendas/tratamentos/${plan.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{plan.service?.nome || 'Servico'}</span>
                          <Badge className={statusColors[plan.status] || ''}>
                            {TREATMENT_PLAN_STATUS_LABELS[plan.status as TreatmentPlanStatus] || plan.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={progresso} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {plan.sessoes_concluidas}/{plan.total_sessoes} ({progresso.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Cancellation reason */}
          {sale.status === 'cancelado' && sale.motivo_cancelamento && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <RotateCcw className="h-4 w-4" />
                  Motivo do Cancelamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-red-700">{sale.motivo_cancelamento}</p>
                {sale.data_cancelamento && (
                  <p className="text-xs text-red-500 mt-2">
                    Cancelado em {formatDate(sale.data_cancelamento)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observations */}
          {sale.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle>Observacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{sale.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(sale.valor_bruto)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Desconto</span>
                <span>- {formatCurrency(sale.valor_desconto)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(sale.valor_total)}</span>
              </div>
              {sale.parcelas > 1 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{sale.parcelas}x de</span>
                  <span>{formatCurrency(sale.valor_total / sale.parcelas)}</span>
                </div>
              )}

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forma Pgto</span>
                  <span>
                    {sale.forma_pagamento
                      ? PAYMENT_METHOD_LABELS[sale.forma_pagamento]
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tabela</span>
                  <span>{PRICE_TIER_LABELS[sale.tabela_preco]}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span>{formatCurrency(sale.custo_total || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margem</span>
                  <span className={margem >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(margem)} ({margemPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
