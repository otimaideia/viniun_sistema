import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, Search, Package, ShoppingBag, Scissors, ExternalLink, CreditCard, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useVendasMT, useVendaMT } from '@/hooks/multitenant/useVendasMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PAYMENT_FORM_LABELS,
  PAYMENT_PLAN_LABELS,
  CARD_BRAND_LABELS,
} from '@/types/vendas';
import type {
  PaymentMethod, SaleItemCreate, SaleItemType, SalePaymentCreate,
  PaymentForm, PaymentPlanType, CardBrand,
} from '@/types/vendas';
// Recurrence types kept for _recurrenceConfig defaults only

type DiscountType = 'percent' | 'fixed';

interface ItemRow {
  key: string;
  tipo_item: SaleItemType;
  service_id: string;
  product_id: string;
  package_id: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
  desconto: number;
  desconto_tipo: DiscountType; // 'percent' = %, 'fixed' = R$
  valor_total: number;
  sessoes_protocolo: number;
  preco_minimo: number; // preco_tabela_menor - floor price for discount validation
}

interface PaymentEntry {
  key: string;
  forma: PaymentForm | '';
  tipo: PaymentPlanType;
  bandeira: CardBrand | '';
  parcelas: number;
  valor: number;
}

interface ProfissionalOption {
  id: string;
  nome: string;
}

interface LeadOption {
  id: string;
  nome: string;
  telefone: string | null;
  email?: string | null;
  responsavel_id?: string | null;
}

interface ServiceOption {
  id: string;
  nome: string;
  descricao: string | null;
  custo_insumos: number | null;
  sessoes_protocolo: number | null;
  preco_tabela_maior: number | null;
  preco_tabela_menor: number | null;
  preco_desconto: number | null;
  preco_volume: number | null;
  custo_pix: number | null;
  preco_por_sessao: number | null;
}

interface ProductOption {
  id: string;
  nome: string;
  custo_pix: number | null;
}

interface PackageOption {
  id: string;
  nome: string;
  preco_pacote: number;
  preco_original: number;
  items?: { service_id: string; quantidade: number; service?: { nome: string; sessoes_protocolo: number | null } }[];
}


const TIPO_ITEM_OPTIONS: { value: SaleItemType; label: string; icon: typeof Scissors }[] = [
  { value: 'servico', label: 'Servico', icon: Scissors },
  { value: 'produto', label: 'Produto', icon: ShoppingBag },
  { value: 'pacote', label: 'Pacote', icon: Package },
];

const emptyItem = (): ItemRow => ({
  key: crypto.randomUUID(),
  tipo_item: 'servico',
  service_id: '',
  product_id: '',
  package_id: '',
  descricao: '',
  quantidade: 1,
  preco_unitario: 0,
  custo_unitario: 0,
  desconto: 0,
  desconto_tipo: 'percent',
  valor_total: 0,
  sessoes_protocolo: 1,
  preco_minimo: 0,
});

const emptyPayment = (): PaymentEntry => ({
  key: crypto.randomUUID(),
  forma: '',
  tipo: 'a_vista',
  bandeira: '',
  parcelas: 1,
  valor: 0,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Pure helper functions for discount calculations (no component state deps)
const round2 = (n: number) => Math.round(n * 100) / 100;

const getMaxDiscountPercent = (item: ItemRow): number => {
  if (item.preco_minimo <= 0 || item.preco_unitario <= 0) return 100;
  if (item.preco_minimo >= item.preco_unitario) return 0;
  const maxDiscount = ((item.preco_unitario - item.preco_minimo) / item.preco_unitario) * 100;
  return Math.max(0, Math.floor(maxDiscount * 100) / 100);
};

const getMaxDiscountFixed = (item: ItemRow): number => {
  if (item.preco_minimo <= 0 || item.preco_unitario <= 0) return round2(item.preco_unitario * item.quantidade);
  if (item.preco_minimo >= item.preco_unitario) return 0;
  return round2((item.preco_unitario - item.preco_minimo) * item.quantidade);
};

const getItemDiscountValue = (item: ItemRow): number => {
  const subtotal = item.quantidade * item.preco_unitario;
  if (item.desconto_tipo === 'fixed') {
    const maxFixed = item.preco_minimo > 0 ? getMaxDiscountFixed(item) : subtotal;
    return Math.min(item.desconto, maxFixed);
  } else {
    const maxPct = getMaxDiscountPercent(item);
    const clampedPct = item.preco_minimo > 0 ? Math.min(item.desconto, maxPct) : item.desconto;
    return subtotal * (clampedPct / 100);
  }
};

const updateItemTotal = (item: ItemRow): ItemRow => {
  const subtotal = item.quantidade * item.preco_unitario;
  let clampedDesconto = item.desconto;

  if (item.desconto_tipo === 'fixed') {
    const maxFixed = item.preco_minimo > 0 ? getMaxDiscountFixed(item) : subtotal;
    clampedDesconto = round2(Math.min(item.desconto, maxFixed));
    const valorTotal = subtotal - clampedDesconto;
    return { ...item, desconto: clampedDesconto, valor_total: round2(Math.max(0, valorTotal)) };
  } else {
    const maxPct = getMaxDiscountPercent(item);
    clampedDesconto = round2(item.preco_minimo > 0 ? Math.min(item.desconto, maxPct) : item.desconto);
    const descontoValor = subtotal * (clampedDesconto / 100);
    return { ...item, desconto: clampedDesconto, valor_total: round2(Math.max(0, subtotal - descontoValor)) };
  }
};

export default function VendaEdit() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const { createSale, updateSale } = useVendasMT();
  const { sale, items: existingItems, payments: existingPayments, isLoading } = useVendaMT(id);

  const [franchiseId, setFranchiseId] = useState(franchise?.id || '');
  const [observacoes, setObservacoes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [payments, setPayments] = useState<PaymentEntry[]>([emptyPayment()]);
  const [profissionalId, setProfissionalId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [linkedLead, setLinkedLead] = useState<LeadOption | null>(null);
  const [appointmentId, setAppointmentId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [descontoGlobal, setDescontoGlobal] = useState(0); // Global discount in R$

  // Lead search
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadSearchResults, setLeadSearchResults] = useState<LeadOption[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Recurrence config removed from PDV UI - configured post-sale

  // Lookup data
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);

  // Fetch profissionais
  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from('mt_users')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('nome')
      .then(({ data }) => {
        if (data) setProfissionais(data as ProfissionalOption[]);
      });
  }, [tenant?.id]);

  // Lead search with debounce
  useEffect(() => {
    if (!tenant?.id || !leadSearchQuery.trim()) {
      setLeadSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      const q = leadSearchQuery.trim();
      // Search by name OR phone
      const { data } = await supabase
        .from('mt_leads')
        .select('id, nome, telefone, email, responsavel_id')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`)
        .order('nome')
        .limit(20);

      if (data) setLeadSearchResults(data as LeadOption[]);
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [tenant?.id, leadSearchQuery]);

  // Fetch services
  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from('mt_services')
      .select('id, nome, descricao, custo_insumos, sessoes_protocolo, preco_tabela_maior, preco_tabela_menor, preco_desconto, preco_volume, custo_pix, preco_por_sessao')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('nome')
      .then(({ data }) => {
        if (data) setServices(data as ServiceOption[]);
      });
  }, [tenant?.id]);

  // Fetch products
  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from('mt_inventory_products')
      .select('id, nome, custo_pix')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('nome')
      .then(({ data }) => {
        if (data) setProducts(data as ProductOption[]);
      });
  }, [tenant?.id]);

  // Fetch packages
  useEffect(() => {
    if (!tenant?.id) return;
    supabase
      .from('mt_packages')
      .select('id, nome, preco_pacote, preco_original, items:mt_package_items(service_id, quantidade, service:mt_services(nome, sessoes_protocolo))')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('nome')
      .then(({ data }) => {
        if (data) setPackages(data as unknown as PackageOption[]);
      });
  }, [tenant?.id]);


  // Price always uses 'normal' tier (preco_tabela_maior)
  const getPriceForService = useCallback(
    (serviceId: string): { preco: number; custo: number } => {
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) return { preco: 0, custo: 0 };
      const preco = svc.preco_tabela_maior ?? 0;
      const custo = svc.custo_pix ?? 0;
      return { preco, custo };
    },
    [services]
  );

  // Load existing sale data when editing
  useEffect(() => {
    if (isEditing && sale) {
      setFranchiseId(sale.franchise_id || '');
      setObservacoes(sale.observacoes || '');
      setProfissionalId(sale.profissional_id || '');
      setLeadId(sale.lead_id || '');
      setAppointmentId(sale.appointment_id || '');
      if (sale.lead) {
        setLinkedLead(sale.lead as LeadOption);
      }
    }
  }, [isEditing, sale]);

  // Load existing payments when editing
  useEffect(() => {
    if (isEditing && existingPayments && existingPayments.length > 0) {
      setPayments(
        existingPayments.map((p) => ({
          key: p.id,
          forma: (p.forma as PaymentForm) || '',
          tipo: (p.tipo as PaymentPlanType) || 'a_vista',
          bandeira: (p.bandeira as CardBrand) || '',
          parcelas: p.parcelas || 1,
          valor: p.valor || 0,
        }))
      );
    }
  }, [isEditing, existingPayments]);

  // Pre-populate from URL params
  useEffect(() => {
    if (isEditing) return;
    const searchParams = new URLSearchParams(window.location.search);
    const presetLeadId = searchParams.get('lead_id');
    if (presetLeadId && !leadId) {
      setLeadId(presetLeadId);
      supabase
        .from('mt_leads')
        .select('id, nome, telefone, email')
        .eq('id', presetLeadId)
        .single()
        .then(({ data: leadData }) => {
          if (leadData) {
            setLinkedLead(leadData as LeadOption);
          }
        });
    }
  }, [isEditing, leadId]);

  useEffect(() => {
    if (isEditing && existingItems && existingItems.length > 0) {
      setItems(
        existingItems.map((item) => ({
          key: item.id,
          tipo_item: (item.tipo_item as SaleItemType) || 'servico',
          service_id: item.service_id || '',
          product_id: item.product_id || '',
          package_id: item.package_id || '',
          descricao: item.descricao,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          custo_unitario: item.custo_unitario || 0,
          desconto: item.desconto_percentual,
          desconto_tipo: 'percent' as DiscountType,
          valor_total: item.valor_total,
          sessoes_protocolo: item.sessoes_protocolo || 1,
          preco_minimo: 0, // will be resolved below from services lookup
        }))
      );
    }
  }, [isEditing, existingItems]);

  // Resolve preco_minimo for existing items once services are loaded
  useEffect(() => {
    if (!isEditing || services.length === 0 || items.length === 0) return;
    const needsUpdate = items.some((i) => i.service_id && i.preco_minimo === 0);
    if (!needsUpdate) return;
    setItems((prev) =>
      prev.map((item) => {
        if (!item.service_id || item.preco_minimo > 0) return item;
        const svc = services.find((s) => s.id === item.service_id);
        if (!svc?.preco_tabela_menor) return item;
        return { ...item, preco_minimo: svc.preco_tabela_menor };
      })
    );
  }, [isEditing, services, items]);

  // Recalculate item totals (helpers defined outside component as pure functions)

  const handleItemChange = (key: string, field: keyof ItemRow, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = { ...item, [field]: value };
        return updateItemTotal(updated);
      })
    );
  };

  const handleServiceSelect = (key: string, serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    const { preco, custo } = getPriceForService(serviceId);
    const custoFinal = (svc.custo_insumos && svc.custo_insumos > 0) ? svc.custo_insumos : custo;
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = {
          ...item,
          tipo_item: 'servico' as SaleItemType,
          service_id: serviceId,
          product_id: '',
          package_id: '',
          descricao: svc.nome,
          preco_unitario: preco,
          custo_unitario: custoFinal,
          sessoes_protocolo: svc.sessoes_protocolo || 1,
          preco_minimo: svc.preco_tabela_menor ?? 0,
        };
        return updateItemTotal(updated);
      })
    );
  };

  const handleProductSelect = (key: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = {
          ...item,
          tipo_item: 'produto' as SaleItemType,
          service_id: '',
          product_id: productId,
          package_id: '',
          descricao: prod.nome,
          preco_unitario: prod.custo_pix || 0,
          custo_unitario: prod.custo_pix || 0,
          sessoes_protocolo: 0,
          preco_minimo: 0, // products have no floor price
        };
        return updateItemTotal(updated);
      })
    );
  };

  const handlePackageSelect = (key: string, packageId: string) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;
    const totalSessoes = pkg.items?.reduce((sum, pi) => {
      const sessoes = pi.service?.sessoes_protocolo || 1;
      return sum + sessoes * pi.quantidade;
    }, 0) || 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = {
          ...item,
          tipo_item: 'pacote' as SaleItemType,
          service_id: '',
          product_id: '',
          package_id: packageId,
          descricao: pkg.nome,
          preco_unitario: pkg.preco_pacote,
          custo_unitario: 0,
          sessoes_protocolo: totalSessoes,
          preco_minimo: 0, // packages already have discounted price, no additional floor
        };
        return updateItemTotal(updated);
      })
    );
  };

  const handleTipoItemChange = (key: string, tipo: SaleItemType) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        return {
          ...item,
          tipo_item: tipo,
          service_id: '',
          product_id: '',
          package_id: '',
          descricao: '',
          preco_unitario: 0,
          custo_unitario: 0,
          sessoes_protocolo: tipo === 'produto' ? 0 : 1,
          valor_total: 0,
          preco_minimo: 0,
          desconto: 0,
          desconto_tipo: 'percent' as DiscountType,
        };
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  // Payment handlers
  const handlePaymentChange = (key: string, field: keyof PaymentEntry, value: string | number) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p;
        const updated = { ...p, [field]: value };
        // Clear bandeira if forma is not card
        if (field === 'forma' && value !== 'credito' && value !== 'debito') {
          updated.bandeira = '';
        }
        return updated;
      })
    );
  };

  const addPayment = () => setPayments((prev) => [...prev, emptyPayment()]);

  const removePayment = (key: string) => {
    if (payments.length <= 1) return;
    setPayments((prev) => prev.filter((p) => p.key !== key));
  };

  // Max global discount = remaining margin after per-item discounts, respecting floor prices
  const maxDescontoGlobal = useMemo(() => {
    return items.reduce((sum, i) => {
      const subtotal = i.quantidade * i.preco_unitario;
      if (i.preco_minimo <= 0) return sum + subtotal; // no floor = full discount allowed
      const maxTotal = (i.preco_unitario - i.preco_minimo) * i.quantidade;
      const itemDisc = getItemDiscountValue(i);
      return sum + Math.max(0, maxTotal - itemDisc);
    }, 0);
  }, [items]);

  const totals = useMemo(() => {
    const valorBruto = items.reduce((sum, i) => sum + i.quantidade * i.preco_unitario, 0);
    const valorDescontoItens = items.reduce((sum, i) => sum + getItemDiscountValue(i), 0);
    const custoTotal = items.reduce((sum, i) => sum + i.quantidade * i.custo_unitario, 0);
    const clampedGlobal = Math.min(descontoGlobal, maxDescontoGlobal);
    const valorDesconto = valorDescontoItens + clampedGlobal;
    const valorTotal = Math.max(0, valorBruto - valorDesconto);
    return { valorBruto, valorDesconto, valorDescontoItens, descontoGlobalAplicado: clampedGlobal, valorTotal, custoTotal };
  }, [items, descontoGlobal, maxDescontoGlobal]);

  const totalPagamentos = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.valor || 0), 0);
  }, [payments]);

  const diferencaPagamentos = totals.valorTotal - totalPagamentos;

  const hasItemsWithSessions = items.some(
    (i) => i.tipo_item !== 'produto' && i.sessoes_protocolo > 1
  );

  // Map PaymentForm to legacy PaymentMethod for backward compat
  const mapFormaToPM = (forma: PaymentForm): PaymentMethod => {
    const map: Record<PaymentForm, PaymentMethod> = {
      credito: 'cartao_credito',
      debito: 'cartao_debito',
      pix: 'pix',
      dinheiro: 'dinheiro',
      boleto: 'boleto',
    };
    return map[forma] || 'pix';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId || !linkedLead) {
      toast.error('Selecione um cliente (lead) para a venda');
      return;
    }
    if (items.every((i) => !i.descricao.trim())) {
      toast.error('Adicione pelo menos um item');
      return;
    }
    if (payments.every((p) => !p.forma)) {
      toast.error('Adicione pelo menos uma forma de pagamento');
      return;
    }

    setIsSaving(true);
    try {
      const saleItems: SaleItemCreate[] = items
        .filter((i) => i.descricao.trim())
        .map((i) => ({
          service_id: i.service_id || undefined,
          product_id: i.product_id || undefined,
          package_id: i.package_id || undefined,
          tipo_item: i.tipo_item,
          descricao: i.descricao,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          custo_unitario: i.custo_unitario || 0,
          desconto_percentual: i.desconto_tipo === 'percent' ? i.desconto : (i.preco_unitario > 0 ? (getItemDiscountValue(i) / (i.quantidade * i.preco_unitario)) * 100 : 0),
          desconto_valor: getItemDiscountValue(i),
          valor_total: i.valor_total,
          sessoes_protocolo: i.sessoes_protocolo || 0,
        }));

      const salePayments: SalePaymentCreate[] = payments
        .filter((p) => p.forma)
        .map((p) => ({
          forma: p.forma as PaymentForm,
          tipo: p.tipo,
          bandeira: (p.forma === 'credito' || p.forma === 'debito') && p.bandeira ? p.bandeira as CardBrand : undefined,
          parcelas: p.parcelas,
          valor: p.valor,
        }));

      // Determine legacy forma_pagamento
      const validPayments = payments.filter((p) => p.forma);
      const legacyFormaPagamento: PaymentMethod | undefined =
        validPayments.length === 0 ? undefined :
        validPayments.length === 1 ? mapFormaToPM(validPayments[0].forma as PaymentForm) :
        'misto';

      const clienteNome = linkedLead.nome;
      const clienteTelefone = linkedLead.telefone || undefined;

      if (isEditing && id) {
        await updateSale({
          id,
          franchise_id: franchiseId || undefined,
          cliente_nome: clienteNome,
          cliente_telefone: clienteTelefone,
          profissional_id: profissionalId || undefined,
          lead_id: leadId || undefined,
          appointment_id: appointmentId || undefined,
          forma_pagamento: legacyFormaPagamento,
          tabela_preco: 'normal',
          parcelas: validPayments[0]?.parcelas || 1,
          valor_bruto: totals.valorBruto,
          valor_desconto: totals.valorDesconto,
          valor_total: totals.valorTotal,
          custo_total: totals.custoTotal,
          observacoes: observacoes || undefined,
        });
        navigate(`/vendas/${id}`);
      } else {
        const created = await createSale({
          franchise_id: franchiseId || franchise?.id || '',
          cliente_nome: clienteNome,
          cliente_telefone: clienteTelefone,
          profissional_id: profissionalId || undefined,
          lead_id: leadId || undefined,
          appointment_id: appointmentId || undefined,
          forma_pagamento: legacyFormaPagamento,
          tabela_preco: 'normal',
          parcelas: validPayments[0]?.parcelas || 1,
          valor_bruto: totals.valorBruto,
          valor_desconto: totals.valorDesconto,
          valor_total: totals.valorTotal,
          custo_total: totals.custoTotal,
          observacoes: observacoes || undefined,
          items: saleItems,
          payments: salePayments,
          // Recurrence config uses defaults - configuration happens post-sale
          _recurrenceConfig: hasItemsWithSessions ? {
            recorrencia_tipo: 'mensal',
            recorrencia_intervalo_dias: 30,
            geracao_agenda: 'manual',
          } : undefined,
        });
        navigate(`/vendas/${created.id}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar venda');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing && isLoading) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <span>{isEditing ? 'Editar Venda' : 'Nova Venda'}</span>
          </div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar Venda' : 'Nova Venda'}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente — busca obrigatoria */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {linkedLead ? (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Cliente</Badge>
                    <span className="font-medium text-lg">{linkedLead.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" asChild>
                      <Link to={`/leads/${leadId}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Ver Lead
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        setLeadId('');
                        setLinkedLead(null);
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Trocar
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  {linkedLead.telefone && <span>Tel: {linkedLead.telefone}</span>}
                  {linkedLead.email && <span>Email: {linkedLead.email}</span>}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Buscar cliente por nome ou telefone *</Label>
                <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={leadSearchOpen}
                      className="w-full justify-start text-muted-foreground font-normal h-10"
                    >
                      <Search className="h-4 w-4 mr-2 shrink-0" />
                      Buscar cliente...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Digite nome ou telefone..."
                        value={leadSearchQuery}
                        onValueChange={setLeadSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {leadSearchQuery.trim().length < 2
                            ? 'Digite pelo menos 2 caracteres...'
                            : 'Nenhum cliente encontrado'}
                        </CommandEmpty>
                        <CommandGroup>
                          {leadSearchResults.map((lead) => (
                            <CommandItem
                              key={lead.id}
                              value={lead.id}
                              onSelect={() => {
                                setLeadId(lead.id);
                                setLinkedLead(lead);
                                setLeadSearchOpen(false);
                                setLeadSearchQuery('');
                                // Auto-preencher responsável da venda com o responsável do lead
                                if (lead.responsavel_id) {
                                  setProfissionalId(lead.responsavel_id);
                                }
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{lead.nome}</span>
                                <span className="text-xs text-muted-foreground">
                                  {lead.telefone || 'Sem telefone'}
                                  {lead.email ? ` • ${lead.email}` : ''}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Responsavel - auto-filled from lead, editable only if lead has no responsavel */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Responsável pela Venda</Label>
                {linkedLead?.responsavel_id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={profissionais.find(p => p.id === profissionalId)?.nome || 'Carregando...'}
                      disabled
                      className="bg-muted"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLinkedLead({ ...linkedLead, responsavel_id: null });
                      }}
                      title="Alterar responsável"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Select value={profissionalId || '__none__'} onValueChange={(v) => setProfissionalId(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {profissionais.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens da Venda</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.key} className="p-3 border rounded-lg space-y-3">
                  {/* Row 1: Tipo + Selector + Descricao */}
                  <div className="grid gap-2 md:grid-cols-[120px_1fr_1fr] items-end">
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <Select
                        value={item.tipo_item}
                        onValueChange={(v) => handleTipoItemChange(item.key, v as SaleItemType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_ITEM_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-1.5">
                                <opt.icon className="h-3.5 w-3.5" />
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {item.tipo_item === 'servico' ? 'Servico' : item.tipo_item === 'produto' ? 'Produto' : 'Pacote'}
                      </Label>
                      {item.tipo_item === 'servico' && (
                        <Select
                          value={item.service_id || '_custom'}
                          onValueChange={(v) => {
                            if (v === '_custom') {
                              handleItemChange(item.key, 'service_id', '');
                              handleItemChange(item.key, 'sessoes_protocolo', 1);
                            } else {
                              handleServiceSelect(item.key, v);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione servico" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_custom">Personalizado</SelectItem>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {item.tipo_item === 'produto' && (
                        <Select
                          value={item.product_id || '_custom'}
                          onValueChange={(v) => {
                            if (v === '_custom') {
                              handleItemChange(item.key, 'product_id', '');
                            } else {
                              handleProductSelect(item.key, v);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione produto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_custom">Personalizado</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {item.tipo_item === 'pacote' && (
                        <Select
                          value={item.package_id || '_custom'}
                          onValueChange={(v) => {
                            if (v === '_custom') {
                              handleItemChange(item.key, 'package_id', '');
                            } else {
                              handlePackageSelect(item.key, v);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione pacote" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_custom">Personalizado</SelectItem>
                            {packages.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome} - {formatCurrency(p.preco_pacote)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Descricao</Label>
                      <Input
                        placeholder="Descricao do item"
                        value={item.descricao}
                        onChange={(e) => handleItemChange(item.key, 'descricao', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 2: Qty + Price + Discount + Total + Delete */}
                  <div className="grid gap-2 grid-cols-2 md:grid-cols-[1fr_1fr_0.8fr_1fr_40px] items-end">
                    <div>
                      <Label className="text-xs text-muted-foreground">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) =>
                          handleItemChange(item.key, 'quantidade', Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Preco Unit.</Label>
                      <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                        {formatCurrency(item.preco_unitario)}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Label className="text-xs text-muted-foreground">Desconto</Label>
                        <div className="flex rounded-md border overflow-hidden ml-auto">
                          <button
                            type="button"
                            className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${item.desconto_tipo === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            onClick={() => {
                              // Convert: if switching from fixed to %, convert R$ to %
                              const subtotal = item.quantidade * item.preco_unitario;
                              const newDesconto = subtotal > 0 ? (item.desconto / subtotal) * 100 : 0;
                              setItems((prev) => prev.map((i) => i.key !== item.key ? i : updateItemTotal({ ...i, desconto_tipo: 'percent', desconto: Math.round(newDesconto * 100) / 100 })));
                            }}
                          >%</button>
                          <button
                            type="button"
                            className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${item.desconto_tipo === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            onClick={() => {
                              // Convert: if switching from % to fixed, convert % to R$
                              const subtotal = item.quantidade * item.preco_unitario;
                              const newDesconto = subtotal * (item.desconto / 100);
                              setItems((prev) => prev.map((i) => i.key !== item.key ? i : updateItemTotal({ ...i, desconto_tipo: 'fixed', desconto: Math.round(newDesconto * 100) / 100 })));
                            }}
                          >R$</button>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={item.desconto_tipo === 'percent'
                          ? (item.preco_minimo > 0 ? getMaxDiscountPercent(item) : 100)
                          : (item.preco_minimo > 0 ? getMaxDiscountFixed(item) : item.quantidade * item.preco_unitario)
                        }
                        step={item.desconto_tipo === 'fixed' ? 0.01 : 1}
                        value={item.desconto || ''}
                        onChange={(e) =>
                          handleItemChange(item.key, 'desconto', Number(e.target.value))
                        }
                        placeholder={item.desconto_tipo === 'percent' ? '0%' : '0,00'}
                      />
                      {item.preco_minimo > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          Máx {item.desconto_tipo === 'percent'
                            ? `${getMaxDiscountPercent(item).toFixed(1)}%`
                            : formatCurrency(getMaxDiscountFixed(item))
                          } (piso {formatCurrency(item.preco_minimo)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-end">
                      <div className="text-right">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <div className="font-semibold text-sm h-10 flex items-center justify-end">
                          {formatCurrency(item.valor_total)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.key)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 border-t pt-4 space-y-2 max-w-sm ml-auto text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.valorBruto)}</span>
              </div>
              {totals.valorDescontoItens > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Desc. Itens</span>
                  <span>- {formatCurrency(totals.valorDescontoItens)}</span>
                </div>
              )}
              {/* Global discount input */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground whitespace-nowrap">Desc. Geral R$</span>
                <div className="flex flex-col items-end">
                  <Input
                    type="number"
                    min={0}
                    max={maxDescontoGlobal}
                    step={0.01}
                    value={descontoGlobal || ''}
                    onChange={(e) => setDescontoGlobal(Number(e.target.value))}
                    className="w-28 h-8 text-right text-sm"
                    placeholder="0,00"
                  />
                  {maxDescontoGlobal > 0 && maxDescontoGlobal < totals.valorBruto && (
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Máx {formatCurrency(maxDescontoGlobal)}
                    </span>
                  )}
                </div>
              </div>
              {totals.valorDesconto > 0 && (
                <div className="flex justify-between text-destructive font-medium">
                  <span>Total Descontos</span>
                  <span>- {formatCurrency(totals.valorDesconto)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(totals.valorTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pagamento — multiplas formas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamento
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPayment}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Forma
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.map((payment, idx) => (
              <div key={payment.key} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Pagamento {idx + 1}
                  </span>
                  {payments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removePayment(payment.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                  {/* Forma */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Forma *</Label>
                    <Select
                      value={payment.forma || '__none__'}
                      onValueChange={(v) => handlePaymentChange(payment.key, 'forma', v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecione</SelectItem>
                        {Object.entries(PAYMENT_FORM_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select
                      value={payment.tipo}
                      onValueChange={(v) => handlePaymentChange(payment.key, 'tipo', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_PLAN_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bandeira — condicional */}
                  {(payment.forma === 'credito' || payment.forma === 'debito') && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Bandeira</Label>
                      <Select
                        value={payment.bandeira || '__none__'}
                        onValueChange={(v) => handlePaymentChange(payment.key, 'bandeira', v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Selecione</SelectItem>
                          {Object.entries(CARD_BRAND_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Parcelas */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parcelas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={48}
                      value={payment.parcelas}
                      onChange={(e) => handlePaymentChange(payment.key, 'parcelas', Number(e.target.value))}
                    />
                  </div>

                  {/* Valor */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payment.valor || ''}
                      onChange={(e) => handlePaymentChange(payment.key, 'valor', Number(e.target.value))}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Parcela info */}
                {payment.parcelas > 1 && payment.valor > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {payment.parcelas}x de {formatCurrency(payment.valor / payment.parcelas)}
                  </div>
                )}
              </div>
            ))}

            {/* Payment summary */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total dos pagamentos</span>
                <span className="font-medium">{formatCurrency(totalPagamentos)}</span>
              </div>
              {Math.abs(diferencaPagamentos) > 0.01 && (
                <div className={`flex justify-between ${diferencaPagamentos > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  <span>{diferencaPagamentos > 0 ? 'Falta' : 'Excede'}</span>
                  <span>{formatCurrency(Math.abs(diferencaPagamentos))}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recurrence Config removed from PDV - belongs to post-sale flow */}

        {/* Observations */}
        <Card>
          <CardHeader>
            <CardTitle>Observacoes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observacoes sobre a venda..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : isEditing ? 'Salvar Alteracoes' : 'Criar Venda'}
          </Button>
        </div>
      </form>
    </div>
  );
}
