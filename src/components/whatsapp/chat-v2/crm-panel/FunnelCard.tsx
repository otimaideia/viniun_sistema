import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ChevronDown, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import {
  useFunnelsMT,
  useFunnelStagesMT,
  useFunilLeadMutationsMT,
} from "@/hooks/useFunilLeadsMT";
import type { MTFunnelStage, MTFunnelLead, MTFunnel } from "@/hooks/useFunilLeadsMT";
import type { MTLead } from "@/types/lead-mt";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CadenciaIndicator } from "@/components/funil/CadenciaIndicator";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface FunnelCardProps {
  leadId: string;
  lead?: MTLead | null;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getDaysInStage(dataEtapa: string): number {
  const diff = Date.now() - new Date(dataEtapa).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function FunnelCard({ leadId, lead }: FunnelCardProps) {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Funnels for this tenant
  // ---------------------------------------------------------------------------

  const { data: funnels = [], isLoading: isLoadingFunnels } = useFunnelsMT();

  // Auto-select the default funnel, or the first one
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);

  const activeFunnelId = useMemo(() => {
    if (selectedFunnelId) return selectedFunnelId;
    if (funnels.length === 0) return null;
    const defaultFunnel = funnels.find((f) => f.is_default);
    return defaultFunnel?.id || funnels[0]?.id || null;
  }, [selectedFunnelId, funnels]);

  const activeFunnel = funnels.find((f) => f.id === activeFunnelId);

  // ---------------------------------------------------------------------------
  // Stages for the selected funnel (use inline stages from the funnel query)
  // ---------------------------------------------------------------------------

  const stages: MTFunnelStage[] = useMemo(() => {
    if (!activeFunnel?.stages) return [];
    return [...activeFunnel.stages].sort((a, b) => a.ordem - b.ordem);
  }, [activeFunnel]);

  // ---------------------------------------------------------------------------
  // This lead's position in the funnel
  // ---------------------------------------------------------------------------

  const { data: funnelLead, isLoading: isLoadingFunnelLead } = useQuery({
    queryKey: ["mt-funnel-lead", activeFunnelId, leadId],
    queryFn: async (): Promise<MTFunnelLead | null> => {
      if (!activeFunnelId || !leadId) return null;

      const { data, error } = await supabase
        .from("mt_funnel_leads")
        .select("*, stage:mt_funnel_stages(*)")
        .eq("funnel_id", activeFunnelId)
        .eq("lead_id", leadId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar lead no funil:", error);
        return null;
      }

      // Normalize the stage relation (Supabase may return array)
      if (data && Array.isArray(data.stage)) {
        data.stage = data.stage[0] || null;
      }

      return data as MTFunnelLead | null;
    },
    enabled: !!activeFunnelId && !!leadId,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const {
    addLeadToFunnel,
    moveLeadToStage,
    updateValorEstimado,
    isAdding,
    isMoving,
  } = useFunilLeadMutationsMT();

  const isBusy = isAdding || isMoving;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleAddToFunnel() {
    if (!activeFunnelId || !stages.length) return;
    const firstStage = stages[0];

    addLeadToFunnel.mutate(
      {
        funnel_id: activeFunnelId,
        stage_id: firstStage.id,
        lead_id: leadId,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["mt-funnel-lead", activeFunnelId, leadId],
          });
        },
      }
    );
  }

  function handleMoveToStage(stage: MTFunnelStage) {
    if (!funnelLead || funnelLead.stage_id === stage.id || isBusy) return;

    moveLeadToStage.mutate(
      {
        funnelLeadId: funnelLead.id,
        sourceStageId: funnelLead.stage_id,
        destinationStageId: stage.id,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["mt-funnel-lead", activeFunnelId, leadId],
          });
          queryClient.invalidateQueries({
            queryKey: ["mt-funnel-leads"],
          });
          toast.success(`Movido para "${stage.nome}"`);
        },
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Value editing
  // ---------------------------------------------------------------------------

  const [isEditingValue, setIsEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState("");

  function startEditValue() {
    setValueInput(
      funnelLead?.valor_estimado
        ? String(funnelLead.valor_estimado)
        : ""
    );
    setIsEditingValue(true);
  }

  function saveValue() {
    if (!funnelLead) return;
    const parsed = parseFloat(valueInput.replace(/[^\d.,]/g, "").replace(",", "."));
    const newValue = isNaN(parsed) ? null : parsed;

    updateValorEstimado.mutate(
      { funnelLeadId: funnelLead.id, valor: newValue },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["mt-funnel-lead", activeFunnelId, leadId],
          });
          setIsEditingValue(false);
        },
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Determine which stages are "passed" (before current stage)
  // ---------------------------------------------------------------------------

  const currentStageIndex = useMemo(() => {
    if (!funnelLead) return -1;
    return stages.findIndex((s) => s.id === funnelLead.stage_id);
  }, [stages, funnelLead]);

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

  // Loading state
  if (isLoadingFunnels) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-[#667781]" />
      </div>
    );
  }

  // No funnels configured
  if (funnels.length === 0) {
    return (
      <p className="text-xs italic text-[#667781] py-2">
        Nenhum funil configurado
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Funnel selector (only show when more than one funnel) */}
      {funnels.length > 1 && (
        <Select
          value={activeFunnelId || ""}
          onValueChange={(val) => setSelectedFunnelId(val)}
        >
          <SelectTrigger className="h-7 text-xs border-[#e9edef]">
            <SelectValue placeholder="Selecionar funil" />
          </SelectTrigger>
          <SelectContent>
            {funnels.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                {f.nome}
                {f.is_default && (
                  <span className="ml-1 text-[10px] text-[#667781]">
                    (padrao)
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Loading funnel lead position */}
      {isLoadingFunnelLead && (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-[#667781]" />
        </div>
      )}

      {/* Lead not in this funnel -- offer to add */}
      {!isLoadingFunnelLead && !funnelLead && stages.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-xs text-[#667781]">
            Lead nao esta neste funil
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-[#00a884] hover:text-[#00a884] hover:bg-[#e7fcf5] px-2"
            onClick={handleAddToFunnel}
            disabled={isBusy}
          >
            {isAdding ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Adicionar ao funil
          </Button>
        </div>
      )}

      {/* Horizontal pipeline */}
      {!isLoadingFunnelLead && funnelLead && stages.length > 0 && (
        <>
          {/* Pipeline visualization */}
          <div className="flex items-center gap-0 overflow-x-auto py-2 px-1">
            {stages.map((stage, idx) => {
              const isCurrent = stage.id === funnelLead.stage_id;
              const isPassed = currentStageIndex >= 0 && idx < currentStageIndex;
              const isLast = idx === stages.length - 1;

              return (
                <div key={stage.id} className="flex items-center flex-shrink-0">
                  {/* Stage dot + label */}
                  <button
                    type="button"
                    onClick={() => handleMoveToStage(stage)}
                    disabled={isBusy || isCurrent}
                    className={cn(
                      "flex flex-col items-center cursor-pointer group transition-all",
                      isCurrent && "cursor-default"
                    )}
                    title={stage.nome}
                  >
                    {/* Dot */}
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full text-[10px] font-bold text-white transition-all",
                        isCurrent
                          ? "w-9 h-9 ring-2 ring-offset-2 scale-110"
                          : "w-7 h-7 opacity-60 group-hover:opacity-100 group-hover:scale-105"
                      )}
                      style={{
                        backgroundColor: stage.cor || "#8696a0",
                        ...(isCurrent
                          ? { ringColor: stage.cor || "#8696a0" }
                          : {}),
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Stage name */}
                    <span
                      className={cn(
                        "mt-1 max-w-[60px] truncate text-center leading-tight",
                        isCurrent
                          ? "text-[10px] font-medium text-[#111b21]"
                          : "text-[10px] text-[#667781]"
                      )}
                    >
                      {stage.nome}
                    </span>
                  </button>

                  {/* Connector line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "h-0.5 w-5 mx-0.5 flex-shrink-0 rounded-full transition-colors",
                        isPassed || isCurrent ? "bg-[#00a884]" : "bg-[#e9edef]"
                      )}
                      style={
                        isPassed || (isCurrent && idx < stages.length - 1)
                          ? { backgroundColor: stage.cor || "#00a884" }
                          : undefined
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Info below pipeline */}
          <div className="flex items-center justify-between gap-3 text-xs">
            {/* Days in current stage */}
            <div className="flex items-center gap-1 text-[#667781]">
              <Clock className="h-3 w-3" />
              <span>
                {getDaysInStage(funnelLead.data_etapa)} dia
                {getDaysInStage(funnelLead.data_etapa) !== 1 ? "s" : ""} na
                etapa
              </span>
              {funnelLead.stage?.dias_alerta &&
                getDaysInStage(funnelLead.data_etapa) >=
                  funnelLead.stage.dias_alerta && (
                  <span className="text-[10px] text-amber-500 font-medium ml-1">
                    (atrasado)
                  </span>
                )}
            </div>

            {/* Estimated value */}
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-[#667781]" />
              {isEditingValue ? (
                <input
                  type="text"
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  onBlur={saveValue}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveValue();
                    if (e.key === "Escape") setIsEditingValue(false);
                  }}
                  className="w-20 rounded border border-[#e9edef] px-1.5 py-0.5 text-xs text-[#111b21] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                  autoFocus
                  placeholder="0"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEditValue}
                  className="text-xs font-medium text-[#111b21] hover:text-[#00a884] transition-colors"
                  title="Clique para editar valor"
                >
                  {funnelLead.valor_estimado
                    ? formatCurrency(funnelLead.valor_estimado)
                    : "R$ --"}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Cadência de Contato */}
      {leadId && (
        <div className="mt-3 pt-3 border-t border-[#e9edef]">
          <CadenciaIndicator leadId={leadId} />
        </div>
      )}
    </div>
  );
}
