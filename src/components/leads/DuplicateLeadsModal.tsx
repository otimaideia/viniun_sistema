import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Copy,
  ExternalLink,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG } from "@/types/lead-mt";
import type { ExtendedLead } from "@/hooks/useLeadsAdapter";

// ─── helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  // Remove prefixo 55 (Brasil) se presente e número tiver 12-13 dígitos
  if (digits.length === 13 && digits.startsWith("55")) return digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) return digits.slice(2);
  return digits;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

interface DuplicateGroup {
  key: string;
  tipo: "telefone" | "email";
  valor: string;
  leads: ExtendedLead[];
}

function buildDuplicateGroups(leads: ExtendedLead[]): DuplicateGroup[] {
  const phoneMap = new Map<string, ExtendedLead[]>();
  const emailMap = new Map<string, ExtendedLead[]>();

  for (const lead of leads) {
    const phone = normalizePhone(lead.telefone);
    if (phone) {
      if (!phoneMap.has(phone)) phoneMap.set(phone, []);
      phoneMap.get(phone)!.push(lead);
    }

    const email = normalizeEmail(lead.email);
    if (email) {
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email)!.push(lead);
    }
  }

  const groups: DuplicateGroup[] = [];

  for (const [phone, group] of phoneMap.entries()) {
    if (group.length > 1) {
      groups.push({ key: `tel-${phone}`, tipo: "telefone", valor: phone, leads: group });
    }
  }

  for (const [email, group] of emailMap.entries()) {
    if (group.length > 1) {
      // evitar duplicar grupos que já aparecem no de telefone
      groups.push({ key: `email-${email}`, tipo: "email", valor: email, leads: group });
    }
  }

  // Ordenar por quantidade de duplicados (maior primeiro)
  groups.sort((a, b) => b.leads.length - a.leads.length);

  return groups;
}

// ─── Sub-component: linha de lead ────────────────────────────────────────────

function LeadRow({ lead }: { lead: ExtendedLead }) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[lead.status];

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{lead.nome} {lead.sobrenome || ""}</span>
          {statusCfg && (
            <Badge
              variant="outline"
              className="text-xs shrink-0"
              style={{ color: statusCfg.color, borderColor: statusCfg.color + "40" }}
            >
              {statusCfg.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {lead.telefone && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {lead.telefone}
            </span>
          )}
          {lead.email && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[180px]">
              <Mail className="h-3 w-3 shrink-0" />
              {lead.email}
            </span>
          )}
          {lead.unidade && (
            <span className="text-xs text-muted-foreground">{lead.unidade}</span>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 shrink-0"
        onClick={() => navigate(`/leads/${lead.id}`)}
        title="Abrir lead"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Sub-component: grupo de duplicado ───────────────────────────────────────

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {group.tipo === "telefone" ? (
              <Phone className="h-3.5 w-3.5 text-orange-500" />
            ) : (
              <Mail className="h-3.5 w-3.5 text-blue-500" />
            )}
            <span className="font-mono text-sm font-medium truncate">{group.valor}</span>
            <Badge
              variant="secondary"
              className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
            >
              {group.leads.length} leads
            </Badge>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-border">
          {group.leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DuplicateLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: ExtendedLead[];
}

export function DuplicateLeadsModal({ open, onOpenChange, leads }: DuplicateLeadsModalProps) {
  const groups = useMemo(() => buildDuplicateGroups(leads), [leads]);

  const totalLeads = useMemo(
    () => new Set(groups.flatMap((g) => g.leads.map((l) => l.id))).size,
    [groups]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-orange-500" />
            Análise de Leads Duplicados
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Grupos duplicados</p>
              <p className="font-semibold text-sm text-orange-700 dark:text-orange-400">{groups.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <Copy className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Leads afetados</p>
              <p className="font-semibold text-sm">{totalLeads}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Por telefone</p>
              <p className="font-semibold text-sm">
                {groups.filter((g) => g.tipo === "telefone").length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Por email</p>
              <p className="font-semibold text-sm">
                {groups.filter((g) => g.tipo === "email").length}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de grupos */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-medium text-foreground">Nenhum duplicado encontrado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Todos os {leads.length} leads têm telefone e email únicos.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <DuplicateGroupCard key={group.key} group={group} />
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          A análise considera leads com o mesmo telefone ou mesmo e-mail.
          Clique no ícone <ExternalLink className="h-3 w-3 inline" /> para abrir o lead e fazer as correções necessárias.
        </p>
      </DialogContent>
    </Dialog>
  );
}
