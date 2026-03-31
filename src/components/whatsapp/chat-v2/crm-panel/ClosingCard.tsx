import { useState, useMemo, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  ExternalLink,
  User,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useLeadsMT } from "@/hooks/useLeadsMT";
import { useVendasMT } from "@/hooks/multitenant/useVendasMT";
import type { MTLead } from "@/types/lead-mt";
import type { PaymentMethod, SaleItemCreate, SalePaymentCreate, PaymentForm, PaymentPlanType, CardBrand } from "@/types/vendas";
import {
  PAYMENT_FORM_LABELS,
  PAYMENT_PLAN_LABELS,
  CARD_BRAND_LABELS,
} from "@/types/vendas";
import {
  useWhatsAppLabelsMT,
  useConversationLabelsMT,
} from "@/hooks/multitenant/useWhatsAppLabelsMT";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ClosingCardProps {
  leadId: string;
  lead?: MTLead | null;
  conversationId?: string | null;
  phone?: string;
  contactName?: string;
  onSaleCompleted?: () => void;
  /** Callback com serviceId e nome quando venda tem sessões recorrentes → abre agenda pré-preenchida */
  onSaleWithSchedule?: (serviceId: string, serviceName: string) => void;
}

type Mode = "idle" | "won" | "lost";

interface ConversaoServico {
  servico_id: string;
  servico_nome: string;
  valor: number;
  forma_pagamento: string;
  parcelas: number;
  tipo?: "servico" | "produto" | "pacote";
  pacote_id?: string;
}

interface ServiceItem {
  id: string;
  nome: string;
  categoria?: string | null;
  preco: number;
  preco_tabela_maior?: number | null;
  preco_tabela_menor?: number | null;
  custo_insumos?: number | null;
  custo_pix?: number | null;
  sessoes_protocolo?: number | null;
  tipo?: string;
}

interface PackageItem {
  id: string;
  nome: string;
  preco_pacote: number;
  preco_original: number | null;
  desconto_percentual: number | null;
}

interface SaleItemRow {
  key: string;
  tipo: "servico" | "produto" | "pacote";
  item_id: string;
  nome: string;
  preco_unitario: number;
  custo_unitario: number;
  quantidade: number;
  sessoes_protocolo: number;
  preco_minimo: number;
  desconto: number;
  desconto_tipo: "percent" | "fixed";
  valor_total: number;
}

interface PaymentEntry {
  key: string;
  forma: PaymentForm | "";
  tipo: PaymentPlanType;
  bandeira: CardBrand | "";
  parcelas: number;
  valor: number;
}

type PopoverTab = "servicos" | "pacotes";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const MOTIVOS_PERDA = [
  "Preco alto",
  "Escolheu concorrente",
  "Nao respondeu",
  "Sem interesse",
  "Sem condicoes financeiras",
  "Mudou de cidade",
  "Ja realizou o procedimento",
  "Outro",
];

const PARCELAS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateBR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function needsCard(forma: string): boolean {
  return forma === "credito" || forma === "debito";
}

function needsParcelas(forma: string): boolean {
  return forma === "credito";
}

function emptyPayment(): PaymentEntry {
  return {
    key: crypto.randomUUID(),
    forma: "",
    tipo: "a_vista",
    bandeira: "",
    parcelas: 1,
    valor: 0,
  };
}

function emptySaleItem(): SaleItemRow {
  return {
    key: crypto.randomUUID(),
    tipo: "servico",
    item_id: "",
    nome: "",
    preco_unitario: 0,
    custo_unitario: 0,
    quantidade: 1,
    sessoes_protocolo: 1,
    preco_minimo: 0,
    desconto: 0,
    desconto_tipo: "percent",
    valor_total: 0,
  };
}

function calcItemTotal(item: SaleItemRow): SaleItemRow {
  const subtotal = item.quantidade * item.preco_unitario;
  if (item.desconto_tipo === "fixed") {
    const maxFixed = item.preco_minimo > 0
      ? round2((item.preco_unitario - item.preco_minimo) * item.quantidade)
      : subtotal;
    const clamped = round2(Math.min(item.desconto, maxFixed));
    return { ...item, desconto: clamped, valor_total: round2(Math.max(0, subtotal - clamped)) };
  } else {
    const maxPct = item.preco_minimo > 0 && item.preco_unitario > 0
      ? Math.floor(((item.preco_unitario - item.preco_minimo) / item.preco_unitario) * 10000) / 100
      : 100;
    const clamped = round2(item.preco_minimo > 0 ? Math.min(item.desconto, maxPct) : item.desconto);
    const descontoValor = subtotal * (clamped / 100);
    return { ...item, desconto: clamped, valor_total: round2(Math.max(0, subtotal - descontoValor)) };
  }
}

function getItemDiscountValue(item: SaleItemRow): number {
  const subtotal = item.quantidade * item.preco_unitario;
  if (item.desconto_tipo === "fixed") return Math.min(item.desconto, subtotal);
  return subtotal * (item.desconto / 100);
}

function mapFormaToPM(forma: PaymentForm): PaymentMethod {
  const map: Record<PaymentForm, PaymentMethod> = {
    credito: "cartao_credito",
    debito: "cartao_debito",
    pix: "pix",
    dinheiro: "dinheiro",
    boleto: "boleto",
  };
  return map[forma] || "pix";
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ClosingCard({ leadId, lead, conversationId, phone, contactName, onSaleCompleted, onSaleWithSchedule }: ClosingCardProps) {
  const { tenant, franchise } = useTenantContext();
  const { updateLead } = useLeadsMT();
  const { createSale } = useVendasMT();
  const queryClient = useQueryClient();

  const { labels: allLabels } = useWhatsAppLabelsMT();
  const { addLabel } = useConversationLabelsMT(conversationId || undefined);

  const [mode, setMode] = useState<Mode>("idle");

  // Won form state
  const [saleItems, setSaleItems] = useState<SaleItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([emptyPayment()]);
  const [servicePopoverOpen, setServicePopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [popoverTab, setPopoverTab] = useState<PopoverTab>("servicos");
  const [profissionalId, setProfissionalId] = useState("");
  const [isSavingSale, setIsSavingSale] = useState(false);

  // Lost form state
  const [lostReason, setLostReason] = useState("");
  const [lostCustomReason, setLostCustomReason] = useState("");
  const [lostCompetitor, setLostCompetitor] = useState("");

  // Auto-distribute total to first payment when items change
  const total = useMemo(
    () => saleItems.reduce((sum, s) => sum + (s.valor_total || 0), 0),
    [saleItems]
  );

  useEffect(() => {
    if (payments.length === 1 && payments[0].forma === "") {
      setPayments(prev => [{ ...prev[0], valor: total }]);
    }
  }, [total, payments]);

  // Load profissionais
  const { data: profissionais = [] } = useQuery({
    queryKey: ["mt-users-profissionais", tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_users")
        .select("id, nome")
        .eq("tenant_id", tenant!.id)
        .eq("is_active", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as Array<{ id: string; nome: string }>;
    },
    enabled: !!tenant && mode === "won",
    staleTime: 1000 * 60 * 5,
  });

  // Load available services
  const { data: availableServices = [] } = useQuery({
    queryKey: ["mt-services-closing", tenant?.id],
    queryFn: async (): Promise<ServiceItem[]> => {
      let q = supabase
        .from("mt_services")
        .select("id, nome, categoria, preco, preco_tabela_maior, preco_tabela_menor, custo_insumos, custo_pix, sessoes_protocolo, tipo")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("nome");

      if (tenant) q = q.eq("tenant_id", tenant.id);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ServiceItem[];
    },
    enabled: !!tenant && mode === "won",
    staleTime: 1000 * 60 * 5,
  });

  // Load available packages
  const { data: availablePackages = [] } = useQuery({
    queryKey: ["mt-packages-closing", tenant?.id],
    queryFn: async (): Promise<PackageItem[]> => {
      const hoje = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("mt_packages")
        .select("id, nome, preco_pacote, preco_original, desconto_percentual, data_inicio, data_fim")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("nome");

      if (tenant) q = q.eq("tenant_id", tenant.id);

      const { data, error } = await q;
      if (error) {
        if ((error as any).code === "42P01") return [];
        throw error;
      }

      return (data || []).filter((p: any) => {
        if (p.data_inicio && p.data_inicio > hoje) return false;
        if (p.data_fim && p.data_fim < hoje) return false;
        return true;
      }) as PackageItem[];
    },
    enabled: !!tenant && mode === "won",
    staleTime: 1000 * 60 * 5,
  });

  // Filter services excluding already added
  const filteredServices = useMemo(() => {
    const addedIds = new Set(saleItems.filter(s => s.tipo !== "pacote").map(s => s.item_id));
    let list = availableServices.filter(s => !addedIds.has(s.id));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s => s.nome.toLowerCase().includes(term) || (s.categoria && s.categoria.toLowerCase().includes(term)));
    }
    return list;
  }, [availableServices, saleItems, searchTerm]);

  // Filter packages excluding already added
  const filteredPackages = useMemo(() => {
    const addedIds = new Set(saleItems.filter(s => s.tipo === "pacote").map(s => s.item_id));
    let list = availablePackages.filter(p => !addedIds.has(p.id));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => p.nome.toLowerCase().includes(term));
    }
    return list;
  }, [availablePackages, saleItems, searchTerm]);

  // Total pagamentos
  const totalPagamentos = useMemo(() => payments.reduce((sum, p) => sum + (p.valor || 0), 0), [payments]);
  const diferencaPagamentos = round2(total - totalPagamentos);

  // ---------------------------------------------------------------------------
  // Previously saved conversion data
  // ---------------------------------------------------------------------------

  const savedConversaoServicos: ConversaoServico[] = useMemo(() => {
    if (!lead?.dados_extras) return [];
    const extras = lead.dados_extras as Record<string, unknown>;
    const raw = extras.conversao_servicos;
    if (Array.isArray(raw)) return raw as ConversaoServico[];
    return [];
  }, [lead?.dados_extras]);

  const savedSaleId = useMemo(() => {
    if (!lead?.dados_extras) return null;
    const extras = lead.dados_extras as Record<string, unknown>;
    return (extras.sale_id as string) || null;
  }, [lead?.dados_extras]);

  const savedNumeroVenda = useMemo(() => {
    if (!lead?.dados_extras) return null;
    const extras = lead.dados_extras as Record<string, unknown>;
    return (extras.numero_venda as string) || null;
  }, [lead?.dados_extras]);

  // ---------------------------------------------------------------------------
  // Already converted
  // ---------------------------------------------------------------------------

  if (lead?.convertido && mode === "idle") {
    const savedTotal =
      lead.valor_conversao ??
      savedConversaoServicos.reduce((s, i) => s + (i.valor || 0), 0);

    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Convertido!</span>
            {savedTotal > 0 && (
              <span className="ml-auto text-sm font-bold text-emerald-700">
                {formatCurrency(savedTotal)}
              </span>
            )}
          </div>

          {lead.data_conversao && (
            <p className="text-xs text-emerald-500">em {formatDateBR(lead.data_conversao)}</p>
          )}

          {savedSaleId && (
            <Link
              to={`/vendas/${savedSaleId}`}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 underline transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Ver venda {savedNumeroVenda || ""}
            </Link>
          )}

          {savedConversaoServicos.length > 0 && (
            <>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {savedConversaoServicos.length} servico{savedConversaoServicos.length > 1 ? "s" : ""} contratado{savedConversaoServicos.length > 1 ? "s" : ""}
              </button>

              {showDetails && (
                <div className="space-y-1.5 pt-1">
                  {savedConversaoServicos.map((s) => (
                    <div key={s.servico_id} className="flex items-center justify-between text-xs bg-emerald-100/50 rounded px-2 py-1.5">
                      <span className="font-medium text-emerald-800">{s.servico_nome}</span>
                      <span className="font-medium text-emerald-700">{formatCurrency(s.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Botão para registrar nova venda mesmo já convertido */}
        <button
          type="button"
          className="w-full rounded-lg border border-emerald-300 bg-white py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
          onClick={() => setMode("won")}
        >
          <Plus className="inline h-3.5 w-3.5 mr-1" />
          Nova Venda
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Already lost
  // ---------------------------------------------------------------------------

  if (lead?.status === "perdido") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-700">Perdido</span>
        </div>
        {lead.motivo_perda && <p className="mt-1 text-sm text-red-600">{lead.motivo_perda}</p>}
        {lead.concorrente && <p className="mt-0.5 text-xs text-red-500">Concorrente: {lead.concorrente}</p>}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Item handlers
  // ---------------------------------------------------------------------------

  const handleAddService = (service: ServiceItem) => {
    const preco = service.preco_tabela_maior ?? service.preco ?? 0;
    const custo = service.custo_insumos && service.custo_insumos > 0 ? service.custo_insumos : (service.custo_pix ?? 0);

    const newItem = calcItemTotal({
      ...emptySaleItem(),
      tipo: (service.tipo === "produto" ? "produto" : "servico") as "servico" | "produto",
      item_id: service.id,
      nome: service.nome,
      preco_unitario: preco,
      custo_unitario: custo,
      sessoes_protocolo: service.sessoes_protocolo || 1,
      preco_minimo: service.preco_tabela_menor ?? 0,
    });

    setSaleItems(prev => [...prev, newItem]);
    setServicePopoverOpen(false);
    setSearchTerm("");
  };

  const handleAddPackage = (pkg: PackageItem) => {
    const newItem = calcItemTotal({
      ...emptySaleItem(),
      tipo: "pacote",
      item_id: pkg.id,
      nome: pkg.nome,
      preco_unitario: pkg.preco_pacote || 0,
      custo_unitario: 0,
      preco_minimo: 0,
      sessoes_protocolo: 0,
    });

    setSaleItems(prev => [...prev, newItem]);
    setServicePopoverOpen(false);
    setSearchTerm("");
  };

  const handleRemoveItem = (key: string) => {
    setSaleItems(prev => prev.filter(s => s.key !== key));
  };

  const handleUpdateItem = (key: string, field: keyof SaleItemRow, value: string | number) => {
    setSaleItems(prev =>
      prev.map(item => {
        if (item.key !== key) return item;
        const updated = { ...item, [field]: value };
        return calcItemTotal(updated);
      })
    );
  };

  // ---------------------------------------------------------------------------
  // Payment handlers
  // ---------------------------------------------------------------------------

  const handlePaymentChange = (key: string, field: keyof PaymentEntry, value: string | number) => {
    setPayments(prev =>
      prev.map(p => {
        if (p.key !== key) return p;
        const updated = { ...p, [field]: value };
        if (field === "forma" && !needsCard(value as string)) {
          updated.bandeira = "";
        }
        if (field === "forma" && !needsParcelas(value as string)) {
          updated.parcelas = 1;
        }
        return updated;
      })
    );
  };

  const addPayment = () => setPayments(prev => [...prev, emptyPayment()]);

  const removePayment = (key: string) => {
    if (payments.length <= 1) return;
    setPayments(prev => prev.filter(p => p.key !== key));
  };

  // ---------------------------------------------------------------------------
  // Save handlers
  // ---------------------------------------------------------------------------

  const handleSaveWon = async () => {
    if (isSavingSale || saleItems.length === 0) return;

    const validPayments = payments.filter(p => p.forma);
    if (validPayments.length === 0) {
      toast.error("Selecione pelo menos uma forma de pagamento");
      return;
    }

    if (Math.abs(diferencaPagamentos) > 0.01) {
      toast.error(`Pagamentos não batem com o total. Diferença: ${formatCurrency(diferencaPagamentos)}`);
      return;
    }

    setIsSavingSale(true);
    try {
      // 1. Map items
      const items: SaleItemCreate[] = saleItems.map(s => ({
        tipo_item: s.tipo,
        service_id: s.tipo !== "pacote" ? s.item_id : undefined,
        package_id: s.tipo === "pacote" ? s.item_id : undefined,
        descricao: s.nome,
        quantidade: s.quantidade,
        preco_unitario: s.preco_unitario,
        custo_unitario: s.custo_unitario,
        desconto_percentual: s.desconto_tipo === "percent" ? s.desconto : (s.preco_unitario > 0 ? (getItemDiscountValue(s) / (s.quantidade * s.preco_unitario)) * 100 : 0),
        desconto_valor: getItemDiscountValue(s),
        valor_total: s.valor_total,
        sessoes_protocolo: s.sessoes_protocolo || 0,
      }));

      // 2. Map payments
      const salePayments: SalePaymentCreate[] = validPayments.map(p => ({
        forma: p.forma as PaymentForm,
        tipo: p.tipo,
        bandeira: needsCard(p.forma) && p.bandeira ? p.bandeira as CardBrand : undefined,
        parcelas: p.parcelas,
        valor: p.valor,
      }));

      // 3. Determine legacy payment method
      const legacyFormaPagamento: PaymentMethod =
        validPayments.length === 1
          ? mapFormaToPM(validPayments[0].forma as PaymentForm)
          : "misto";

      const valorBruto = saleItems.reduce((sum, i) => sum + i.quantidade * i.preco_unitario, 0);
      const valorDesconto = saleItems.reduce((sum, i) => sum + getItemDiscountValue(i), 0);
      const custoTotal = saleItems.reduce((sum, i) => sum + i.quantidade * i.custo_unitario, 0);

      const hasItemsWithSessions = saleItems.some(i => i.tipo !== "produto" && i.sessoes_protocolo > 1);

      // 4. Create sale
      const sale = await createSale({
        franchise_id: (lead as any)?.franchise_id || franchise?.id || "",
        lead_id: leadId,
        cliente_nome: lead?.nome || contactName || "",
        cliente_telefone: lead?.telefone || lead?.whatsapp || phone || "",
        cliente_email: lead?.email || undefined,
        profissional_id: profissionalId || undefined,
        forma_pagamento: legacyFormaPagamento,
        tabela_preco: "normal",
        parcelas: validPayments[0]?.parcelas || 1,
        valor_bruto: valorBruto,
        valor_desconto: valorDesconto,
        valor_total: total,
        custo_total: custoTotal,
        status: "concluido",
        canal_origem: "whatsapp",
        conversation_id: conversationId || undefined,
        observacoes: "Venda registrada via WhatsApp CRM",
        items,
        payments: salePayments,
        _recurrenceConfig: hasItemsWithSessions ? {
          recorrencia_tipo: "mensal",
          recorrencia_intervalo_dias: 30,
          geracao_agenda: "manual",
        } : undefined,
      });

      // 5. Update lead
      const currentExtras =
        typeof lead?.dados_extras === "object" && lead?.dados_extras !== null
          ? { ...lead.dados_extras }
          : {};

      (currentExtras as Record<string, unknown>).conversao_servicos = saleItems.map(s => ({
        servico_id: s.item_id,
        servico_nome: s.nome,
        valor: s.valor_total,
        forma_pagamento: validPayments[0]?.forma || "pix",
        parcelas: validPayments[0]?.parcelas || 1,
        tipo: s.tipo,
        ...(s.tipo === "pacote" && { pacote_id: s.item_id }),
      }));

      (currentExtras as Record<string, unknown>).sale_id = sale.id;
      (currentExtras as Record<string, unknown>).numero_venda = sale.numero_venda;

      updateLead.mutate(
        {
          id: leadId,
          convertido: true,
          data_conversao: new Date().toISOString(),
          valor_conversao: total > 0 ? total : null,
          status: "convertido" as any,
          servico_interesse: saleItems.map(s => s.nome).join(", ") || undefined,
          dados_extras: currentExtras,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mt-leads", "detail", leadId] });
            if (conversationId) {
              const pagoLabel = allLabels.find(l => l.name.toLowerCase() === "pago");
              if (pagoLabel) addLabel.mutate(pagoLabel.id);
            }
          },
        }
      );

      // Se venda tem itens com sessões recorrentes, redirecionar para aba Agenda com serviço pré-preenchido
      if (hasItemsWithSessions) {
        const sessionItem = saleItems.find(i => i.tipo !== "produto" && i.sessoes_protocolo > 1);
        if (sessionItem && onSaleWithSchedule) {
          toast.success("Venda registrada! Agende a primeira sessao.", { duration: 4000 });
          setTimeout(() => onSaleWithSchedule(sessionItem.item_id, sessionItem.nome), 500);
        } else if (onSaleCompleted) {
          toast.success("Venda registrada! Agende a primeira sessao.", { duration: 4000 });
          setTimeout(() => onSaleCompleted(), 500);
        }
      }

      setMode("idle");
      setSaleItems([]);
      setPayments([emptyPayment()]);
      setProfissionalId("");
    } catch (err) {
      console.error("Erro ao criar venda:", err);
      toast.error("Erro ao registrar venda. Tente novamente.");
    } finally {
      setIsSavingSale(false);
    }
  };

  const handleSaveLost = () => {
    const reason = lostReason === "Outro" ? lostCustomReason : lostReason;
    updateLead.mutate({
      id: leadId,
      motivo_perda: reason || null,
      concorrente: lostCompetitor || null,
      status: "perdido" as any,
    });
    setMode("idle");
    setLostReason("");
    setLostCustomReason("");
    setLostCompetitor("");
  };

  const handleCancel = () => {
    setMode("idle");
    setSaleItems([]);
    setPayments([emptyPayment()]);
    setLostReason("");
    setLostCustomReason("");
    setLostCompetitor("");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Action buttons */}
      {mode === "idle" && (
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            onClick={() => setMode("won")}
            disabled={updateLead.isPending}
          >
            Ganhou
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            onClick={() => setMode("lost")}
            disabled={updateLead.isPending}
          >
            Perdeu
          </button>
        </div>
      )}

      {/* Won expanded form */}
      {mode === "won" && (
        <div className="space-y-3 rounded-lg bg-[#f0f2f5] p-3">
          <p className="text-xs font-medium text-[#111b21]">Registrar conversao</p>

          {/* === ITEMS SECTION === */}
          {saleItems.length > 0 && (
            <div className="space-y-2">
              {saleItems.map((item) => (
                <div key={item.key} className="rounded-lg bg-white border border-[#e9edef] p-2 space-y-2">
                  {/* Item header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#111b21] truncate flex-1 flex items-center gap-1">
                      {item.tipo === "pacote" && <Package className="h-3 w-3 text-[#8B5CF6] flex-shrink-0" />}
                      {item.nome}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.key)}
                      className="p-0.5 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#667781] hover:text-red-500" />
                    </button>
                  </div>

                  {/* Price (read-only from table) + Desconto */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="text-[9px] text-[#8696a0] block mb-0.5">Preco</span>
                      <div className="h-7 rounded-md border border-[#e9edef] bg-[#f5f6f6] px-2 flex items-center text-xs text-[#111b21]">
                        {formatCurrency(item.preco_unitario)}
                      </div>
                    </div>
                    <div className="w-20">
                      <span className="text-[9px] text-[#8696a0] block mb-0.5">Desc %</span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        placeholder="0"
                        value={item.desconto || ""}
                        onChange={(e) => handleUpdateItem(item.key, "desconto", parseFloat(e.target.value) || 0)}
                        className="h-7 border-[#e9edef] text-xs text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-[9px] text-[#8696a0] block mb-0.5">Total</span>
                      <div className="h-7 rounded-md border border-[#e9edef] bg-[#f5f6f6] px-2 flex items-center text-xs font-medium text-[#111b21]">
                        {formatCurrency(item.valor_total)}
                      </div>
                    </div>
                  </div>

                  {/* Floor price warning */}
                  {item.preco_minimo > 0 && item.valor_total < item.preco_minimo * item.quantidade && (
                    <p className="text-[9px] text-red-500">
                      Abaixo do piso ({formatCurrency(item.preco_minimo)})
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add item button */}
          <Popover
            open={servicePopoverOpen}
            onOpenChange={(open) => {
              setServicePopoverOpen(open);
              if (!open) { setSearchTerm(""); setPopoverTab("servicos"); }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-[#00a884] hover:text-[#00a884] hover:bg-[#e7fcf5] px-2"
              >
                <Plus className="h-3 w-3" />
                Adicionar item
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start" side="bottom" sideOffset={4}>
              {availablePackages.length > 0 && (
                <div className="flex border-b border-[#e9edef]">
                  <button
                    type="button"
                    onClick={() => { setPopoverTab("servicos"); setSearchTerm(""); }}
                    className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
                      popoverTab === "servicos" ? "text-[#00a884] border-b-2 border-[#00a884]" : "text-[#667781] hover:text-[#111b21]"
                    }`}
                  >
                    Servicos/Produtos
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPopoverTab("pacotes"); setSearchTerm(""); }}
                    className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
                      popoverTab === "pacotes" ? "text-[#8B5CF6] border-b-2 border-[#8B5CF6]" : "text-[#667781] hover:text-[#111b21]"
                    }`}
                  >
                    Pacotes
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 border-b border-[#e9edef] px-3 py-2">
                <Search className="h-3.5 w-3.5 text-[#667781] flex-shrink-0" />
                <Input
                  placeholder={popoverTab === "pacotes" ? "Buscar pacote..." : "Buscar servico..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-[#667781]"
                />
              </div>

              <div className="max-h-48 overflow-y-auto">
                {popoverTab === "servicos" ? (
                  filteredServices.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-[#667781]">
                        {searchTerm.trim() ? "Nenhum servico encontrado" : "Nenhum servico disponivel"}
                      </p>
                    </div>
                  ) : (
                    filteredServices.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleAddService(service)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f0f2f5] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[#111b21] truncate text-xs">{service.nome}</p>
                          {service.categoria && (
                            <p className="text-[10px] text-[#667781] truncate">{service.categoria}</p>
                          )}
                        </div>
                        {(service.preco_tabela_maior ?? service.preco) > 0 && (
                          <span className="text-[10px] text-[#667781] ml-2 flex-shrink-0">
                            {formatCurrency(service.preco_tabela_maior ?? service.preco)}
                          </span>
                        )}
                      </button>
                    ))
                  )
                ) : (
                  filteredPackages.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-[#667781]">
                        {searchTerm.trim() ? "Nenhum pacote encontrado" : "Nenhum pacote disponivel"}
                      </p>
                    </div>
                  ) : (
                    filteredPackages.map((pkg) => {
                      const desconto = pkg.desconto_percentual ? Number(pkg.desconto_percentual) : 0;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => handleAddPackage(pkg)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f0f2f5] transition-colors"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-[#8B5CF6] flex-shrink-0" />
                            <p className="text-[#111b21] truncate text-xs">{pkg.nome}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            {desconto > 0 && (
                              <span className="text-[9px] font-bold text-red-500">-{desconto}%</span>
                            )}
                            <span className="text-[10px] text-[#8B5CF6] font-medium">
                              {formatCurrency(pkg.preco_pacote)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* === PAYMENT SECTION === */}
          {saleItems.length > 0 && (
            <>
              <div className="border-t border-[#e9edef] pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-[#111b21] flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Pagamento
                  </span>
                  {payments.length < 4 && (
                    <button
                      type="button"
                      onClick={addPayment}
                      className="text-[10px] text-[#00a884] hover:text-[#00a884]/80 flex items-center gap-0.5"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      Dividir
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {payments.map((payment, idx) => (
                    <div key={payment.key} className="rounded-lg bg-white border border-[#e9edef] p-2 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        {/* Forma */}
                        <Select
                          value={payment.forma || "__none__"}
                          onValueChange={(v) => {
                            handlePaymentChange(payment.key, "forma", v === "__none__" ? "" : v);
                            // Auto-fill valor if single payment
                            if (payments.length === 1) {
                              handlePaymentChange(payment.key, "valor", total);
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 flex-1 text-[10px] border-[#e9edef]">
                            <SelectValue placeholder="Forma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">Selecione...</SelectItem>
                            {(Object.entries(PAYMENT_FORM_LABELS) as [PaymentForm, string][]).map(([key, label]) => (
                              <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Valor */}
                        <div className="relative w-24">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#667781]">R$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={payment.valor || ""}
                            onChange={(e) => handlePaymentChange(payment.key, "valor", parseFloat(e.target.value) || 0)}
                            className="h-7 border-[#e9edef] pl-6 text-xs"
                          />
                        </div>

                        {/* Remove */}
                        {payments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePayment(payment.key)}
                            className="p-0.5 rounded hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3 text-[#667781] hover:text-red-500" />
                          </button>
                        )}
                      </div>

                      {/* Card details row */}
                      {needsCard(payment.forma) && (
                        <div className="flex gap-1.5">
                          <Select
                            value={payment.bandeira || "__none__"}
                            onValueChange={(v) => handlePaymentChange(payment.key, "bandeira", v === "__none__" ? "" : v)}
                          >
                            <SelectTrigger className="h-6 flex-1 text-[9px] border-[#e9edef]">
                              <SelectValue placeholder="Bandeira" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">Bandeira...</SelectItem>
                              {(Object.entries(CARD_BRAND_LABELS) as [CardBrand, string][]).map(([key, label]) => (
                                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {needsParcelas(payment.forma) && (
                            <Select
                              value={String(payment.parcelas)}
                              onValueChange={(v) => handlePaymentChange(payment.key, "parcelas", Number(v))}
                            >
                              <SelectTrigger className="h-6 w-16 text-[9px] border-[#e9edef]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PARCELAS_OPTIONS.map(n => (
                                  <SelectItem key={n} value={String(n)} className="text-xs">{n}x</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* Tipo (a_vista, recorrencia) */}
                          <Select
                            value={payment.tipo}
                            onValueChange={(v) => handlePaymentChange(payment.key, "tipo", v)}
                          >
                            <SelectTrigger className="h-6 flex-1 text-[9px] border-[#e9edef]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(PAYMENT_PLAN_LABELS) as [PaymentPlanType, string][]).map(([key, label]) => (
                                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Parcela info */}
                      {needsParcelas(payment.forma) && payment.parcelas > 1 && payment.valor > 0 && (
                        <p className="text-[9px] text-[#8696a0]">
                          {payment.parcelas}x de {formatCurrency(payment.valor / payment.parcelas)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Payment difference alert */}
                {Math.abs(diferencaPagamentos) > 0.01 && saleItems.length > 0 && (
                  <p className={`text-[10px] mt-1 ${diferencaPagamentos > 0 ? "text-amber-600" : "text-red-500"}`}>
                    {diferencaPagamentos > 0
                      ? `Falta: ${formatCurrency(diferencaPagamentos)}`
                      : `Excedente: ${formatCurrency(Math.abs(diferencaPagamentos))}`
                    }
                  </p>
                )}
              </div>

              {/* Profissional */}
              {profissionais.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-[#667781] flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Profissional responsável
                  </span>
                  <Select value={profissionalId || "__none__"} onValueChange={(v) => setProfissionalId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-7 text-xs border-[#e9edef]">
                      <SelectValue placeholder="Selecionar (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">Nenhum</SelectItem>
                      {profissionais.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between border-t border-[#e9edef] pt-2">
                <span className="text-xs font-medium text-[#111b21]">Total</span>
                <span className="text-sm font-bold text-[#111b21]">{formatCurrency(total)}</span>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              className="w-full rounded-lg bg-[#00a884] py-2 text-sm font-medium text-white transition-colors hover:bg-[#00a884]/90 disabled:opacity-50"
              onClick={handleSaveWon}
              disabled={isSavingSale || updateLead.isPending || saleItems.length === 0}
            >
              {isSavingSale || updateLead.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Salvar Conversao"
              )}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[#e9edef] bg-white px-4 py-2 text-sm text-[#667781] transition-colors hover:bg-[#f0f2f5]"
              onClick={handleCancel}
              disabled={isSavingSale || updateLead.isPending}
            >
              Cancelar
            </button>
          </div>

          {/* Link to full form */}
          <Link
            to={`/vendas/novo?lead_id=${leadId}&from=chat`}
            className="flex items-center justify-center gap-1 text-[10px] text-[#667781] hover:text-[#111b21] transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir formulario completo
          </Link>
        </div>
      )}

      {/* Lost expanded form */}
      {mode === "lost" && (
        <div className="space-y-2 rounded-lg bg-[#f0f2f5] p-3">
          <p className="text-xs font-medium text-[#111b21]">Registrar perda</p>

          <Select value={lostReason} onValueChange={setLostReason}>
            <SelectTrigger className="border-[#e9edef] text-sm">
              <SelectValue placeholder="Motivo da perda" />
            </SelectTrigger>
            <SelectContent>
              {MOTIVOS_PERDA.map(motivo => (
                <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {lostReason === "Outro" && (
            <Input
              type="text"
              placeholder="Descreva o motivo"
              value={lostCustomReason}
              onChange={(e) => setLostCustomReason(e.target.value)}
              className="border-[#e9edef] text-sm"
            />
          )}

          <Input
            type="text"
            placeholder="Nome do concorrente (opcional)"
            value={lostCompetitor}
            onChange={(e) => setLostCompetitor(e.target.value)}
            className="border-[#e9edef] text-sm"
          />

          <div className="flex gap-2">
            <button
              type="button"
              className="w-full rounded-lg bg-red-500 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              onClick={handleSaveLost}
              disabled={updateLead.isPending || (!lostReason && !lostCustomReason)}
            >
              {updateLead.isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </button>
            <button
              type="button"
              className="rounded-lg border border-[#e9edef] bg-white px-4 py-2 text-sm text-[#667781] transition-colors hover:bg-[#f0f2f5]"
              onClick={handleCancel}
              disabled={updateLead.isPending}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
