import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, MessageCircle, Phone, FileText, ExternalLink, Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface CurriculoLead {
  id: string;
  nome: string;
  sobrenome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  franchise?: {
    id: string;
    nome_fantasia: string | null;
  } | null;
  // Dados extras para ver se tem conversa vinculada
  mensagem_curriculo?: string | null;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatPhone(phone: string | null): string {
  if (!phone) return "-";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 13) return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  return phone;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`;
  return `${Math.floor(days / 30)}m atrás`;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function WhatsAppCurriculosTab() {
  const navigate = useNavigate();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  // Query leads with status 'curriculo'
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["mt-leads-curriculo", tenant?.id, franchise?.id],
    queryFn: async () => {
      let q = supabase
        .from("mt_leads")
        .select("id, nome, sobrenome, telefone, whatsapp, email, cidade, status, created_at, updated_at, franchise:mt_franchises(id, nome_fantasia)")
        .eq("status", "curriculo")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (tenant?.id) q = q.eq("tenant_id", tenant.id);
      if (franchise?.id && accessLevel === "franchise") q = q.eq("franchise_id", franchise.id);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CurriculoLead[];
    },
    enabled: !!tenant || accessLevel === "platform",
    staleTime: 1000 * 60 * 2,
  });

  // Get conversations linked to these leads for "Abrir Chat" functionality
  const leadIds = useMemo(() => leads.map(l => l.id), [leads]);

  const { data: leadConversations = [] } = useQuery({
    queryKey: ["mt-curriculo-conversations", leadIds.slice(0, 100)],
    queryFn: async () => {
      if (leadIds.length === 0) return [];
      const { data } = await supabase
        .from("mt_whatsapp_conversations")
        .select("id, lead_id, session_id")
        .in("lead_id", leadIds.slice(0, 200))
        .order("last_message_at", { ascending: false });
      return (data || []) as { id: string; lead_id: string; session_id: string }[];
    },
    enabled: leadIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Map lead_id -> first conversation
  const convByLead = useMemo(() => {
    const map = new Map<string, { id: string; session_id: string }>();
    leadConversations.forEach(c => {
      if (!map.has(c.lead_id)) map.set(c.lead_id, { id: c.id, session_id: c.session_id });
    });
    return map;
  }, [leadConversations]);

  // Also get the original curriculum messages for context

  const { data: curriculoMessages = [] } = useQuery({
    queryKey: ["mt-curriculo-messages", leadIds.slice(0, 50)],
    queryFn: async () => {
      if (leadIds.length === 0) return [];

      // Get the first curriculum-related message per conversation linked to these leads
      const { data, error } = await supabase
        .from("mt_whatsapp_conversations")
        .select("lead_id, id")
        .in("lead_id", leadIds.slice(0, 100))
        .order("last_message_at", { ascending: false });

      if (error || !data) return [];

      const convIds = data.map(c => c.id);
      if (convIds.length === 0) return [];

      const { data: msgs } = await supabase
        .from("mt_whatsapp_messages")
        .select("conversation_id, body")
        .in("conversation_id", convIds.slice(0, 100))
        .eq("from_me", false)
        .or("body.ilike.%curriculo%,body.ilike.%currículo%,body.ilike.%vaga%,body.ilike.%contratando%")
        .order("created_at", { ascending: true })
        .limit(200);

      // Map conversation_id -> lead_id
      const convToLead = new Map(data.map(c => [c.id, c.lead_id]));

      // Group by lead_id, keep first message
      const leadMessages = new Map<string, string>();
      (msgs || []).forEach(m => {
        const lid = convToLead.get(m.conversation_id);
        if (lid && !leadMessages.has(lid)) {
          leadMessages.set(lid, m.body?.substring(0, 150) || "");
        }
      });

      return Array.from(leadMessages.entries()).map(([leadId, msg]) => ({
        lead_id: leadId,
        mensagem: msg,
      }));
    },
    enabled: leadIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Create message lookup
  const messageByLead = useMemo(() => {
    const map = new Map<string, string>();
    curriculoMessages.forEach(m => map.set(m.lead_id, m.mensagem));
    return map;
  }, [curriculoMessages]);

  // Filter
  const filtered = useMemo(() => {
    let list = leads;

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(l =>
        l.nome.toLowerCase().includes(term) ||
        (l.sobrenome || "").toLowerCase().includes(term) ||
        (l.telefone || "").includes(term) ||
        (l.whatsapp || "").includes(term) ||
        (l.email || "").toLowerCase().includes(term) ||
        (l.cidade || "").toLowerCase().includes(term)
      );
    }

    // Period filter
    if (filterPeriod !== "all") {
      const now = Date.now();
      const days = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : filterPeriod === "90d" ? 90 : 0;
      if (days > 0) {
        const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
        list = list.filter(l => l.created_at >= cutoff);
      }
    }

    return list;
  }, [leads, searchTerm, filterPeriod]);

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    const today = leads.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;
    const week = leads.filter(l => now - new Date(l.created_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    const month = leads.filter(l => now - new Date(l.created_at).getTime() < 30 * 24 * 60 * 60 * 1000).length;
    return { total: leads.length, today, week, month };
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold text-teal-600">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Currículos</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          <div className="text-xs text-muted-foreground">Hoje</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-purple-600">{stats.week}</div>
          <div className="text-xs text-muted-foreground">Últimos 7 dias</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-orange-600">{stats.month}</div>
          <div className="text-xs text-muted-foreground">Últimos 30 dias</div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-teal-600" />
              Currículos via WhatsApp
              <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>

              {/* Period filter */}
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum currículo encontrado para esta busca" : "Nenhum currículo recebido via WhatsApp"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Recebido</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => {
                    const fullName = [lead.nome, lead.sobrenome].filter(Boolean).join(" ");
                    const phone = lead.whatsapp || lead.telefone;
                    const msg = messageByLead.get(lead.id);

                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                              {fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{fullName}</p>
                              {lead.email && (
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{lead.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {phone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {formatPhone(phone)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{lead.cidade || "-"}</span>
                        </TableCell>
                        <TableCell>
                          {msg ? (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={msg}>
                              {msg}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span title={formatDate(lead.created_at)}>{timeAgo(lead.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {(lead.franchise as any)?.nome_fantasia || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {convByLead.has(lead.id) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const conv = convByLead.get(lead.id)!;
                                  navigate(`/whatsapp/conversas/${conv.session_id}?chat=${conv.id}`);
                                }}
                                className="p-1 rounded hover:bg-teal-50"
                                title="Abrir chat no WhatsApp"
                              >
                                <MessageCircle className="h-4 w-4 text-teal-600" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/leads/${lead.id}`);
                              }}
                              className="p-1 rounded hover:bg-muted"
                              title="Ver lead"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
