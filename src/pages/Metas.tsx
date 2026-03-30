import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useMetasAdapter, isTipoAutoCalculavel } from "@/hooks/useMetasAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Meta,
  MetaFormData,
  MetaVinculacao,
  MetaStatus,
  MetaPeriodo,
  MetaUnidade,
  META_TIPOS,
  META_CATEGORIAS,
  META_PERIODOS,
  META_UNIDADES,
  getMetaTipoConfig,
  getMetaCategoria,
  getMetaUnidadeConfig,
  formatMetaValor,
  getMetaTiposAgrupados,
} from "@/types/meta";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  DollarSign,
  Calendar,
  UserPlus,
  Banknote,
  Percent,
  Layers,
  RefreshCw,
  CheckCircle,
  UserCheck,
  UserX,
  Activity,
  BarChart3,
  FileText,
  Share2,
  PieChart,
  CircleDollarSign,
  Image,
  Heart,
  Send,
  MessageCircle,
  Timer,
  Bot,
  Briefcase,
  ArrowDownRight,
  Building2,
  Package,
  GraduationCap,
  UsersRound,
  Star,
  AlertTriangle,
  ClipboardCheck,
  Wallet,
  AlertCircle,
  Megaphone,
  MessageSquare,
  Filter,
  Zap,
  Loader2,
  RotateCw,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// =============================================================================
// Icon Map - mapeia string do icon para componente Lucide
// =============================================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Users,
  DollarSign, Calendar, UserPlus, Banknote, Percent, Layers, RefreshCw,
  CheckCircle, UserCheck, UserX, Activity, BarChart3, FileText, Share2,
  PieChart, CircleDollarSign, Image, Heart, Send, MessageCircle, Timer,
  Bot, Briefcase, ArrowDownRight, Building2, Package, GraduationCap,
  UsersRound, Star, AlertTriangle, ClipboardCheck, Wallet, AlertCircle,
  Megaphone, MessageSquare,
};

function MetaIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = name ? ICON_MAP[name] : null;
  if (!Icon) return <Target className={className} />;
  return <Icon className={className} />;
}

// =============================================================================
// Status helpers
// =============================================================================

const getStatusBadge = (status: MetaStatus) => {
  switch (status) {
    case "atingida":
      return <Badge className="bg-green-600 text-white">Atingida</Badge>;
    case "proxima":
      return <Badge className="bg-blue-600 text-white">Quase lá</Badge>;
    case "expirada":
      return <Badge variant="destructive">Expirada</Badge>;
    default:
      return <Badge variant="secondary">Em Andamento</Badge>;
  }
};

// =============================================================================
// Ritmo - calcula se a meta está adiantada, no ritmo ou atrasada
// =============================================================================

type Ritmo = 'sem_dados' | 'adiantado' | 'no_ritmo' | 'atrasado';

function calcularRitmo(meta: Meta): { ritmo: Ritmo; percentualTempo: number; velocidadeDiaria: number } {
  const diasTotal = Math.max(1, differenceInDays(new Date(meta.data_fim), new Date(meta.data_inicio)));
  const diasPassados = Math.max(0, differenceInDays(new Date(), new Date(meta.data_inicio)));
  const percentualTempo = Math.round((diasPassados / diasTotal) * 100);
  const percentualMeta = meta.percentual || 0;
  const velocidadeDiaria = diasPassados > 0 ? meta.valor_atual / diasPassados : 0;

  let ritmo: Ritmo = 'sem_dados';
  if (diasPassados === 0) {
    ritmo = 'sem_dados';
  } else if (percentualMeta >= percentualTempo) {
    ritmo = 'adiantado';
  } else if (percentualMeta >= percentualTempo * 0.7) {
    ritmo = 'no_ritmo';
  } else {
    ritmo = 'atrasado';
  }

  return { ritmo, percentualTempo, velocidadeDiaria };
}

const RITMO_CONFIG: Record<Ritmo, { label: string; icon: typeof TrendingUp; cor: string }> = {
  sem_dados: { label: 'Sem dados', icon: Clock, cor: 'text-muted-foreground' },
  adiantado: { label: 'Adiantado', icon: TrendingUp, cor: 'text-green-600' },
  no_ritmo: { label: 'No ritmo', icon: Activity, cor: 'text-blue-600' },
  atrasado: { label: 'Atrasado', icon: TrendingDown, cor: 'text-amber-600' },
};

// =============================================================================
// Componente Principal
// =============================================================================

const Metas = () => {
  const { franqueados } = useFranqueadosAdapter();
  const { isAdmin, profile } = useUserProfileAdapter();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const [franqueadoFilter, setFranqueadoFilter] = useState<string>("all");
  const [vinculacao, setVinculacao] = useState<MetaVinculacao>('empresa');

  // Query: Departamentos do tenant (inclui globais sem tenant_id)
  const { data: departments = [] } = useQuery({
    queryKey: ['mt-departments-metas', tenant?.id, franchise?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_departments')
        .select('id, nome, codigo')
        .eq('is_active', true)
        .order('nome');
      if (tenant?.id) q = q.or(`tenant_id.eq.${tenant.id},tenant_id.is.null`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query: Equipes do tenant/franchise
  const { data: teams = [] } = useQuery({
    queryKey: ['mt-teams-metas', tenant?.id, franchise?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_teams')
        .select('id, nome, codigo, franchise_id')
        .eq('is_active', true)
        .order('nome');
      if (tenant?.id) q = q.eq('tenant_id', tenant.id);
      if (accessLevel === 'franchise' && franchise?.id) q = q.eq('franchise_id', franchise.id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Query: Usuários do tenant/franchise
  const { data: users = [] } = useQuery({
    queryKey: ['mt-users-metas', tenant?.id, franchise?.id],
    queryFn: async () => {
      let q = supabase
        .from('mt_users')
        .select('id, nome, email, franchise_id')
        .eq('is_active', true)
        .order('nome');
      if (tenant?.id) q = q.eq('tenant_id', tenant.id);
      if (accessLevel === 'franchise' && franchise?.id) q = q.eq('franchise_id', franchise.id);
      const { data } = await q;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const franqueadoId = isAdmin
    ? (franqueadoFilter === "all" ? undefined : franqueadoFilter)
    : profile?.franqueado_id || undefined;

  const {
    metas,
    isLoading,
    error,
    refetch,
    stats,
    createMeta,
    updateMeta,
    deleteMeta,
    atualizarProgresso,
    recalcularMetas,
    recalcularMeta,
    isRecalculating,
    isCreating,
    isUpdating,
  } = useMetasAdapter(franqueadoId);

  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [progressModal, setProgressModal] = useState<Meta | null>(null);
  const [newProgress, setNewProgress] = useState("");

  // Form state
  const defaultFormData: MetaFormData = {
    titulo: "",
    tipo: "leads",
    valor_meta: 0,
    data_inicio: format(new Date(), "yyyy-MM-dd"),
    data_fim: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    franqueado_id: undefined,
    department_id: undefined,
    team_id: undefined,
    assigned_to: undefined,
    descricao: "",
    periodo: "mensal",
    meta_unidade: "unidades",
  };
  const [formData, setFormData] = useState<MetaFormData>(defaultFormData);

  // Tipos agrupados para o select do form
  const tiposAgrupados = useMemo(() => getMetaTiposAgrupados(), []);

  // Tipo selecionado no form (para auto-preencher unidade)
  const tipoSelecionado = useMemo(
    () => getMetaTipoConfig(formData.tipo),
    [formData.tipo]
  );

  // ==========================================================================
  // Filtros
  // ==========================================================================

  const filteredMetas = useMemo(() => {
    return metas.filter((m) => {
      const matchesSearch = m.titulo.toLowerCase().includes(search.toLowerCase());
      const matchesCategoria = (() => {
        if (categoriaFilter === "all") return true;
        const cat = getMetaCategoria(m.tipo);
        return cat?.value === categoriaFilter;
      })();
      return matchesSearch && matchesCategoria;
    });
  }, [metas, search, categoriaFilter]);

  // Contar metas por categoria (para os badges do filtro)
  const contadorCategorias = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of metas) {
      const cat = getMetaCategoria(m.tipo);
      const key = cat?.value || 'custom';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [metas]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleNew = () => {
    setEditingMeta(null);
    setVinculacao('empresa');
    setFormData({
      ...defaultFormData,
      franqueado_id: isAdmin ? undefined : profile?.franqueado_id || undefined,
    });
    setModalOpen(true);
  };

  const handleEdit = (meta: Meta) => {
    setEditingMeta(meta);
    // Detectar tipo de vinculação existente
    if (meta.assigned_to) setVinculacao('pessoa');
    else if (meta.team_id) setVinculacao('equipe');
    else if (meta.department_id) setVinculacao('departamento');
    else setVinculacao('empresa');

    setFormData({
      titulo: meta.titulo,
      tipo: meta.tipo,
      valor_meta: meta.valor_meta,
      data_inicio: meta.data_inicio,
      data_fim: meta.data_fim,
      franqueado_id: meta.franqueado_id || undefined,
      department_id: meta.department_id || undefined,
      team_id: meta.team_id || undefined,
      assigned_to: meta.assigned_to || undefined,
      descricao: meta.descricao || "",
      periodo: (meta.periodo as MetaPeriodo) || "mensal",
      meta_unidade: (meta.meta_unidade as MetaUnidade) || "unidades",
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.titulo.trim() || formData.valor_meta <= 0) return;

    if (formData.data_fim < formData.data_inicio) {
      toast.error('A data de fim não pode ser anterior à data de início');
      return;
    }

    if (editingMeta) {
      updateMeta({ id: editingMeta.id, ...formData });
    } else {
      createMeta(formData);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMeta(deleteId);
      setDeleteId(null);
    }
  };

  const handleUpdateProgress = () => {
    if (progressModal && newProgress) {
      atualizarProgresso({ id: progressModal.id, novoValor: Number(newProgress) });
      setProgressModal(null);
      setNewProgress("");
    }
  };

  const handleTipoChange = (tipo: string) => {
    const config = getMetaTipoConfig(tipo);
    setFormData({
      ...formData,
      tipo,
      meta_unidade: config?.unidade_padrao || formData.meta_unidade,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-xl sm:text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Atingidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.atingidas}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.em_andamento}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Progresso Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-xl sm:text-2xl font-bold">{stats.progresso_medio}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Metas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Defina e acompanhe metas para qualquer área do negócio
            </p>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => recalcularMetas()}
                    size="sm"
                    variant="outline"
                    disabled={isRecalculating}
                  >
                    {isRecalculating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCw className="h-4 w-4" />
                    )}
                    <span className="ml-1 hidden sm:inline">
                      {isRecalculating ? "Calculando..." : "Recalcular"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Forçar recálculo de todas as metas (triggers atualizam automaticamente)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={handleNew} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Franchise Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar metas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdmin && (
              <Select value={franqueadoFilter} onValueChange={setFranqueadoFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Franquia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as franquias</SelectItem>
                  {franqueados.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoriaFilter("all")}
              aria-pressed={categoriaFilter === "all"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoriaFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Filter className="h-3 w-3" />
              Todas ({metas.length})
            </button>
            {META_CATEGORIAS.filter(c => c.value !== 'custom').map((cat) => {
              const count = contadorCategorias[cat.value] || 0;
              if (count === 0 && categoriaFilter !== cat.value) return null;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoriaFilter(cat.value === categoriaFilter ? "all" : cat.value)}
                  aria-pressed={categoriaFilter === cat.value}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    categoriaFilter === cat.value
                      ? `${cat.cor} text-white`
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <MetaIcon name={cat.icon} className="h-3 w-3" />
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Metas Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-70" />
            <p className="text-lg font-medium text-destructive">Erro ao carregar metas</p>
            <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              <RotateCw className="h-4 w-4 mr-1" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : filteredMetas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma meta encontrada</p>
            <p className="text-sm mt-1">Crie metas para qualquer área: vendas, marketing, operação, RH...</p>
            <Button variant="outline" className="mt-4" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-1" />
              Criar primeira meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetas.map((meta) => {
            const diasRestantes = differenceInDays(new Date(meta.data_fim), new Date());
            const tipoConfig = getMetaTipoConfig(meta.tipo);
            const categoriaConfig = getMetaCategoria(meta.tipo);
            const unidadeConfig = getMetaUnidadeConfig(meta.meta_unidade);
            const isAuto = isTipoAutoCalculavel(meta.tipo);
            const { ritmo, percentualTempo, velocidadeDiaria } = isAuto && meta.status !== 'atingida' && meta.status !== 'expirada'
              ? calcularRitmo(meta)
              : { ritmo: 'sem_dados' as Ritmo, percentualTempo: 0, velocidadeDiaria: 0 };
            const ritmoInfo = RITMO_CONFIG[ritmo];
            const RitmoIcon = ritmoInfo.icon;

            return (
              <Card key={meta.id} className="relative overflow-hidden">
                {/* Barra colorida no topo */}
                <div className={`h-1 ${categoriaConfig?.cor || 'bg-gray-400'}`} />

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${categoriaConfig?.cor || 'bg-gray-600'} text-white`}>
                        <MetaIcon name={tipoConfig?.icon} className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          {categoriaConfig?.label || 'Custom'}
                        </span>
                        <Badge variant="outline" className="text-[10px] w-fit mt-0.5">
                          {tipoConfig?.label || meta.tipo}
                        </Badge>
                      </div>
                    </div>
                    {getStatusBadge(meta.status || "em_andamento")}
                  </div>
                  <CardTitle className="text-sm sm:text-base mt-2 leading-tight">{meta.titulo}</CardTitle>
                  {meta.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{meta.descricao}</p>
                  )}
                  {/* Vinculação */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {meta.franqueado_nome && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {meta.franqueado_nome}
                      </span>
                    )}
                    {meta.department_nome && (
                      <span className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
                        <Layers className="h-3 w-3" />
                        {meta.department_nome}
                      </span>
                    )}
                    {meta.team_nome && (
                      <span className="text-xs text-purple-600 flex items-center gap-1 bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded">
                        <UsersRound className="h-3 w-3" />
                        {meta.team_nome}
                      </span>
                    )}
                    {meta.assigned_to_nome && (
                      <span className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                        <UserCheck className="h-3 w-3" />
                        {meta.assigned_to_nome}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">
                        {formatMetaValor(meta.valor_atual, meta.meta_unidade)} / {formatMetaValor(meta.valor_meta, meta.meta_unidade)}
                      </span>
                    </div>
                    <Progress value={Math.min(meta.percentual || 0, 100)} className="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className={`font-medium ${
                        (meta.percentual || 0) >= 100 ? 'text-green-600' :
                        (meta.percentual || 0) >= 80 ? 'text-blue-600' : 'text-muted-foreground'
                      }`}>
                        {meta.percentual || 0}%
                      </span>
                      <span className={diasRestantes < 0 ? "text-destructive" : diasRestantes <= 7 ? "text-amber-600" : "text-muted-foreground"}>
                        {diasRestantes < 0
                          ? `Expirou há ${Math.abs(diasRestantes)}d`
                          : diasRestantes === 0
                            ? "Expira hoje"
                            : `${diasRestantes}d restantes`}
                      </span>
                    </div>
                  </div>

                  {/* Ritmo indicator (auto-calculable goals only) */}
                  {isAuto && meta.status !== 'atingida' && meta.status !== 'expirada' && ritmo !== 'sem_dados' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2.5 py-1.5">
                            <span className={`flex items-center gap-1 font-medium ${ritmoInfo.cor}`}>
                              <RitmoIcon className="h-3 w-3" />
                              {ritmoInfo.label}
                            </span>
                            <span className="text-muted-foreground">
                              {percentualTempo}% do tempo | {(meta.percentual || 0)}% da meta
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Velocidade: {velocidadeDiaria.toFixed(1)}/dia</p>
                          {velocidadeDiaria > 0 && meta.valor_meta > meta.valor_atual && (
                            <p>Previsão: ~{Math.min(999, Math.ceil((meta.valor_meta - meta.valor_atual) / velocidadeDiaria))}d para atingir</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Info row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(meta.data_inicio), "dd/MM/yy", { locale: ptBR })} - {format(new Date(meta.data_fim), "dd/MM/yy", { locale: ptBR })}
                    </span>
                    {meta.periodo && meta.periodo !== 'custom' && (
                      <Badge variant="outline" className="text-[10px]">
                        {META_PERIODOS.find(p => p.value === meta.periodo)?.label || meta.periodo}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    {isAuto && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                              <Zap className="h-3 w-3" />
                              Auto
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Atualiza automaticamente via triggers quando dados mudam no sistema</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <div className="flex gap-1 ml-auto">
                      {isAuto ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => recalcularMeta(meta.id)}
                        >
                          <RotateCw className="h-3.5 w-3.5 mr-1" />
                          Recalcular
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProgressModal(meta);
                            setNewProgress(String(meta.valor_atual));
                          }}
                        >
                          Atualizar
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar meta"
                        onClick={() => handleEdit(meta)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        aria-label="Excluir meta"
                        onClick={() => setDeleteId(meta.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* Form Modal - Criar/Editar Meta                                     */}
      {/* ================================================================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeta ? "Editar Meta" : "Nova Meta"}
            </DialogTitle>
            <DialogDescription>
              Escolha a área, defina o tipo e o valor da meta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* TIPO - Select agrupado por categoria */}
            <div className="space-y-2">
              <Label>Tipo de Meta *</Label>
              <Select value={formData.tipo} onValueChange={handleTipoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de meta">
                    {tipoSelecionado && (
                      <span className="flex items-center gap-2">
                        <MetaIcon name={tipoSelecionado.icon} className="h-4 w-4" />
                        {tipoSelecionado.label}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[350px]">
                  {META_CATEGORIAS.map((cat) => {
                    const tipos = tiposAgrupados[cat.value];
                    if (!tipos || tipos.length === 0) return null;
                    return (
                      <SelectGroup key={cat.value}>
                        <SelectLabel className="flex items-center gap-2 text-xs uppercase tracking-wider">
                          <MetaIcon name={cat.icon} className="h-3.5 w-3.5" />
                          {cat.label}
                        </SelectLabel>
                        {tipos.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            <span className="flex items-center gap-2">
                              <MetaIcon name={tipo.icon} className="h-4 w-4 text-muted-foreground" />
                              {tipo.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
              {tipoSelecionado?.descricao_hint && (
                <p className="text-xs text-muted-foreground">{tipoSelecionado.descricao_hint}</p>
              )}
              {isTipoAutoCalculavel(formData.tipo) && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-md">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-medium">Auto-calculável</span>
                  <span className="text-emerald-600/70">- O valor será calculado automaticamente dos dados reais do sistema</span>
                </div>
              )}
            </div>

            {/* TÍTULO */}
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder={`Ex: ${tipoSelecionado?.label || 'Meta'} - ${
                  META_PERIODOS.find(p => p.value === formData.periodo)?.label || 'Mensal'
                }`}
              />
            </div>

            {/* VALOR META + UNIDADE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_meta">Valor da Meta *</Label>
                <div className="relative">
                  {formData.meta_unidade === 'reais' && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  )}
                  <Input
                    id="valor_meta"
                    type="number"
                    min={0}
                    step={formData.meta_unidade === 'reais' ? '0.01' : '1'}
                    value={formData.valor_meta || ""}
                    onChange={(e) => setFormData({ ...formData, valor_meta: Number(e.target.value) })}
                    placeholder="100"
                    className={formData.meta_unidade === 'reais' ? 'pl-9' : ''}
                  />
                  {formData.meta_unidade === 'percentual' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={formData.meta_unidade || "unidades"}
                  onValueChange={(value: MetaUnidade) => setFormData({ ...formData, meta_unidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {META_UNIDADES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* PERÍODO + DATAS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={formData.periodo || "mensal"}
                  onValueChange={(value: MetaPeriodo) => setFormData({ ...formData, periodo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {META_PERIODOS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Início *</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Fim *</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                />
              </div>
            </div>

            {/* DESCRIÇÃO */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ""}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o objetivo desta meta..."
                rows={2}
              />
            </div>

            {/* ── VINCULAÇÃO MULTI-NÍVEL ────────────────── */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <Label className="text-sm font-semibold">Vincular meta a</Label>
              <div className="flex flex-wrap gap-2">
                {([
                  { value: 'empresa', label: 'Unidade', icon: Building2 },
                  { value: 'departamento', label: 'Departamento', icon: Layers },
                  { value: 'equipe', label: 'Equipe', icon: UsersRound },
                  { value: 'pessoa', label: 'Pessoa', icon: UserCheck },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setVinculacao(value);
                      // Limpar campos não relevantes
                      if (value === 'empresa') {
                        setFormData({ ...formData, department_id: undefined, team_id: undefined, assigned_to: undefined });
                      } else if (value === 'departamento') {
                        setFormData({ ...formData, team_id: undefined, assigned_to: undefined });
                      } else if (value === 'equipe') {
                        setFormData({ ...formData, department_id: undefined, assigned_to: undefined });
                      } else if (value === 'pessoa') {
                        setFormData({ ...formData, department_id: undefined, team_id: undefined });
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      vinculacao === value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:bg-muted border-border"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Franquia - sempre visível para admin */}
              {isAdmin && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Unidade / Franquia</Label>
                  <Select
                    value={formData.franqueado_id || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, franqueado_id: value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas (Meta Global)</SelectItem>
                      {franqueados.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Departamento */}
              {vinculacao === 'departamento' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Departamento</Label>
                  <Select
                    value={formData.department_id || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department_id: value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    O cálculo automático contará dados dos membros deste departamento
                  </p>
                </div>
              )}

              {/* Equipe */}
              {vinculacao === 'equipe' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Equipe</Label>
                  <Select
                    value={formData.team_id || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, team_id: value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione a equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    O cálculo automático contará dados dos membros desta equipe
                  </p>
                </div>
              )}

              {/* Pessoa */}
              {vinculacao === 'pessoa' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Funcionário(a)</Label>
                  <Select
                    value={formData.assigned_to || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, assigned_to: value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione a pessoa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    O cálculo automático contará apenas dados desta pessoa
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.titulo.trim() || formData.valor_meta <= 0 || isCreating || isUpdating}
            >
              {isCreating || isUpdating ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Update Modal */}
      <Dialog open={!!progressModal} onOpenChange={() => setProgressModal(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Atualizar Progresso</DialogTitle>
            <DialogDescription>
              {progressModal?.titulo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newProgress">Novo Valor</Label>
              <div className="relative">
                {progressModal?.meta_unidade === 'reais' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                )}
                <Input
                  id="newProgress"
                  type="number"
                  min={0}
                  value={newProgress}
                  onChange={(e) => setNewProgress(e.target.value)}
                  className={progressModal?.meta_unidade === 'reais' ? 'pl-9' : ''}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Meta: {formatMetaValor(progressModal?.valor_meta || 0, progressModal?.meta_unidade)}
              </p>
            </div>
            {progressModal && newProgress && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <Progress
                  value={Math.min((Number(newProgress) / progressModal.valor_meta) * 100, 100)}
                  className="h-2"
                />
                <p className="text-xs text-center font-medium">
                  {Math.round((Number(newProgress) / progressModal.valor_meta) * 100)}%
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateProgress}
              disabled={!newProgress}
            >
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? O histórico de progresso também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Metas;
