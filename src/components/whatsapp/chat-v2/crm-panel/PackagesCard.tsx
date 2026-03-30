import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Loader2,
  Check,
  Calendar,
  Percent,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useLeadsMT } from "@/hooks/useLeadsMT";
import type { MTLead } from "@/types/lead-mt";
import { toast } from "sonner";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PackagesCardProps {
  leadId: string;
  lead?: MTLead | null;
}

interface PackageRow {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  preco_original: number | null;
  preco_pacote: number;
  desconto_percentual: number | null;
  is_promocional: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  imagem_url: string | null;
  items: {
    id: string;
    quantidade: number;
    service: {
      id: string;
      nome: string;
      tipo: string;
      imagem_url: string | null;
    } | null;
  }[];
}

interface SelectedInteresse {
  id: string;
  nome: string;
  tipo?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function PackagesCard({ leadId, lead }: PackagesCardProps) {
  const { tenant } = useTenantContext();
  const { updateLead } = useLeadsMT();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: packages with items
  // ---------------------------------------------------------------------------

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["mt-packages-crm-detail", tenant?.id],
    queryFn: async (): Promise<PackageRow[]> => {
      const hoje = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("mt_packages")
        .select(`
          id, nome, descricao, categoria, preco_original, preco_pacote,
          desconto_percentual, is_promocional, data_inicio, data_fim, imagem_url,
          items:mt_package_items(
            id, quantidade,
            service:mt_services(id, nome, tipo, imagem_url)
          )
        `)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("ordem")
        .order("nome");

      if (tenant) {
        q = q.eq("tenant_id", tenant.id);
      }

      const { data, error } = await q;
      if (error) {
        if ((error as any).code === "42P01") return [];
        throw error;
      }

      return (data || []).filter((p: any) => {
        if (p.data_inicio && p.data_inicio > hoje) return false;
        if (p.data_fim && p.data_fim < hoje) return false;
        return true;
      }) as PackageRow[];
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Selected interests from lead
  // ---------------------------------------------------------------------------

  const selectedIds = useMemo(() => {
    if (!lead?.dados_extras) return new Set<string>();
    const extras = lead.dados_extras as Record<string, unknown>;
    const raw = extras.servicos_interesse;
    if (Array.isArray(raw)) {
      return new Set(raw.map((s: any) => s.id));
    }
    return new Set<string>();
  }, [lead?.dados_extras]);

  const selectedInteresses: SelectedInteresse[] = useMemo(() => {
    if (!lead?.dados_extras) return [];
    const extras = lead.dados_extras as Record<string, unknown>;
    const raw = extras.servicos_interesse;
    if (Array.isArray(raw)) return raw as SelectedInteresse[];
    return [];
  }, [lead?.dados_extras]);

  // ---------------------------------------------------------------------------
  // Toggle package interesse
  // ---------------------------------------------------------------------------

  const isSaving = updateLead.isPending;

  function handleTogglePackage(pkg: PackageRow) {
    const currentExtras =
      typeof lead?.dados_extras === "object" && lead.dados_extras !== null
        ? { ...lead.dados_extras }
        : {};

    let newList: SelectedInteresse[];
    if (selectedIds.has(pkg.id)) {
      newList = selectedInteresses.filter((s) => s.id !== pkg.id);
    } else {
      newList = [...selectedInteresses, { id: pkg.id, nome: pkg.nome, tipo: "pacote" }];
    }

    (currentExtras as Record<string, unknown>).servicos_interesse = newList;

    updateLead.mutate(
      { id: leadId, dados_extras: currentExtras },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["mt-leads", "detail", leadId] });
        },
        onError: () => {
          toast.error("Erro ao atualizar interesses");
        },
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!lead) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-[#667781]" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-4 w-4 text-[#8B5CF6] animate-spin" />
        <span className="text-xs text-[#8696a0]">Carregando pacotes...</span>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-6">
        <Package className="h-10 w-10 mx-auto text-[#8696a0]/40 mb-2" />
        <p className="text-xs text-[#8696a0]">Nenhum pacote vigente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {packages.map((pkg) => {
        const isSelected = selectedIds.has(pkg.id);
        const desconto = pkg.desconto_percentual
          ? Number(pkg.desconto_percentual)
          : pkg.preco_original && Number(pkg.preco_original) > 0
            ? Math.round((1 - Number(pkg.preco_pacote) / Number(pkg.preco_original)) * 100)
            : 0;

        return (
          <button
            key={pkg.id}
            type="button"
            onClick={() => handleTogglePackage(pkg)}
            disabled={isSaving}
            className={`w-full text-left rounded-lg border p-2.5 transition-all ${
              isSelected
                ? "border-[#8B5CF6] bg-[#8B5CF6]/5 ring-1 ring-[#8B5CF6]/20"
                : "border-[#e9edef] bg-white hover:bg-[#f0f2f5]"
            }`}
          >
            {/* Header row */}
            <div className="flex items-start gap-2">
              {/* Image or placeholder */}
              {pkg.imagem_url ? (
                <img
                  src={pkg.imagem_url}
                  alt={pkg.nome}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-purple-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-[#8B5CF6] flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium text-[#111b21] truncate">
                    {pkg.nome}
                  </span>
                  {pkg.is_promocional && (
                    <span className="text-[9px] bg-orange-100 text-orange-600 rounded px-1 flex-shrink-0">
                      Promo
                    </span>
                  )}
                </div>

                {/* Pricing */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {Number(pkg.preco_original) > 0 && Number(pkg.preco_original) !== Number(pkg.preco_pacote) && (
                    <span className="text-[10px] line-through text-[#8696a0]">
                      {formatCurrency(Number(pkg.preco_original))}
                    </span>
                  )}
                  <span className="text-xs font-bold text-[#8B5CF6]">
                    {formatCurrency(Number(pkg.preco_pacote))}
                  </span>
                  {desconto > 0 && (
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 rounded px-1">
                      -{desconto}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Items list */}
            {pkg.items && pkg.items.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {pkg.items.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-0.5 text-[10px] text-[#667781] bg-[#f0f2f5] rounded px-1.5 py-0.5"
                  >
                    {item.service?.tipo === "produto" ? (
                      <ShoppingBag className="h-2.5 w-2.5" />
                    ) : (
                      <Sparkles className="h-2.5 w-2.5" />
                    )}
                    {item.quantidade > 1 && `${item.quantidade}x `}
                    {item.service?.nome || "Item"}
                  </span>
                ))}
              </div>
            )}

            {/* Validity */}
            {(pkg.data_inicio || pkg.data_fim) && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#8696a0]">
                <Calendar className="h-3 w-3" />
                {pkg.data_inicio ? formatDate(pkg.data_inicio) : "..."}
                {" - "}
                {pkg.data_fim ? formatDate(pkg.data_fim) : "..."}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
