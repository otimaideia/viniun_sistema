import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFinancialRecurringMT, calcularOcorrencias } from "@/hooks/multitenant/useFinanceiroRecurringMT";
import { useFinancialCategoriesMT, useFinancialAccountsMT } from "@/hooks/multitenant/useFinanceiroMT";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Info } from "lucide-react";
import type { FinancialRecurringCreate, TransactionType, RecurringFrequency } from "@/types/financeiro";
import { RECURRING_FREQUENCY_LABELS } from "@/types/financeiro";
import { toast } from "sonner";

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function RecorrenteEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;

  // Pré-selecionar tipo via query param
  const tipoParam = searchParams.get('tipo') as TransactionType | null;

  const { recurrings, createRecurring, updateRecurring } = useFinancialRecurringMT();
  const { categories } = useFinancialCategoriesMT();
  const { accounts } = useFinancialAccountsMT();

  const [tipo, setTipo] = useState<TransactionType>(tipoParam || 'despesa');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [frequencia, setFrequencia] = useState<RecurringFrequency>('mensal');
  const [diaVencimento, setDiaVencimento] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && recurrings.length) {
      const rec = recurrings.find(r => r.id === id);
      if (rec) {
        setTipo(rec.tipo);
        setDescricao(rec.descricao);
        setValor(String(rec.valor));
        setCategoryId(rec.category_id || '');
        setAccountId(rec.account_id || '');
        setFrequencia(rec.frequencia);
        setDiaVencimento(rec.dia_vencimento ? String(rec.dia_vencimento) : '');
        setDataInicio(rec.data_inicio);
        setDataFim(rec.data_fim || '');
        setFormaPagamento(rec.forma_pagamento || '');
        setObservacoes(rec.observacoes || '');
      }
    }
  }, [isEditing, id, recurrings]);

  const filteredCategories = categories.filter(c => c.tipo === tipo);

  // Preview: calcular quantas ocorrências serão geradas
  const preview = useMemo(() => {
    if (!dataInicio || !valor) return null;

    const ocorrencias = calcularOcorrencias(dataInicio, dataFim || undefined, frequencia);
    const valorNum = parseFloat(valor) || 0;
    const totalGeral = valorNum * ocorrencias;

    // Calcular data fim efetiva
    const dataFimEfetiva = dataFim || (() => {
      const d = new Date(dataInicio + 'T00:00:00');
      d.setFullYear(d.getFullYear() + 1);
      return d.toLocaleDateString('pt-BR');
    })();

    const dataFimFormatada = dataFim
      ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')
      : dataFimEfetiva;

    return { ocorrencias, totalGeral, dataFimFormatada };
  }, [dataInicio, dataFim, frequencia, valor]);

  // Navegar de volta conforme tipo
  const handleVoltar = () => {
    const tab = tipo === 'receita' ? '/financeiro/receitas?tab=recorrentes' : '/financeiro/despesas?tab=recorrentes';
    navigate(tab);
  };

  const handleSave = async () => {
    if (!descricao || !valor) {
      toast.error('Preencha descrição e valor');
      return;
    }

    setSaving(true);
    try {
      const dia = diaVencimento ? parseInt(diaVencimento) : new Date(dataInicio).getDate();
      const nextDueDate = dataInicio;

      // Se não informou data_fim, default = 12 meses
      const dataFimFinal = dataFim || (() => {
        const d = new Date(dataInicio + 'T00:00:00');
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
      })();

      const data: FinancialRecurringCreate = {
        tipo,
        descricao,
        valor: parseFloat(valor),
        category_id: categoryId || undefined,
        account_id: accountId || undefined,
        frequencia,
        dia_vencimento: dia,
        data_inicio: dataInicio,
        data_fim: dataFimFinal,
        next_due_date: nextDueDate,
        forma_pagamento: formaPagamento || undefined,
        observacoes: observacoes || undefined,
      };

      if (isEditing) {
        await updateRecurring(id!, data);
      } else {
        await createRecurring(data);
      }
      handleVoltar();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleVoltar}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar' : 'Nova'} {tipo === 'receita' ? 'Receita' : 'Despesa'} Recorrente
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            <Button
              variant={tipo === 'receita' ? 'default' : 'outline'}
              className={tipo === 'receita' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => setTipo('receita')}
            >
              Receita
            </Button>
            <Button
              variant={tipo === 'despesa' ? 'default' : 'outline'}
              className={tipo === 'despesa' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => setTipo('despesa')}
            >
              Despesa
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel, Salário Maria..." />
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequencia} onValueChange={v => setFrequencia(v as RecurringFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRING_FREQUENCY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dia do Vencimento</Label>
              <Input type="number" min="1" max="31" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.codigo ? `${c.codigo} - ` : ''}{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim (opcional)</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              <p className="text-xs text-muted-foreground">Deixe vazio para gerar 12 meses automaticamente</p>
            </div>
          </div>

          {/* Preview de geração */}
          {!isEditing && preview && preview.ocorrencias > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">
                  Serão gerados {preview.ocorrencias} lançamentos de {formatCurrency(parseFloat(valor) || 0)} até {preview.dataFimFormatada}
                </p>
                <p className="text-blue-700 mt-1">
                  Total: {formatCurrency(preview.totalGeral)} ({RECURRING_FREQUENCY_LABELS[frequencia].toLowerCase()})
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleVoltar}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar e Gerar Lançamentos'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
