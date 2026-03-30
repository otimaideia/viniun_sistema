import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  UserPlus,
  Search,
  Shield,
  Send,
  Settings,
  Trash2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { safeGetInitials } from "@/utils/unicodeSanitizer";

interface UserProfile {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  role: string | null;
}

interface SessionUserPermission {
  id: string;
  user_id: string;
  sessao_id: string;
  can_send: boolean;
  can_manage: boolean;
  created_at: string;
  user?: UserProfile;
}

interface SessionUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessaoId: string;
  sessaoNome: string;
  franqueadoId?: string; // ID da unidade/franquia vinculada à sessão
}

export const SessionUsersModal = ({
  open,
  onOpenChange,
  sessaoId,
  sessaoNome,
  franqueadoId
}: SessionUsersModalProps) => {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);

  // Buscar permissões da sessão
  const { data: permissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ["session-permissions", sessaoId],
    queryFn: async () => {
      // Buscar permissões
      const { data: permissionsData, error: permError } = await supabase
        .from("mt_whatsapp_user_sessions")
        .select("*")
        .eq("whatsapp_session_id", sessaoId);

      if (permError) throw permError;
      if (!permissionsData || permissionsData.length === 0) return [];

      // Buscar perfis dos usuários (user_id armazena mt_users.id)
      const userIds = permissionsData.map(p => p.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("mt_users")
        .select("id, auth_user_id, nome, email, avatar_url, access_level")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Combinar permissões com perfis (mapeando por mt_users.id)
      const profilesMap = new Map(profiles?.map(p => [p.id, { ...p, role: p.access_level }]) || []);
      return permissionsData.map(perm => ({
        ...perm,
        user: profilesMap.get(perm.user_id) || null
      })) as SessionUserPermission[];
    },
    enabled: open && !!sessaoId
  });

  // Buscar usuários disponíveis para adicionar (filtrados pela unidade da sessão + usuários sem unidade)
  const { data: availableUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["available-users", sessaoId, franqueadoId],
    queryFn: async () => {
      // Buscar usuários ativos da mesma unidade/franquia da sessão
      // OU usuários sem franquia (platform_admin/tenant_admin) que podem ter acesso a qualquer sessão
      let query = supabase
        .from("mt_users")
        .select("id, auth_user_id, nome, email, avatar_url, access_level, franchise_id")
        .eq("status", "ativo");

      // Filtrar por franquia se a sessão tiver franchise_id
      // Também incluir usuários sem franchise_id (admins)
      if (franqueadoId) {
        query = query.or(`franchise_id.eq.${franqueadoId},franchise_id.is.null`);
      }

      const { data: users, error } = await query;

      if (error) throw error;

      // Filtrar os que já têm permissão
      const existingUserIds = permissions?.map((p) => p.user_id) || [];
      return users.filter((u) => !existingUserIds.includes(u.id)) as UserProfile[];
    },
    enabled: open && showAddUser && !!permissions
  });

  // Adicionar usuário
  const addUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!tenant?.id) {
        throw new Error("Tenant não identificado");
      }

      const { error } = await supabase
        .from("mt_whatsapp_user_sessions")
        .insert({
          tenant_id: tenant.id, // OBRIGATÓRIO para MT
          user_id: userId,
          whatsapp_session_id: sessaoId,
          can_send: true,
          can_manage: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-permissions", sessaoId] });
      queryClient.invalidateQueries({ queryKey: ["available-users", sessaoId] });
      toast.success("Usuário adicionado com sucesso");
      setShowAddUser(false);
      setSelectedUserId("");
    },
    onError: () => {
      toast.error("Erro ao adicionar usuário");
    }
  });

  // Atualizar permissões
  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      permissionId,
      canSend,
      canManage
    }: {
      permissionId: string;
      canSend?: boolean;
      canManage?: boolean;
    }) => {
      const updates: { can_send?: boolean; can_manage?: boolean } = {};
      if (canSend !== undefined) updates.can_send = canSend;
      if (canManage !== undefined) updates.can_manage = canManage;

      const { error } = await supabase
        .from("mt_whatsapp_user_sessions")
        .update(updates)
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-permissions", sessaoId] });
      toast.success("Permissões atualizadas");
    },
    onError: () => {
      toast.error("Erro ao atualizar permissões");
    }
  });

  // Remover usuário
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("mt_whatsapp_user_sessions")
        .delete()
        .eq("user_id", userId)
        .eq("whatsapp_session_id", sessaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-permissions", sessaoId] });
      queryClient.invalidateQueries({ queryKey: ["available-users", sessaoId] });
      toast.success("Usuário removido da sessão");
      setRemoveUserId(null);
    },
    onError: () => {
      toast.error("Erro ao remover usuário");
    }
  });

  const filteredPermissions = permissions?.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.user?.nome?.toLowerCase().includes(searchLower) ||
      p.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-600">Admin</Badge>;
      case "franqueado":
        return <Badge className="bg-blue-600">Franqueado</Badge>;
      case "operador":
        return <Badge variant="secondary">Operador</Badge>;
      default:
        return <Badge variant="outline">{role || "Usuário"}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários da Sessão
            </DialogTitle>
            <DialogDescription>
              Gerencie quem pode acessar a sessão "{sessaoNome}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Barra de busca e adicionar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setShowAddUser(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Formulário de adicionar usuário */}
            {showAddUser && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <Label>Selecione um usuário para adicionar</Label>
                <div className="flex gap-2">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingUsers ? (
                        <div className="p-2">
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ) : availableUsers?.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Nenhum usuário disponível
                        </div>
                      ) : (
                        availableUsers?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.nome} ({user.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedUserId && addUserMutation.mutate(selectedUserId)}
                    disabled={!selectedUserId || addUserMutation.isPending}
                  >
                    {addUserMutation.isPending ? "Adicionando..." : "Confirmar"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddUser(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de usuários */}
            <ScrollArea className="h-[400px] border rounded-lg">
              {loadingPermissions ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : filteredPermissions?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum usuário com acesso a esta sessão</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setShowAddUser(true)}
                  >
                    Adicionar primeiro usuário
                  </Button>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {filteredPermissions?.map((permission) => (
                    <div
                      key={permission.id}
                      className="p-3 rounded-lg border bg-card space-y-3"
                    >
                      {/* Linha 1: Avatar + info + botão remover */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={permission.user?.avatar_url || undefined} />
                          <AvatarFallback>
                            {safeGetInitials(permission.user?.nome || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate text-sm">
                              {permission.user?.nome}
                            </p>
                            {getRoleBadge(permission.user?.role || null)}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {permission.user?.email}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive shrink-0 h-8 w-8"
                          onClick={() => setRemoveUserId(permission.user_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Linha 2: Permissões */}
                      <div className="flex items-center gap-4 pl-[52px]">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`send-${permission.id}`}
                            checked={permission.can_send}
                            onCheckedChange={(checked) =>
                              updatePermissionMutation.mutate({
                                permissionId: permission.id,
                                canSend: checked
                              })
                            }
                          />
                          <Label
                            htmlFor={`send-${permission.id}`}
                            className="flex items-center gap-1 text-sm cursor-pointer"
                          >
                            <Send className="h-3 w-3" />
                            Enviar
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`manage-${permission.id}`}
                            checked={permission.can_manage}
                            onCheckedChange={(checked) =>
                              updatePermissionMutation.mutate({
                                permissionId: permission.id,
                                canManage: checked
                              })
                            }
                          />
                          <Label
                            htmlFor={`manage-${permission.id}`}
                            className="flex items-center gap-1 text-sm cursor-pointer"
                          >
                            <Settings className="h-3 w-3" />
                            Gerenciar
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Legenda */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Send className="h-3 w-3" />
                <span>Enviar: pode enviar mensagens</span>
              </div>
              <div className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                <span>Gerenciar: pode configurar a sessão</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={!!removeUserId} onOpenChange={() => setRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este usuário da sessão? Ele perderá todo o acesso às conversas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeUserId && removeUserMutation.mutate(removeUserId)}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SessionUsersModal;
