import { useState } from "react";
import { Plus, Loader2, Check, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useWhatsAppLabelsMT,
  useConversationLabelsMT,
  LABEL_COLORS,
} from "@/hooks/multitenant/useWhatsAppLabelsMT";
import { wahaClient } from "@/services/waha/wahaDirectClient";
import { wahaApi } from "@/services/waha-api";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { toast } from "sonner";

// Mapeamento de cores hex do CRM → índice de cor WAHA (0-19)
const HEX_TO_WAHA_COLOR: Record<string, number> = {
  '#EF4444': 11, '#F97316': 12, '#EAB308': 13, '#22C55E': 3,
  '#3B82F6': 4,  '#A855F7': 9,  '#EC4899': 10, '#6B7280': 17,
  '#64c4ff': 5,  '#ffd429': 13, '#ff9485': 11, '#dfaef0': 9,
  '#55ccb3': 1,  '#00a884': 0,
};

function hexToWahaColorIndex(hex: string | null): number {
  if (!hex) return 0;
  return HEX_TO_WAHA_COLOR[hex.toUpperCase()] ?? HEX_TO_WAHA_COLOR[hex] ?? 0;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LabelsCardProps {
  leadId: string;
  conversationId: string | null;
  sessionName?: string | null;
  chatId?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bgWithOpacity(hex: string, opacity = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LabelsCard({ leadId, conversationId, sessionName, chatId }: LabelsCardProps) {
  const { tenant } = useTenantContext();
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    labels: allLabels,
    isLoading: isLabelsLoading,
    createLabel,
    refetch: refetchAllLabels,
  } = useWhatsAppLabelsMT();

  const {
    labels: conversationLabels,
    isLoading: isConvLabelsLoading,
    addLabel,
    removeLabel,
  } = useConversationLabelsMT(conversationId || undefined);

  // State: new label inline form
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[4].value);

  // Derived: set of applied label IDs for fast lookup
  const appliedIds = new Set(conversationLabels.map((l) => l.id));

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleToggleLabel = async (labelId: string) => {
    const label = allLabels.find(l => l.id === labelId);

    try {
      if (appliedIds.has(labelId)) {
        // 1. Remover do banco PRIMEIRO (operação principal)
        await removeLabel.mutateAsync(labelId);
        // 2. Depois sincronizar remoção com WAHA (falha não é crítica)
        if (sessionName && chatId && label?.waha_label_id) {
          await wahaClient.removeChatLabel(sessionName, chatId, label.waha_label_id)
            .catch(err => console.warn('[Labels] WAHA removeChatLabel falhou:', err.message));
        }
      } else {
        // 1. Adicionar no banco PRIMEIRO (operação principal)
        await addLabel.mutateAsync(labelId);
        // 2. Depois sincronizar adição com WAHA (falha não é crítica)
        if (sessionName && chatId && label?.waha_label_id) {
          await wahaClient.addChatLabel(sessionName, chatId, label.waha_label_id)
            .catch(err => console.warn('[Labels] WAHA addChatLabel falhou:', err.message));
        }
      }
    } catch (err) {
      toast.error('Erro ao atualizar etiqueta');
      console.error('[Labels] Erro ao toggle label:', err);
    }
  };

  const handleSyncWahaLabels = async () => {
    if (!sessionName || !tenant?.id) {
      toast.info('Configuração de sessão não disponível para sync.');
      return;
    }
    setIsSyncing(true);
    try {
      const wahaLabels = await wahaApi.getSessionLabels(sessionName);
      if (!wahaLabels?.length) {
        toast.info('Nenhuma label encontrada no WAHA.');
        return;
      }
      for (const wl of wahaLabels) {
        await supabase
          .from('mt_whatsapp_labels')
          .upsert({
            tenant_id: tenant.id,
            name: wl.name,
            color: wl.colorHex || `#${(wl.color || 0).toString(16).padStart(6, '0')}`,
            waha_label_id: wl.id,
            is_active: true,
          }, { onConflict: 'tenant_id,waha_label_id' });
      }
      await refetchAllLabels();
      toast.success(`${wahaLabels.length} label(s) sincronizada(s) do WAHA`);
    } catch (err) {
      console.error('[LabelsCard] Erro ao sincronizar labels do WAHA:', err);
      toast.error('Erro ao sincronizar labels do WAHA');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateLabel = () => {
    const trimmed = newLabelName.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      toast.error('Nome de etiqueta deve ter no máximo 50 caracteres');
      return;
    }

    createLabel.mutate(
      { name: trimmed, color: newLabelColor },
      {
        onSuccess: async (created) => {
          // Tentar criar label no WAHA e salvar o ID retornado
          if (sessionName) {
            try {
              const wahaResult = await wahaClient.createLabel(
                sessionName,
                trimmed,
                hexToWahaColorIndex(newLabelColor)
              );
              if (wahaResult.success && wahaResult.data?.id) {
                // Salvar waha_label_id no registro criado
                await supabase
                  .from('mt_whatsapp_labels')
                  .update({ waha_label_id: String(wahaResult.data.id) })
                  .eq('id', created.id);

                // Aplicar label na conversa via WAHA
                if (conversationId && chatId) {
                  await wahaClient.addChatLabel(sessionName, chatId, String(wahaResult.data.id))
                    .catch(err => console.warn('[Labels] Erro ao aplicar label no WAHA:', err));
                }
              }
            } catch (err) {
              console.warn('[Labels] Erro ao criar label no WAHA (label criada só no CRM):', err);
            }
          }

          if (conversationId) {
            addLabel.mutate(created.id);
          }
          setNewLabelName("");
          setNewLabelColor(LABEL_COLORS[4].value);
          setIsCreating(false);
        },
      }
    );
  };

  const handleNewLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateLabel();
    }
    if (e.key === "Escape") {
      setIsCreating(false);
      setNewLabelName("");
    }
  };

  // ---------------------------------------------------------------------------
  // No conversation
  // ---------------------------------------------------------------------------

  if (!conversationId) {
    return (
      <p className="text-xs text-[#8696a0] text-center py-2">
        Selecione uma conversa para gerenciar etiquetas.
      </p>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (isLabelsLoading || isConvLabelsLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-4 w-4 text-[#00a884] animate-spin" />
        <span className="text-xs text-[#8696a0]">Carregando etiquetas...</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — all labels as toggle chips
  // ---------------------------------------------------------------------------

  const isBusy = addLabel.isPending || removeLabel.isPending;

  return (
    <div className="space-y-3">
      {/* All labels as toggle chips */}
      {allLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {allLabels.map((label) => {
            const isApplied = appliedIds.has(label.id);
            const color = label.color || "#6B7280";

            return (
              <button
                key={label.id}
                type="button"
                onClick={() => handleToggleLabel(label.id)}
                disabled={isBusy}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:opacity-60 cursor-pointer border"
                style={
                  isApplied
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
                {isApplied && <Check className="h-3 w-3" />}
                {label.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[#8696a0] italic">
          Nenhuma etiqueta cadastrada.
        </p>
      )}

      {/* Inline create new label */}
      {isCreating ? (
        <div className="space-y-2 rounded-lg bg-[#f0f2f5] p-2.5">
          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            onKeyDown={handleNewLabelKeyDown}
            placeholder="Nome da etiqueta"
            className="h-7 text-xs"
            autoFocus
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            {LABEL_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => setNewLabelColor(c.value)}
                className={`w-5 h-5 rounded-full transition-all ${
                  newLabelColor === c.value
                    ? "ring-2 ring-offset-1 scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-6 text-[10px] bg-[#00a884] hover:bg-[#00a884]/90 text-white flex-1"
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim() || createLabel.isPending}
            >
              {createLabel.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Criar"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] text-[#667781]"
              onClick={() => {
                setIsCreating(false);
                setNewLabelName("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-1 text-xs text-[#00a884] font-medium hover:text-[#00a884]/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova etiqueta
          </button>
          {sessionName && (
            <button
              type="button"
              onClick={handleSyncWahaLabels}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 text-xs text-[#8696a0] hover:text-[#00a884] transition-colors disabled:opacity-50"
              title="Sincronizar etiquetas do WAHA"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync WAHA
            </button>
          )}
        </div>
      )}
    </div>
  );
}
