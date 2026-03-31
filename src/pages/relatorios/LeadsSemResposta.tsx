import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Search, ArrowLeft, MessageCircle, Clock,
  Phone, User, Calendar, ExternalLink, ChevronDown, ChevronUp,
  Filter, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversaSemResposta {
  conversation_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  chat_id: string | null;
  session_id: string | null;
  msgs_cliente: number;
  primeira_msg: string;
  ultima_msg: string;
}

interface MensagemPreview {
  msg_id: string;
  msg_body: string | null;
  msg_timestamp: string;
  msg_tipo: string;
}

type FilterType = "todas" | "hoje" | "7dias" | "30dias";
type SortType = "recente" | "antiga" | "mais_msgs";

export default function LeadsSemResposta() {
  const { tenant } = useTenantContext();
  const [search, setSearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<FilterType>("todas");
  const [sortBy, setSortBy] = useState<SortType>("recente");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Query conversations without response via RPC
  const { data: conversas, isLoading, error } = useQuery({
    queryKey: ["leads-sem-resposta", tenant?.id],
    queryFn: async () => {
      if (!tenant) return [];

      const { data, error: rpcError } = await supabase
        .rpc("get_conversations_without_response", { p_tenant_id: tenant.id });

      if (rpcError) throw rpcError;
      return (data || []) as ConversaSemResposta[];
    },
    enabled: !!tenant,
    staleTime: 5 * 60 * 1000,
  });

  // Query messages for expanded conversation (lazy load)
  const { data: expandedMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["conv-messages-preview", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];

      const { data, error: rpcError } = await supabase
        .rpc("get_conversation_messages_preview", {
          p_conversation_id: expandedId,
          p_limit: 10,
        });

      if (rpcError) throw rpcError;
      return (data || []) as MensagemPreview[];
    },
    enabled: !!expandedId,
    staleTime: 60 * 1000,
  });

  // Apply filters and sorting
  const filtered = useMemo(() => {
    if (!conversas) return [];

    let result = [...conversas];

    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.contact_name?.toLowerCase().includes(s) ||
          c.contact_phone?.includes(s)
      );
    }

    // Period filter
    const now = new Date();
    if (filterPeriod === "hoje") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter((c) => new Date(c.ultima_msg) >= today);
    } else if (filterPeriod === "7dias") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter((c) => new Date(c.ultima_msg) >= weekAgo);
    } else if (filterPeriod === "30dias") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter((c) => new Date(c.ultima_msg) >= monthAgo);
    }

    // Sort
    if (sortBy === "recente") {
      result.sort((a, b) => new Date(b.ultima_msg).getTime() - new Date(a.ultima_msg).getTime());
    } else if (sortBy === "antiga") {
      result.sort((a, b) => new Date(a.primeira_msg).getTime() - new Date(b.primeira_msg).getTime());
    } else if (sortBy === "mais_msgs") {
      result.sort((a, b) => b.msgs_cliente - a.msgs_cliente);
    }

    return result;
  }, [conversas, search, filterPeriod, sortBy]);

  // Pagination
  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    if (!conversas) return { total: 0, hoje: 0, semana: 0, totalMsgs: 0 };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: conversas.length,
      hoje: conversas.filter((c) => new Date(c.ultima_msg) >= today).length,
      semana: conversas.filter((c) => new Date(c.ultima_msg) >= weekAgo).length,
      totalMsgs: conversas.reduce((sum, c) => sum + Number(c.msgs_cliente), 0),
    };
  }, [conversas]);

  // Export to CSV
  const exportCSV = () => {
    if (!filtered.length) return;
    const rows = [
      ["Nome", "Telefone", "Msgs do Cliente", "Primeira Msg", "Última Msg"],
      ...filtered.map((c) => [
        c.contact_name || "Sem nome",
        c.contact_phone || "Sem telefone",
        String(c.msgs_cliente),
        c.primeira_msg ? format(new Date(c.primeira_msg), "dd/MM/yyyy HH:mm") : "",
        c.ultima_msg ? format(new Date(c.ultima_msg), "dd/MM/yyyy HH:mm") : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-sem-resposta-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return "Sem telefone";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 13) {
      return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 12) {
      return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
    }
    return phone;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <p className="text-lg font-medium">Erro ao carregar dados</p>
            <p className="text-muted-foreground text-sm mt-1">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/relatorios/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              Leads Sem Resposta
            </h1>
            <p className="text-muted-foreground text-sm">
              Conversas onde o cliente mandou mensagem e a empresa nunca respondeu
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filtered.length}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Total sem resposta</p>
            <p className="text-3xl font-bold text-red-600">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Hoje</p>
            <p className="text-3xl font-bold">{stats.hoje}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
            <p className="text-3xl font-bold">{stats.semana}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Msgs sem resposta</p>
            <p className="text-3xl font-bold text-amber-600">{stats.totalMsgs}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-10"
              />
            </div>
            <Select value={filterPeriod} onValueChange={(v) => { setFilterPeriod(v as FilterType); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortType); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recente">Mais recente</SelectItem>
                <SelectItem value="antiga">Mais antiga</SelectItem>
                <SelectItem value="mais_msgs">Mais mensagens</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Mostrando {filtered.length} conversa{filtered.length !== 1 ? "s" : ""} sem resposta
            {search && ` (filtro: "${search}")`}
          </p>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <div className="space-y-2">
        {paginated.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
              <p className="text-muted-foreground text-sm">
                {search ? "Tente outro termo de busca" : "Não há conversas sem resposta neste período"}
              </p>
            </CardContent>
          </Card>
        )}

        {paginated.map((conv) => {
          const isExpanded = expandedId === conv.conversation_id;
          const timeAgo = conv.ultima_msg
            ? formatDistanceToNow(new Date(conv.ultima_msg), { addSuffix: true, locale: ptBR })
            : "";

          return (
            <Card
              key={conv.conversation_id}
              className={`transition-all cursor-pointer hover:shadow-md ${
                isExpanded ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setExpandedId(isExpanded ? null : conv.conversation_id)}
            >
              <CardContent className="py-3 px-4">
                {/* Collapsed row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {conv.contact_name || "Sem nome"}
                        </p>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          SEM RESPOSTA
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhone(conv.contact_phone)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {conv.msgs_cliente} msg{Number(conv.msgs_cliente) !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {conv.session_id && (
                      <Link
                        to={`/whatsapp/conversas/${conv.session_id}?chat=${conv.conversation_id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50 hidden sm:flex">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Abrir Chat
                        </Button>
                      </Link>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded: show messages (lazy loaded) */}
                {isExpanded && (
                  <div className="mt-4 ml-0 sm:ml-[52px] space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Primeira mensagem: {conv.primeira_msg ? format(new Date(conv.primeira_msg), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
                      </span>
                    </div>

                    <div className="bg-muted/20 rounded-lg p-3 space-y-2 max-h-80 overflow-y-auto">
                      {isLoadingMessages ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-12 w-3/4" />
                          ))}
                        </div>
                      ) : expandedMessages && expandedMessages.length > 0 ? (
                        expandedMessages.map((msg) => (
                          <div key={msg.msg_id} className="flex justify-start">
                            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 border shadow-sm">
                              <p className="whitespace-pre-wrap text-sm">
                                {msg.msg_body || `[${msg.msg_tipo}]`}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                {msg.msg_timestamp
                                  ? format(new Date(msg.msg_timestamp), "dd/MM HH:mm")
                                  : ""}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Sem mensagens de texto (pode ser mídia)
                        </p>
                      )}
                    </div>

                    {Number(conv.msgs_cliente) > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Mostrando 10 de {conv.msgs_cliente} mensagens
                      </p>
                    )}

                    <div className="flex gap-2 mt-3 flex-wrap">
                      {conv.session_id && (
                        <Link
                          to={`/whatsapp/conversas/${conv.session_id}?chat=${conv.conversation_id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Abrir Conversa no Sistema
                          </Button>
                        </Link>
                      )}
                      {conv.contact_phone && (
                        <a
                          href={`https://wa.me/${conv.contact_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            WhatsApp Externo
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
