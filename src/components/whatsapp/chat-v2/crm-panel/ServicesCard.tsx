import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, Check, Package, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { useLeadsMT } from "@/hooks/useLeadsMT";
import type { MTLead } from "@/types/lead-mt";
import { toast } from "sonner";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ServicesCardProps {
  leadId: string;
  lead?: MTLead | null;
}

interface ServiceItem {
  id: string;
  nome: string;
  categoria?: string | null;
  tipo?: "servico" | "produto" | "pacote";
}

interface PackageRow {
  id: string;
  nome: string;
  categoria: string | null;
  preco_original: number | null;
  preco_pacote: number;
  desconto_percentual: number | null;
  is_promocional: boolean;
  data_inicio: string | null;
  data_fim: string | null;
}

type FilterTab = "tudo" | "servicos" | "produtos" | "pacotes";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SERVICE_COLOR = "#22C55E"; // emerald
const PRODUCT_COLOR = "#3B82F6"; // blue
const PACKAGE_COLOR = "#8B5CF6"; // purple

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "tudo", label: "Tudo" },
  { key: "servicos", label: "Servicos" },
  { key: "produtos", label: "Produtos" },
  { key: "pacotes", label: "Pacotes" },
];

function bgWithOpacity(hex: string, opacity = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function getColorForTipo(tipo?: string): string {
  if (tipo === "produto") return PRODUCT_COLOR;
  if (tipo === "pacote") return PACKAGE_COLOR;
  return SERVICE_COLOR;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ServicesCard({ leadId, lead }: ServicesCardProps) {
  const { tenant } = useTenantContext();
  const { updateLead } = useLeadsMT();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("tudo");

  // ---------------------------------------------------------------------------
  // Query: available services from mt_services (includes products)
  // ---------------------------------------------------------------------------

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ["mt-services-crm", tenant?.id],
    queryFn: async (): Promise<(ServiceItem & { rawTipo: string })[]> => {
      let q = supabase
        .from("mt_services")
        .select("id, nome, categoria, tipo")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("nome");

      if (tenant) {
        q = q.eq("tenant_id", tenant.id);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.id,
        nome: s.nome,
        categoria: s.categoria,
        tipo: s.tipo === "produto" ? "produto" as const : "servico" as const,
        rawTipo: s.tipo || "servico",
      }));
    },
    enabled: !!tenant,
    staleTime: 1000 * 60 * 5,
  });

  // ---------------------------------------------------------------------------
  // Query: available packages from mt_packages
  // ---------------------------------------------------------------------------

  const { data: packages = [], isLoading: isLoadingPackages } = useQuery({
    queryKey: ["mt-packages-crm", tenant?.id],
    queryFn: async (): Promise<PackageRow[]> => {
      const hoje = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("mt_packages")
        .select("id, nome, categoria, preco_original, preco_pacote, desconto_percentual, is_promocional, data_inicio, data_fim")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("nome");

      if (tenant) {
        q = q.eq("tenant_id", tenant.id);
      }

      const { data, error } = await q;
      if (error) {
        // Table might not exist yet
        if ((error as any).code === "42P01") return [];
        throw error;
      }

      // Filter vigentes client-side for flexibility
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
  // Merge services + packages into unified list
  // ---------------------------------------------------------------------------

  const allItems: ServiceItem[] = useMemo(() => {
    const svcItems: ServiceItem[] = services.map((s) => ({
      id: s.id,
      nome: s.nome,
      categoria: s.categoria,
      tipo: s.tipo,
    }));

    const pkgItems: ServiceItem[] = packages.map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      tipo: "pacote" as const,
    }));

    return [...svcItems, ...pkgItems];
  }, [services, packages]);

  // ---------------------------------------------------------------------------
  // Selected services (stored in dados_extras.servicos_interesse)
  // ---------------------------------------------------------------------------

  const selectedServices: ServiceItem[] = useMemo(() => {
    if (!lead?.dados_extras) return [];
    const extras = lead.dados_extras as Record<string, unknown>;
    const raw = extras.servicos_interesse;
    if (Array.isArray(raw)) {
      return raw.filter(
        (s: unknown): s is ServiceItem =>
          typeof s === "object" &&
          s !== null &&
          "id" in s &&
          "nome" in s
      );
    }
    return [];
  }, [lead?.dados_extras]);

  // ---------------------------------------------------------------------------
  // Derived: selected IDs set + filtered items
  // ---------------------------------------------------------------------------

  const selectedIds = useMemo(
    () => new Set(selectedServices.map((s) => s.id)),
    [selectedServices]
  );

  const filteredItems = useMemo(() => {
    let list = allItems;

    // Filter by tab
    if (filterTab === "servicos") {
      list = list.filter((s) => s.tipo === "servico");
    } else if (filterTab === "produtos") {
      list = list.filter((s) => s.tipo === "produto");
    } else if (filterTab === "pacotes") {
      list = list.filter((s) => s.tipo === "pacote");
    }

    // Filter by search
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.nome.toLowerCase().includes(term) ||
          (s.categoria && s.categoria.toLowerCase().includes(term))
      );
    }

    return list;
  }, [allItems, filterTab, search]);

  // Package lookup for discount badges
  const packageMap = useMemo(() => {
    const map = new Map<string, PackageRow>();
    packages.forEach((p) => map.set(p.id, p));
    return map;
  }, [packages]);

  // Tab counts
  const counts = useMemo(() => ({
    tudo: allItems.length,
    servicos: allItems.filter((s) => s.tipo === "servico").length,
    produtos: allItems.filter((s) => s.tipo === "produto").length,
    pacotes: allItems.filter((s) => s.tipo === "pacote").length,
  }), [allItems]);

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const isSaving = updateLead.isPending;

  function saveServices(newList: ServiceItem[]) {
    const currentExtras =
      typeof lead?.dados_extras === "object" && lead.dados_extras !== null
        ? { ...lead.dados_extras }
        : {};

    (currentExtras as Record<string, unknown>).servicos_interesse = newList.map(
      (s) => ({ id: s.id, nome: s.nome, tipo: s.tipo || "servico" })
    );

    updateLead.mutate(
      { id: leadId, dados_extras: currentExtras },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["mt-leads", "detail", leadId] });
        },
        onError: () => {
          toast.error("Erro ao atualizar servicos");
        },
      }
    );
  }

  function handleToggleService(item: ServiceItem) {
    if (selectedIds.has(item.id)) {
      const newList = selectedServices.filter((s) => s.id !== item.id);
      saveServices(newList);
    } else {
      const newList = [...selectedServices, { id: item.id, nome: item.nome, tipo: item.tipo }];
      saveServices(newList);
    }
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

  if (isLoadingServices || isLoadingPackages) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-4 w-4 text-[#00a884] animate-spin" />
        <span className="text-xs text-[#8696a0]">Carregando catalogo...</span>
      </div>
    );
  }

  // Only show filter tabs if there are multiple types
  const hasMultipleTypes = (counts.servicos > 0 ? 1 : 0) + (counts.produtos > 0 ? 1 : 0) + (counts.pacotes > 0 ? 1 : 0) > 1;

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      {hasMultipleTypes && (
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const count = counts[tab.key];
            if (tab.key !== "tudo" && count === 0) return null;
            const isActive = filterTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all border ${
                  isActive
                    ? "bg-[#111b21] text-white border-[#111b21]"
                    : "bg-transparent text-[#667781] border-[#e9edef] hover:bg-[#f0f2f5]"
                }`}
              >
                {tab.label}
                {tab.key !== "tudo" && (
                  <span className={`text-[9px] ${isActive ? "text-white/70" : "text-[#8696a0]"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Search input */}
      {allItems.length > 6 && (
        <div className="flex items-center gap-2 rounded-lg bg-[#f0f2f5] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-[#667781] flex-shrink-0" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-6 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0 placeholder:text-[#8696a0]"
          />
        </div>
      )}

      {/* All items as toggle chips */}
      {filteredItems.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const color = getColorForTipo(item.tipo);
            const pkg = item.tipo === "pacote" ? packageMap.get(item.id) : null;
            const desconto = pkg?.desconto_percentual ? Number(pkg.desconto_percentual) : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleToggleService(item)}
                disabled={isSaving}
                title={
                  item.tipo === "pacote" && desconto > 0
                    ? `${item.nome} (-${desconto}%)`
                    : item.categoria
                      ? `${item.nome} - ${item.categoria}`
                      : item.nome
                }
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:opacity-60 cursor-pointer border"
                style={
                  isSelected
                    ? {
                        backgroundColor: bgWithOpacity(color, 0.2),
                        borderColor: color,
                        color: color,
                      }
                    : {
                        backgroundColor: "transparent",
                        borderColor: bgWithOpacity(color, 0.3),
                        color: "#8696a0",
                      }
                }
              >
                {isSelected && <Check className="h-3 w-3" />}
                {item.tipo === "pacote" && <Package className="h-3 w-3" />}
                {item.nome}
                {item.tipo === "pacote" && desconto > 0 && (
                  <span
                    className="text-[9px] font-bold ml-0.5"
                    style={{ color: isSelected ? color : "#ef4444" }}
                  >
                    -{desconto}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[#8696a0] italic">
          {search.trim()
            ? "Nenhum item encontrado"
            : filterTab === "pacotes"
              ? "Nenhum pacote vigente"
              : "Nenhum item cadastrado"}
        </p>
      )}
    </div>
  );
}
