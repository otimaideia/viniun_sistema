import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  ArrowLeft,
  ChevronRight,
  Edit,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  LayoutDashboard,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ALLOWED_DATA_SOURCES,
  type WidgetTipo,
  type WidgetSubtipo,
  type MTDashboardBoard,
  type MTDashboardProfile,
  type MTDashboardBoardWidget,
} from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WIDGET_TIPOS: { value: WidgetTipo; label: string }[] = [
  { value: "kpi", label: "KPI" },
  { value: "chart", label: "Chart" },
  { value: "funnel", label: "Funnel" },
  { value: "table", label: "Table" },
  { value: "list", label: "List" },
  { value: "calendar", label: "Calendar" },
  { value: "progress", label: "Progress" },
];

const WIDGET_SUBTIPOS: { value: WidgetSubtipo; label: string }[] = [
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
  { value: "area", label: "Area" },
  { value: "donut", label: "Donut" },
  { value: "stacked", label: "Stacked" },
];

const EMPTY_WIDGET: Omit<MTDashboardBoardWidget, "id" | "tenant_id" | "board_id" | "created_at" | "updated_at"> = {
  widget_key: "",
  nome: "",
  descricao: "",
  tipo: "kpi",
  subtipo: undefined,
  posicao_x: 0,
  posicao_y: 0,
  largura: 3,
  altura: 1,
  data_source: "mt_leads",
  query_config: {},
  icone: "",
  cor: "",
  config: {},
  is_active: true,
  ordem: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardBoardConfig() {
  const { profileId, boardId } = useParams<{ profileId: string; boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, accessLevel } = useTenantContext();

  // Board inline edit state
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [boardForm, setBoardForm] = useState<{
    nome: string;
    icone: string;
    cor: string;
    descricao: string;
    is_default: boolean;
    ordem: number;
  }>({ nome: "", icone: "", cor: "", descricao: "", is_default: false, ordem: 0 });

  // Widget dialog state
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<MTDashboardBoardWidget | null>(null);
  const [widgetForm, setWidgetForm] = useState(EMPTY_WIDGET);
  const [queryConfigJson, setQueryConfigJson] = useState("{}");
  const [visualConfigJson, setVisualConfigJson] = useState("{}");

  // Delete dialog state
  const [deleteWidgetId, setDeleteWidgetId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["mt-dashboard-profile", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_dashboard_profiles")
        .select("*")
        .eq("id", profileId!)
        .single();
      if (error) throw error;
      return data as MTDashboardProfile;
    },
    enabled: !!profileId,
  });

  const { data: board, isLoading: loadingBoard } = useQuery({
    queryKey: ["mt-dashboard-board", boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_dashboard_boards")
        .select("*")
        .eq("id", boardId!)
        .single();
      if (error) throw error;
      return data as MTDashboardBoard;
    },
    enabled: !!boardId,
  });

  const { data: widgets = [], isLoading: loadingWidgets } = useQuery({
    queryKey: ["mt-dashboard-board-widgets", boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_dashboard_board_widgets")
        .select("*")
        .eq("board_id", boardId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as MTDashboardBoardWidget[];
    },
    enabled: !!boardId,
  });

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const updateBoard = useMutation({
    mutationFn: async (updates: Partial<MTDashboardBoard>) => {
      const { data, error } = await supabase
        .from("mt_dashboard_boards")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", boardId!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-board", boardId] });
      toast.success("Board atualizado com sucesso");
      setIsEditingBoard(false);
    },
    onError: (err: Error) => toast.error(`Erro ao atualizar board: ${err.message}`),
  });

  const createWidget = useMutation({
    mutationFn: async (widget: typeof EMPTY_WIDGET) => {
      const { data, error } = await supabase
        .from("mt_dashboard_board_widgets")
        .insert({
          ...widget,
          board_id: boardId!,
          tenant_id: tenant?.id ?? board?.tenant_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-board-widgets", boardId] });
      toast.success("Widget criado com sucesso");
      closeWidgetDialog();
    },
    onError: (err: Error) => toast.error(`Erro ao criar widget: ${err.message}`),
  });

  const updateWidget = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MTDashboardBoardWidget> & { id: string }) => {
      const { data, error } = await supabase
        .from("mt_dashboard_board_widgets")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-board-widgets", boardId] });
      toast.success("Widget atualizado com sucesso");
      closeWidgetDialog();
    },
    onError: (err: Error) => toast.error(`Erro ao atualizar widget: ${err.message}`),
  });

  const deleteWidget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mt_dashboard_board_widgets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-board-widgets", boardId] });
      toast.success("Widget removido com sucesso");
      setDeleteWidgetId(null);
    },
    onError: (err: Error) => toast.error(`Erro ao remover widget: ${err.message}`),
  });

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (board) {
      setBoardForm({
        nome: board.nome,
        icone: board.icone ?? "",
        cor: board.cor ?? "",
        descricao: board.descricao ?? "",
        is_default: board.is_default,
        ordem: board.ordem,
      });
    }
  }, [board]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function openCreateDialog() {
    setEditingWidget(null);
    const nextOrdem = widgets.length > 0 ? Math.max(...widgets.map((w) => w.ordem)) + 1 : 0;
    setWidgetForm({ ...EMPTY_WIDGET, ordem: nextOrdem });
    setQueryConfigJson("{}");
    setVisualConfigJson("{}");
    setWidgetDialogOpen(true);
  }

  function openEditDialog(widget: MTDashboardBoardWidget) {
    setEditingWidget(widget);
    setWidgetForm({
      widget_key: widget.widget_key,
      nome: widget.nome,
      descricao: widget.descricao ?? "",
      tipo: widget.tipo,
      subtipo: widget.subtipo,
      posicao_x: widget.posicao_x,
      posicao_y: widget.posicao_y,
      largura: widget.largura,
      altura: widget.altura,
      data_source: widget.data_source,
      query_config: widget.query_config,
      icone: widget.icone ?? "",
      cor: widget.cor ?? "",
      config: widget.config,
      is_active: widget.is_active,
      ordem: widget.ordem,
    });
    setQueryConfigJson(JSON.stringify(widget.query_config ?? {}, null, 2));
    setVisualConfigJson(JSON.stringify(widget.config ?? {}, null, 2));
    setWidgetDialogOpen(true);
  }

  function closeWidgetDialog() {
    setWidgetDialogOpen(false);
    setEditingWidget(null);
    setWidgetForm(EMPTY_WIDGET);
    setQueryConfigJson("{}");
    setVisualConfigJson("{}");
  }

  function handleSaveWidget() {
    if (!widgetForm.widget_key.trim()) {
      toast.error("Widget Key e obrigatoria");
      return;
    }
    if (!widgetForm.nome.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }

    let parsedQuery = {};
    let parsedVisual = {};
    try {
      parsedQuery = JSON.parse(queryConfigJson);
    } catch {
      toast.error("query_config contém JSON inválido");
      return;
    }
    try {
      parsedVisual = JSON.parse(visualConfigJson);
    } catch {
      toast.error("config (visual) contém JSON inválido");
      return;
    }

    const payload = {
      ...widgetForm,
      query_config: parsedQuery,
      config: parsedVisual,
    };

    if (editingWidget) {
      updateWidget.mutate({ id: editingWidget.id, ...payload });
    } else {
      createWidget.mutate(payload);
    }
  }

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------

  const isLoading = loadingProfile || loadingBoard || loadingWidgets;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!board || !profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Board ou perfil nao encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSaving = updateBoard.isPending || createWidget.isPending || updateWidget.isPending;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/configuracoes/dashboard-profiles" className="hover:underline">
          Perfis
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          to={`/configuracoes/dashboard-profiles/${profileId}`}
          className="hover:underline"
        >
          {profile.nome}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{board.nome}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{board.nome}</h1>
            {board.descricao && (
              <p className="text-sm text-muted-foreground">{board.descricao}</p>
            )}
          </div>
        </div>
      </div>

      {/* Board Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Configuracao do Board</CardTitle>
            <CardDescription>Informacoes gerais do board</CardDescription>
          </div>
          {!isEditingBoard ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingBoard(true)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingBoard(false);
                  if (board) {
                    setBoardForm({
                      nome: board.nome,
                      icone: board.icone ?? "",
                      cor: board.cor ?? "",
                      descricao: board.descricao ?? "",
                      is_default: board.is_default,
                      ordem: board.ordem,
                    });
                  }
                }}
              >
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => updateBoard.mutate(boardForm)}
              >
                {updateBoard.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isEditingBoard ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={boardForm.nome}
                  onChange={(e) => setBoardForm((p) => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icone</Label>
                <Input
                  value={boardForm.icone}
                  placeholder="Ex: LayoutDashboard"
                  onChange={(e) => setBoardForm((p) => ({ ...p, icone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <Input
                  value={boardForm.cor}
                  placeholder="Ex: #E91E63"
                  onChange={(e) => setBoardForm((p) => ({ ...p, cor: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descricao</Label>
                <Textarea
                  value={boardForm.descricao}
                  rows={2}
                  onChange={(e) => setBoardForm((p) => ({ ...p, descricao: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={boardForm.ordem}
                  onChange={(e) => setBoardForm((p) => ({ ...p, ordem: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={boardForm.is_default}
                  onCheckedChange={(v) => setBoardForm((p) => ({ ...p, is_default: v }))}
                />
                <Label>Board padrao</Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Icone:</span>{" "}
                <span className="font-medium">{board.icone || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cor:</span>{" "}
                {board.cor ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full border"
                      style={{ backgroundColor: board.cor }}
                    />
                    {board.cor}
                  </span>
                ) : (
                  "—"
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Ordem:</span>{" "}
                <span className="font-medium">{board.ordem}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Padrao:</span>{" "}
                <Badge variant={board.is_default ? "default" : "secondary"}>
                  {board.is_default ? "Sim" : "Nao"}
                </Badge>
              </div>
              {board.descricao && (
                <div className="col-span-full">
                  <span className="text-muted-foreground">Descricao:</span>{" "}
                  <span>{board.descricao}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widgets Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Widgets</CardTitle>
            <CardDescription>{widgets.length} widget(s) configurado(s)</CardDescription>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" /> Novo Widget
          </Button>
        </CardHeader>
        <CardContent>
          {widgets.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum widget configurado neste board.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ordem</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Subtipo</TableHead>
                    <TableHead>Data Source</TableHead>
                    <TableHead className="w-20">Largura</TableHead>
                    <TableHead className="w-20">Altura</TableHead>
                    <TableHead className="w-16">Ativo</TableHead>
                    <TableHead className="w-24 text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {widgets.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                          {w.ordem}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{w.widget_key}</TableCell>
                      <TableCell className="font-medium">{w.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{w.tipo}</Badge>
                      </TableCell>
                      <TableCell>{w.subtipo ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{w.data_source}</TableCell>
                      <TableCell>{w.largura}</TableCell>
                      <TableCell>{w.altura}</TableCell>
                      <TableCell>
                        <Badge variant={w.is_active ? "default" : "secondary"}>
                          {w.is_active ? "Sim" : "Nao"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(w)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteWidgetId(w.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget Create/Edit Dialog */}
      <Dialog open={widgetDialogOpen} onOpenChange={(o) => !o && closeWidgetDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWidget ? "Editar Widget" : "Novo Widget"}</DialogTitle>
            <DialogDescription>
              {editingWidget
                ? "Altere as configuracoes do widget."
                : "Preencha os campos para adicionar um widget ao board."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* widget_key */}
            <div className="space-y-2">
              <Label>Widget Key *</Label>
              <Input
                value={widgetForm.widget_key}
                placeholder="Ex: leads_total"
                onChange={(e) => setWidgetForm((p) => ({ ...p, widget_key: e.target.value }))}
              />
            </div>

            {/* nome */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={widgetForm.nome}
                placeholder="Ex: Total de Leads"
                onChange={(e) => setWidgetForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>

            {/* tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={widgetForm.tipo}
                onValueChange={(v) =>
                  setWidgetForm((p) => ({
                    ...p,
                    tipo: v as WidgetTipo,
                    subtipo: v !== "chart" ? undefined : p.subtipo,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* subtipo (only for chart) */}
            {widgetForm.tipo === "chart" && (
              <div className="space-y-2">
                <Label>Subtipo</Label>
                <Select
                  value={widgetForm.subtipo ?? ""}
                  onValueChange={(v) =>
                    setWidgetForm((p) => ({ ...p, subtipo: v as WidgetSubtipo }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WIDGET_SUBTIPOS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* data_source */}
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Select
                value={widgetForm.data_source}
                onValueChange={(v) => setWidgetForm((p) => ({ ...p, data_source: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ALLOWED_DATA_SOURCES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* icone */}
            <div className="space-y-2">
              <Label>Icone</Label>
              <Input
                value={widgetForm.icone ?? ""}
                placeholder="Ex: TrendingUp"
                onChange={(e) => setWidgetForm((p) => ({ ...p, icone: e.target.value }))}
              />
            </div>

            {/* cor */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input
                value={widgetForm.cor ?? ""}
                placeholder="Ex: #4CAF50"
                onChange={(e) => setWidgetForm((p) => ({ ...p, cor: e.target.value }))}
              />
            </div>

            {/* posicao_x / posicao_y */}
            <div className="space-y-2">
              <Label>Posicao X</Label>
              <Input
                type="number"
                value={widgetForm.posicao_x}
                onChange={(e) =>
                  setWidgetForm((p) => ({ ...p, posicao_x: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Posicao Y</Label>
              <Input
                type="number"
                value={widgetForm.posicao_y}
                onChange={(e) =>
                  setWidgetForm((p) => ({ ...p, posicao_y: parseInt(e.target.value) || 0 }))
                }
              />
            </div>

            {/* largura / altura */}
            <div className="space-y-2">
              <Label>Largura</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={widgetForm.largura}
                onChange={(e) =>
                  setWidgetForm((p) => ({ ...p, largura: parseInt(e.target.value) || 1 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Altura</Label>
              <Input
                type="number"
                min={1}
                max={4}
                value={widgetForm.altura}
                onChange={(e) =>
                  setWidgetForm((p) => ({ ...p, altura: parseInt(e.target.value) || 1 }))
                }
              />
            </div>

            {/* ordem */}
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={widgetForm.ordem}
                onChange={(e) =>
                  setWidgetForm((p) => ({ ...p, ordem: parseInt(e.target.value) || 0 }))
                }
              />
            </div>

            {/* is_active */}
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={widgetForm.is_active}
                onCheckedChange={(v) => setWidgetForm((p) => ({ ...p, is_active: v }))}
              />
              <Label>Ativo</Label>
            </div>

            {/* descricao */}
            <div className="space-y-2 md:col-span-2">
              <Label>Descricao</Label>
              <Textarea
                value={widgetForm.descricao ?? ""}
                rows={2}
                onChange={(e) => setWidgetForm((p) => ({ ...p, descricao: e.target.value }))}
              />
            </div>

            {/* query_config JSON */}
            <div className="space-y-2 md:col-span-2">
              <Label>query_config (JSON)</Label>
              <Textarea
                className="font-mono text-xs"
                value={queryConfigJson}
                rows={4}
                onChange={(e) => setQueryConfigJson(e.target.value)}
              />
            </div>

            {/* config (visual) JSON */}
            <div className="space-y-2 md:col-span-2">
              <Label>config - visual (JSON)</Label>
              <Textarea
                className="font-mono text-xs"
                value={visualConfigJson}
                rows={4}
                onChange={(e) => setVisualConfigJson(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeWidgetDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveWidget}
              disabled={createWidget.isPending || updateWidget.isPending}
            >
              {(createWidget.isPending || updateWidget.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingWidget ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWidgetId} onOpenChange={(o) => !o && setDeleteWidgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover widget?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O widget sera removido permanentemente deste board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteWidgetId && deleteWidget.mutate(deleteWidgetId)}
            >
              {deleteWidget.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
