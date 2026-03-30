import { useState, useRef, useEffect, useCallback } from "react";
import { Pencil, Loader2, Search, User, FileText } from "lucide-react";
import { useLeadsMT } from "@/hooks/useLeadsMT";
import { useResponsibleUsers } from "@/hooks/useResponsibleUsers";
import { supabase } from "@/integrations/supabase/client";
import type { MTLead, LeadTemperatura } from "@/types/lead-mt";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const GENERO_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
] as const;

const TEMPERATURA_CONFIG: Record<
  LeadTemperatura,
  { label: string; bg: string; text: string; ring: string }
> = {
  quente: {
    label: "Quente",
    bg: "bg-red-100",
    text: "text-red-600",
    ring: "ring-red-400",
  },
  morno: {
    label: "Morno",
    bg: "bg-amber-100",
    text: "text-amber-600",
    ring: "ring-amber-400",
  },
  frio: {
    label: "Frio",
    bg: "bg-blue-100",
    text: "text-blue-600",
    ring: "ring-blue-400",
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeadInfoCardProps {
  leadId: string;
  lead?: MTLead | null;
  isLoading?: boolean;
  conversationId?: string | null;
}

// ---------------------------------------------------------------------------
// ViaCEP Types & Helper
// ---------------------------------------------------------------------------

interface ViaCEPResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

async function fetchViaCEP(cep: string): Promise<ViaCEPResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data: ViaCEPResult = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Skeleton displayed while loading */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-1.5">
          <div className="h-3 w-16 rounded bg-[#f0f2f5] animate-pulse" />
          <div className="h-4 w-28 rounded bg-[#f0f2f5] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** Inline-editable text/email field */
function EditableField({
  label,
  value,
  fieldName,
  type = "text",
  isEditing,
  isSaving,
  onStartEdit,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  fieldName: string;
  type?: "text" | "email";
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onSave: (field: string, val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    if (!isEditing) {
      setDraft(value ?? "");
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) {
      onSave(fieldName, trimmed);
    } else {
      onStartEdit();
    }
  }, [draft, value, fieldName, onSave, onStartEdit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setDraft(value ?? "");
      onStartEdit();
    }
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f0f2f5] last:border-0 group">
      <span className="text-xs text-[#667781] w-24 flex-shrink-0">{label}</span>

      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 justify-end">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="text-sm text-right border border-[#00a884] rounded px-2 py-0.5 outline-none focus:ring-1 ring-[#00a884]/30 w-full max-w-[180px] bg-white"
          />
          {isSaving && <Loader2 className="h-3 w-3 text-[#00a884] animate-spin flex-shrink-0" />}
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          className="flex items-center gap-1.5 flex-1 justify-end text-right min-w-0 hover:bg-[#f0f2f5]/60 rounded px-1 -mx-1 transition-colors"
        >
          <span className="text-sm text-[#111b21] truncate">
            {value || <span className="text-[#8696a0] italic">-</span>}
          </span>
          <Pencil className="h-3 w-3 text-[#8696a0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      )}
    </div>
  );
}

/** Inline-editable select field */
function EditableSelect({
  label,
  value,
  fieldName,
  options,
  isEditing,
  isSaving,
  onStartEdit,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  fieldName: string;
  options: ReadonlyArray<{ value: string; label: string }> | ReadonlyArray<string>;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onSave: (field: string, val: string) => void;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing) {
      selectRef.current?.focus();
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    if (newVal !== (value ?? "")) {
      onSave(fieldName, newVal);
    } else {
      onStartEdit();
    }
  };

  const displayLabel = (() => {
    if (!value) return null;
    const opt = options[0];
    if (typeof opt === "string") return value;
    return (options as ReadonlyArray<{ value: string; label: string }>).find(
      (o) => o.value === value
    )?.label ?? value;
  })();

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f0f2f5] last:border-0 group">
      <span className="text-xs text-[#667781] w-24 flex-shrink-0">{label}</span>

      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 justify-end">
          <select
            ref={selectRef}
            value={value ?? ""}
            onChange={handleChange}
            onBlur={() => onStartEdit()}
            disabled={isSaving}
            className="text-sm text-right border border-[#00a884] rounded px-2 py-0.5 outline-none focus:ring-1 ring-[#00a884]/30 bg-white max-w-[180px] cursor-pointer"
          >
            <option value="">-</option>
            {options.map((opt) => {
              const val = typeof opt === "string" ? opt : opt.value;
              const lbl = typeof opt === "string" ? opt : opt.label;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
          {isSaving && <Loader2 className="h-3 w-3 text-[#00a884] animate-spin flex-shrink-0" />}
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          className="flex items-center gap-1.5 flex-1 justify-end text-right min-w-0 hover:bg-[#f0f2f5]/60 rounded px-1 -mx-1 transition-colors"
        >
          <span className="text-sm text-[#111b21] truncate">
            {displayLabel || <span className="text-[#8696a0] italic">-</span>}
          </span>
          <Pencil className="h-3 w-3 text-[#8696a0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      )}
    </div>
  );
}

/** Read-only phone display row */
function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f0f2f5] last:border-0">
      <span className="text-xs text-[#667781] w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-[#111b21] font-mono">{value}</span>
    </div>
  );
}

/** Temperatura badge row -- always visible, clickable */
function TemperaturaRow({
  current,
  isSaving,
  onSelect,
}: {
  current: LeadTemperatura | undefined;
  isSaving: boolean;
  onSelect: (temp: LeadTemperatura) => void;
}) {
  const temps: LeadTemperatura[] = ["quente", "morno", "frio"];

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[#667781] w-24 flex-shrink-0">Temperatura</span>
      <div className="flex items-center gap-1.5">
        {temps.map((temp) => {
          const cfg = TEMPERATURA_CONFIG[temp];
          const isActive = current === temp;
          return (
            <button
              key={temp}
              type="button"
              disabled={isSaving}
              onClick={() => onSelect(temp)}
              className={`
                rounded-full px-3 py-1 text-xs font-medium cursor-pointer
                transition-all duration-150
                ${cfg.bg} ${cfg.text}
                ${isActive ? `ring-2 ${cfg.ring}` : "opacity-60 hover:opacity-90"}
                ${isSaving ? "pointer-events-none" : ""}
              `}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** CEP field with ViaCEP auto-fill */
function CEPField({
  value,
  isEditing,
  isSaving,
  isLookingUp,
  onStartEdit,
  onSave,
}: {
  value: string | null | undefined;
  isEditing: boolean;
  isSaving: boolean;
  isLookingUp: boolean;
  onStartEdit: () => void;
  onSave: (cep: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    if (!isEditing) setDraft(value ?? "");
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed !== (value ?? "")) {
      onSave(trimmed);
    } else {
      onStartEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setDraft(value ?? ""); onStartEdit(); }
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f0f2f5] last:border-0 group">
      <span className="text-xs text-[#667781] w-24 flex-shrink-0">CEP</span>

      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 justify-end">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            placeholder="00000-000"
            className="text-sm text-right border border-[#00a884] rounded px-2 py-0.5 outline-none focus:ring-1 ring-[#00a884]/30 w-full max-w-[180px] bg-white"
          />
          {(isSaving || isLookingUp) && (
            <Loader2 className="h-3 w-3 text-[#00a884] animate-spin flex-shrink-0" />
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          className="flex items-center gap-1.5 flex-1 justify-end text-right min-w-0 hover:bg-[#f0f2f5]/60 rounded px-1 -mx-1 transition-colors"
        >
          <span className="text-sm text-[#111b21] truncate">
            {value || <span className="text-[#8696a0] italic">-</span>}
          </span>
          {isLookingUp ? (
            <Search className="h-3 w-3 text-[#00a884] animate-pulse flex-shrink-0" />
          ) : (
            <Pencil className="h-3 w-3 text-[#8696a0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}

/** Read-only info row (for auto-filled address fields) */
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#f0f2f5] last:border-0">
      <span className="text-xs text-[#667781] w-24 flex-shrink-0">{label}</span>
      <span className="text-xs text-[#111b21] truncate">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LeadInfoCard({ leadId, lead, isLoading, conversationId }: LeadInfoCardProps) {
  const { updateLead } = useLeadsMT();
  const { users } = useResponsibleUsers();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isLookingUpCEP, setIsLookingUpCEP] = useState(false);
  const [editingResponsavel, setEditingResponsavel] = useState(false);

  const toggleEdit = useCallback(
    (field: string) => {
      setEditingField((prev) => (prev === field ? null : field));
    },
    []
  );

  const handleSave = useCallback(
    (field: string, value: string) => {
      setEditingField(null);
      updateLead.mutate({ id: leadId, [field]: value || null });

      // Sync nome/sobrenome change to conversation contact_name
      if (conversationId && (field === 'nome' || field === 'sobrenome')) {
        const nome = field === 'nome' ? (value || '') : (lead?.nome || '');
        const sobrenome = field === 'sobrenome' ? (value || '') : (lead?.sobrenome || '');
        const fullName = [nome, sobrenome].filter(Boolean).join(' ').trim();
        if (fullName) {
          supabase
            .from('mt_whatsapp_conversations')
            .update({ contact_name: fullName, updated_at: new Date().toISOString() })
            .eq('id', conversationId)
            .then(({ error }) => {
              if (error) console.error('[LeadInfo] Erro ao atualizar nome na conversa:', error);
            });
        }
      }
    },
    [leadId, conversationId, lead?.nome, lead?.sobrenome, updateLead]
  );

  // CEP save with ViaCEP auto-fill
  const handleCEPSave = useCallback(
    async (cep: string) => {
      setEditingField(null);

      if (!cep) {
        updateLead.mutate({ id: leadId, cep: null });
        return;
      }

      setIsLookingUpCEP(true);
      const viaCepResult = await fetchViaCEP(cep);
      setIsLookingUpCEP(false);

      if (viaCepResult) {
        // Auto-fill all address fields from ViaCEP (use null, not undefined, so Supabase updates the fields)
        updateLead.mutate(
          {
            id: leadId,
            cep: viaCepResult.cep,
            endereco: viaCepResult.logradouro || null,
            bairro: viaCepResult.bairro || null,
            cidade: viaCepResult.localidade || null,
            estado: viaCepResult.uf || null,
            pais: "Brasil",
          },
          {
            onSuccess: () => {
              toast.success("Endereco preenchido automaticamente via CEP");
            },
          }
        );
      } else {
        // CEP not found - just save the raw CEP
        updateLead.mutate({ id: leadId, cep });
        toast.error("CEP nao encontrado. Preencha o endereco manualmente.");
      }
    },
    [leadId, updateLead]
  );

  const handleTemperatura = useCallback(
    (temp: LeadTemperatura) => {
      if (temp === lead?.temperatura) return;
      updateLead.mutate({ id: leadId, temperatura: temp });
    },
    [leadId, lead?.temperatura, updateLead]
  );

  const handleMarcarCurriculo = useCallback(() => {
    if (lead?.status === 'curriculo') return;
    updateLead.mutate(
      { id: leadId, status: 'curriculo' as any },
      {
        onSuccess: () => {
          toast.success("Marcado como Currículo");
        },
      }
    );
  }, [leadId, lead?.status, updateLead]);

  const handleDesmarcarCurriculo = useCallback(() => {
    updateLead.mutate(
      { id: leadId, status: 'novo' as any },
      {
        onSuccess: () => {
          toast.success("Removido marcação de Currículo");
        },
      }
    );
  }, [leadId, updateLead]);

  const handleResponsavel = useCallback(
    (userId: string) => {
      setEditingResponsavel(false);
      updateLead.mutate({ id: leadId, atribuido_para: userId || null });
    },
    [leadId, updateLead]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!lead) {
    return (
      <p className="text-xs text-[#8696a0] text-center py-2">
        Dados do lead indisponiveis.
      </p>
    );
  }

  const isSaving = updateLead.isPending;

  const responsavelAtual = (lead as any).responsavel as { id: string; nome?: string; email?: string } | null | undefined;
  const responsavelNome = responsavelAtual?.nome || responsavelAtual?.email?.split("@")[0] || null;

  return (
    <div className="space-y-0">
      {/* Nome */}
      <EditableField
        label="Nome"
        value={lead.nome}
        fieldName="nome"
        isEditing={editingField === "nome"}
        isSaving={isSaving}
        onStartEdit={() => toggleEdit("nome")}
        onSave={handleSave}
      />

      {/* Sobrenome */}
      <EditableField
        label="Sobrenome"
        value={lead.sobrenome}
        fieldName="sobrenome"
        isEditing={editingField === "sobrenome"}
        isSaving={isSaving}
        onStartEdit={() => toggleEdit("sobrenome")}
        onSave={handleSave}
      />

      {/* Email */}
      <EditableField
        label="Email"
        value={lead.email}
        fieldName="email"
        type="email"
        isEditing={editingField === "email"}
        isSaving={isSaving}
        onStartEdit={() => toggleEdit("email")}
        onSave={handleSave}
      />

      {/* Telefone (readonly) */}
      <ReadOnlyField
        label="Telefone"
        value={formatPhone(lead.telefone || lead.whatsapp)}
      />

      {/* Genero */}
      <EditableSelect
        label="Genero"
        value={lead.genero}
        fieldName="genero"
        options={GENERO_OPTIONS}
        isEditing={editingField === "genero"}
        isSaving={isSaving}
        onStartEdit={() => toggleEdit("genero")}
        onSave={handleSave}
      />

      {/* Temperatura */}
      <TemperaturaRow
        current={lead.temperatura}
        isSaving={isSaving}
        onSelect={handleTemperatura}
      />

      {/* Marcar como Currículo */}
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs text-[#667781] w-24 flex-shrink-0">Tipo</span>
        {lead.status === 'curriculo' ? (
          <button
            type="button"
            onClick={handleDesmarcarCurriculo}
            disabled={isSaving}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-teal-100 text-teal-700 ring-1 ring-teal-300 transition-all hover:bg-teal-200 disabled:opacity-50"
          >
            <FileText className="h-3 w-3" />
            Currículo
            <span className="text-[9px] ml-0.5 text-teal-500">x</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleMarcarCurriculo}
            disabled={isSaving}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[#667781] border border-[#e9edef] transition-all hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 disabled:opacity-50"
          >
            <FileText className="h-3 w-3" />
            Currículo
          </button>
        )}
      </div>

      {/* Separator: Endereco */}
      <div className="pt-2 pb-1">
        <span className="text-[10px] font-semibold text-[#8696a0] uppercase tracking-wider">
          Endereço
        </span>
      </div>

      {/* CEP with auto-fill */}
      <CEPField
        value={lead.cep}
        isEditing={editingField === "cep"}
        isSaving={isSaving}
        isLookingUp={isLookingUpCEP}
        onStartEdit={() => toggleEdit("cep")}
        onSave={handleCEPSave}
      />

      {/* Bairro */}
      <EditableField
        label="Bairro"
        value={lead.bairro}
        fieldName="bairro"
        isEditing={editingField === "bairro"}
        isSaving={isSaving}
        onStartEdit={() => toggleEdit("bairro")}
        onSave={handleSave}
      />

      {/* Cidade */}
      <EditableField
        label="Cidade"
        value={lead.cidade}
        fieldName="cidade"
        isEditing={editingField === "cidade"}
        isSaving={isSaving}
        onStartEdit={() => toggleEdit("cidade")}
        onSave={handleSave}
      />

      {/* Separator: Responsável */}
      <div className="pt-3 pb-1">
        <span className="text-[10px] font-semibold text-[#8696a0] uppercase tracking-wider">
          Responsável
        </span>
      </div>

      {/* Responsável selector */}
      <div className="flex items-center justify-between py-1.5 border-b border-[#f0f2f5] last:border-0 group">
        <span className="text-xs text-[#667781] w-24 flex-shrink-0 flex items-center gap-1">
          <User className="h-3 w-3" />
          Atribuído a
        </span>

        {editingResponsavel ? (
          <div className="flex items-center gap-1 flex-1 justify-end">
            <select
              autoFocus
              value={lead.atribuido_para ?? ""}
              onChange={(e) => handleResponsavel(e.target.value)}
              onBlur={() => setEditingResponsavel(false)}
              disabled={isSaving}
              className="text-sm text-right border border-[#00a884] rounded px-2 py-0.5 outline-none focus:ring-1 ring-[#00a884]/30 bg-white max-w-[180px] cursor-pointer"
            >
              <option value="">— sem responsável —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {isSaving && <Loader2 className="h-3 w-3 text-[#00a884] animate-spin flex-shrink-0" />}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingResponsavel(true)}
            className="flex items-center gap-1.5 flex-1 justify-end text-right min-w-0 hover:bg-[#f0f2f5]/60 rounded px-1 -mx-1 transition-colors"
          >
            <span className="text-sm text-[#111b21] truncate">
              {responsavelNome || <span className="text-[#8696a0] italic">Nenhum</span>}
            </span>
            <Pencil className="h-3 w-3 text-[#8696a0] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
