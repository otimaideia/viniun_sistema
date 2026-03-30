import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Plus,
  LayoutDashboard,
  Settings,
  Copy,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
  Star,
  GripVertical,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";

function DynamicIcon({ iconName, className, style }: { iconName?: string; className?: string; style?: React.CSSProperties }) {
  if (!iconName) return <LayoutDashboard className={className} style={style} />;
  const Icon = (LucideIcons as any)[iconName] || LayoutDashboard;
  return <Icon className={className} style={style} />;
}

function WidgetTypeBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    kpi: "bg-blue-100 text-blue-800",
    chart: "bg-purple-100 text-purple-800",
    table: "bg-green-100 text-green-800",
    list: "bg-orange-100 text-orange-800",
    calendar: "bg-pink-100 text-pink-800",
    map: "bg-teal-100 text-teal-800",
    custom: "bg-gray-100 text-gray-800",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[tipo] || colors.custom}`}>
      {tipo}
    </Badge>
  );
}

export default function DashboardProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tenant, accessLevel } = useTenantContext();

  // Load profile
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery({
    queryKey: ["mt-dashboard-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_dashboard_profiles" as any)
        .select("*")
        .eq("id", id!)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Load boards
  const { data: boards = [], isLoading: isLoadingBoards } = useQuery({
    queryKey: ["mt-dashboard-boards", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt_dashboard_boards" as any)
        .select("*")
        .eq("profile_id", id!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  // Load widgets for all boards
  const boardIds = boards.map((b: any) => b.id);
  const { data: widgets = [] } = useQuery({
    queryKey: ["mt-dashboard-board-widgets", boardIds],
    queryFn: async () => {
      if (boardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("mt_dashboard_board_widgets" as any)
        .select("*")
        .in("board_id", boardIds)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: boardIds.length > 0,
  });

  // Duplicate board
  const duplicateBoard = useMutation({
    mutationFn: async (board: any) => {
      const { id: _id, created_at, updated_at, ...rest } = board;
      const { data, error } = await supabase
        .from("mt_dashboard_boards" as any)
        .insert({
          ...rest,
          nome: `${board.nome} (cópia)`,
          codigo: `${board.codigo}_copy_${Date.now()}`,
          ordem: (board.ordem || 0) + 1,
        })
        .select()
        .single();
      if (error) throw error;

      // Duplicate widgets for this board
      const boardWidgets = widgets.filter((w: any) => w.board_id === board.id);
      if (boardWidgets.length > 0) {
        const newWidgets = boardWidgets.map((w: any) => {
          const { id: _wid, created_at: _ca, updated_at: _ua, ...wRest } = w;
          return { ...wRest, board_id: (data as any).id };
        });
        await supabase.from("mt_dashboard_board_widgets" as any).insert(newWidgets);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-boards", id] });
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-board-widgets"] });
      toast.success("Board duplicado com sucesso");
    },
    onError: (err: any) => toast.error(`Erro ao duplicar: ${err.message}`),
  });

  // Delete board
  const deleteBoard = useMutation({
    mutationFn: async (boardId: string) => {
      // Delete widgets first
      await supabase
        .from("mt_dashboard_board_widgets" as any)
        .delete()
        .eq("board_id", boardId);
      const { error } = await supabase
        .from("mt_dashboard_boards" as any)
        .delete()
        .eq("id", boardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-boards", id] });
      queryClient.invalidateQueries({ queryKey: ["mt-dashboard-board-widgets"] });
      toast.success("Board excluído com sucesso");
    },
    onError: (err: any) => toast.error(`Erro ao excluir: ${err.message}`),
  });

  // Group widgets by board
  const widgetsByBoard = widgets.reduce((acc: Record<string, any[]>, w: any) => {
    if (!acc[w.board_id]) acc[w.board_id] = [];
    acc[w.board_id].push(w);
    return acc;
  }, {});

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Perfil de dashboard não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/configuracoes/dashboard-profiles")}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes/dashboard-profiles")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: (profile.cor || "#6366f1") + "20" }}
          >
            <DynamicIcon
              iconName={profile.icone}
              className="h-6 w-6"
              style={{ color: profile.cor || "#6366f1" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{profile.nome}</h1>
            {profile.descricao && (
              <p className="text-muted-foreground">{profile.descricao}</p>
            )}
          </div>
        </div>
        <Button asChild>
          <Link to={`/configuracoes/dashboard-profiles/${id}/editar`}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Código</p>
              <code className="mt-1 bg-muted px-2 py-0.5 rounded text-sm">{profile.codigo}</code>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cor</p>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-6 w-6 rounded border"
                  style={{ backgroundColor: profile.cor || "#6366f1" }}
                />
                <code className="text-sm">{profile.cor || "—"}</code>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ordem</p>
              <p className="mt-1 flex items-center gap-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                {profile.ordem ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1 flex items-center gap-2">
                {profile.is_active ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inativo
                  </Badge>
                )}
                {profile.is_default && (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Star className="h-3 w-3 mr-1" />
                    Padrão
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Roles */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Roles (Níveis de Acesso)</p>
            <div className="flex flex-wrap gap-2">
              {profile.role_codigos && profile.role_codigos.length > 0 ? (
                profile.role_codigos.map((role: string) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Nenhuma role vinculada (todos os níveis)</span>
              )}
            </div>
          </div>

          {/* Cargos */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Cargos</p>
            <div className="flex flex-wrap gap-2">
              {profile.cargos && profile.cargos.length > 0 ? (
                profile.cargos.map((cargo: string) => (
                  <Badge key={cargo} variant="secondary">
                    {cargo}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Nenhum cargo vinculado (todos os cargos)</span>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Criado em {new Date(profile.created_at).toLocaleDateString("pt-BR")}
            </div>
            {profile.updated_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Atualizado em {new Date(profile.updated_at).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Boards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Boards</h2>
            <p className="text-sm text-muted-foreground">
              {boards.length} board(s) configurado(s) neste perfil
            </p>
          </div>
          <Button asChild>
            <Link to={`/configuracoes/dashboard-profiles/${id}/boards/novo`}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Board
            </Link>
          </Button>
        </div>

        {isLoadingBoards ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : boards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum board configurado ainda</p>
              <Button variant="outline" asChild>
                <Link to={`/configuracoes/dashboard-profiles/${id}/boards/novo`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro board
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {boards.map((board: any) => {
              const boardWidgets = widgetsByBoard[board.id] || [];
              return (
                <Card key={board.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (board.cor || "#6366f1") + "20" }}
                        >
                          <DynamicIcon
                            iconName={board.icone}
                            className="h-5 w-5"
                            style={{ color: board.cor || "#6366f1" }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">{board.nome}</CardTitle>
                          {board.descricao && (
                            <CardDescription className="text-xs mt-0.5">
                              {board.descricao}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!board.is_active && (
                          <Badge variant="secondary" className="text-xs">Inativo</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {boardWidgets.length} widget{boardWidgets.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Widget mini-preview */}
                    {boardWidgets.length > 0 ? (
                      <div className="space-y-1.5">
                        {boardWidgets.slice(0, 5).map((w: any) => (
                          <div
                            key={w.id}
                            className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/50 text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <DynamicIcon
                                iconName={w.icone}
                                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                              />
                              <span className="truncate">{w.nome}</span>
                            </div>
                            <WidgetTypeBadge tipo={w.tipo} />
                          </div>
                        ))}
                        {boardWidgets.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            + {boardWidgets.length - 5} widget(s) a mais
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Nenhum widget configurado
                      </p>
                    )}

                    <Separator />

                    {/* Board actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="default" size="sm" asChild>
                        <Link to={`/configuracoes/dashboard-profiles/${id}/boards/${board.id}`}>
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          Configurar Widgets
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/configuracoes/dashboard-profiles/${id}/boards/${board.id}/editar`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateBoard.mutate(board)}
                        disabled={duplicateBoard.isPending}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Duplicar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir board "{board.nome}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação excluirá o board e todos os seus {boardWidgets.length} widget(s).
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteBoard.mutate(board.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
