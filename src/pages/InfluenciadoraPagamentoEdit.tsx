import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useInfluencerPaymentsMT } from "@/hooks/multitenant/useInfluencerPaymentsMT";
import { useInfluencerContractsMT } from "@/hooks/multitenant/useInfluencerContractsMT";
import { useInfluenciadorasAdapter } from "@/hooks/useInfluenciadorasAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type {
  MTPaymentCreate,
  MTPaymentType,
  MTPaymentStatus,
  MTPaymentMethod,
} from "@/hooks/multitenant/useInfluencerPaymentsMT";

const TIPOS_PAGAMENTO: { value: MTPaymentType; label: string }[] = [
  { value: "mensal", label: "Mensal - Pagamento fixo mensal" },
  { value: "post", label: "Post - Pagamento por conteúdo" },
  { value: "comissao", label: "Comissão - Pagamento por conversão" },
  { value: "bonus", label: "Bônus - Incentivo adicional" },
  { value: "ajuste", label: "Ajuste - Correção de valor" },
];

const STATUS_PAGAMENTO: { value: MTPaymentStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "pago", label: "Pago" },
  { value: "cancelado", label: "Cancelado" },
];

const METODOS_PAGAMENTO: { value: MTPaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "permuta", label: "Permuta (Crédito)" },
  { value: "dinheiro", label: "Dinheiro" },
];

export default function InfluenciadoraPagamentoEdit() {
  const { influenciadoraId, pagamentoId } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenantContext();
  const { payments, createPayment, updatePayment } = useInfluencerPaymentsMT({
    influencer_id: influenciadoraId,
  });
  const { contracts } = useInfluencerContractsMT({ influencer_id: influenciadoraId });
  const { influenciadoras } = useInfluenciadorasAdapter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<MTPaymentCreate>>({
    payment_type: "mensal",
    status: "pendente",
    currency: "BRL",
  });

  const isEditing = !!pagamentoId;
  const pagamento = isEditing ? payments?.find(p => p.id === pagamentoId) : null;
  const influenciadora = influenciadoras?.find(i => i.id === influenciadoraId);

  useEffect(() => {
    if (pagamento) {
      setFormData({
        payment_type: pagamento.payment_type,
        amount: pagamento.amount,
        currency: pagamento.currency,
        payment_method: pagamento.payment_method ?? undefined,
        contract_id: pagamento.contract_id ?? undefined,
        reference_period_start: pagamento.reference_period_start?.split('T')[0] || undefined,
        reference_period_end: pagamento.reference_period_end?.split('T')[0] || undefined,
        due_date: pagamento.due_date?.split('T')[0] || undefined,
        description: pagamento.description ?? undefined,
        status: pagamento.status,
      });
    }
  }, [pagamento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!influenciadoraId || !tenant) {
      toast.error("Dados incompletos");
      return;
    }

    if (!formData.payment_type || !formData.amount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      const paymentData: MTPaymentCreate = {
        influencer_id: influenciadoraId,
        payment_type: formData.payment_type!,
        amount: formData.amount!,
        currency: formData.currency || "BRL",
        payment_method: formData.payment_method ?? null,
        contract_id: formData.contract_id ?? null,
        reference_period_start: formData.reference_period_start ?? null,
        reference_period_end: formData.reference_period_end ?? null,
        due_date: formData.due_date ?? null,
        description: formData.description ?? null,
        status: formData.status ?? 'pendente',
      };

      if (isEditing && pagamentoId) {
        await updatePayment.mutateAsync({ id: pagamentoId, ...paymentData });
        toast.success("Pagamento atualizado!");
      } else {
        await createPayment.mutateAsync(paymentData);
        toast.success("Pagamento criado!");
      }

      navigate(`/influenciadoras/${influenciadoraId}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!influenciadora) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link to={`/influenciadoras/${influenciadoraId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para {influenciadora.nome_artistico || influenciadora.nome_completo}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar" : "Novo"} Pagamento</CardTitle>
            <CardDescription>
              {isEditing ? "Atualizar informações do" : "Registrar um novo"} pagamento para {influenciadora.nome_artistico || influenciadora.nome_completo}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="payment_type">Tipo de Pagamento *</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({ ...formData, payment_type: value as MTPaymentType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PAGAMENTO.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contrato */}
              <div className="space-y-2">
                <Label htmlFor="contract_id">Contrato (opcional)</Label>
                <Select
                  value={formData.contract_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, contract_id: value === "none" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem contrato vinculado</SelectItem>
                    {contracts?.map((contrato) => (
                      <SelectItem key={contrato.id} value={contrato.id}>
                        {contrato.tipo.charAt(0).toUpperCase() + contrato.tipo.slice(1)} - {contrato.franchise?.nome_fantasia || 'Global'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Período de Referência */}
              <div>
                <Label className="text-base mb-3 block">Período de Referência</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reference_period_start">Início</Label>
                    <Input
                      id="reference_period_start"
                      type="date"
                      value={formData.reference_period_start || ""}
                      onChange={(e) => setFormData({ ...formData, reference_period_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference_period_end">Fim</Label>
                    <Input
                      id="reference_period_end"
                      type="date"
                      value={formData.reference_period_end || ""}
                      onChange={(e) => setFormData({ ...formData, reference_period_end: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Data de Vencimento */}
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date || ""}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              {/* Método de Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pagamento</Label>
                <Select
                  value={formData.payment_method || "none"}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value === "none" ? undefined : value as MTPaymentMethod })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">A definir</SelectItem>
                    {METODOS_PAGAMENTO.map((metodo) => (
                      <SelectItem key={metodo.value} value={metodo.value}>
                        {metodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as MTPaymentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_PAGAMENTO.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes sobre o pagamento..."
                  rows={3}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? "Atualizar" : "Criar"} Pagamento
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/influenciadoras/${influenciadoraId}`)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
