import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  LayoutDashboard,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { MTDashboardProfile } from "@/types/dashboard";

// Ícones dinâmicos
import * as LucideIcons from "lucide-react";

function ProfileIcon({ iconName, className }: { iconName?: string; className?: string }) {
  const Icon = iconName ? (LucideIcons as any)[iconName] || LayoutDashboard : LayoutDashboard;
  return <Icon className={className} />;
}

export default function DashboardProfiles() {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { tenant, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // Query: Load all profiles
  // ---------------------------------------------------------------------------

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ['mt-dashboard-profiles-admin', tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('mt_dashboard_profiles')
        .select('*')
        .is('deleted_at', null)
        .order('ordem');

      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (accessLevel !== 'platform' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MTDashboardProfile[];
    },
    enabled: !isTenantLoading && (!!tenant || accessLevel === 'platform'),
  });

  // ---------------------------------------------------------------------------
  // Mutation: Duplicate profile
  // ---------------------------------------------------------------------------

  const duplicateProfile = useMutation({
    mutationFn: async (profile: MTDashboardProfile) => {
      const { id, created_at, updated_at, boards, ...rest } = profile;
      const { data, error } = await supabase
        .from('mt_dashboard_profiles')
        .insert({
          ...rest,
          codigo: `${rest.codigo}_copia`,
          nome: `${rest.nome} (Cópia)`,
          is_default: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-profiles-admin'] });
      toast.success("Perfil duplicado com sucesso");
    },
    onError: (err: any) => {
      toast.error(`Erro ao duplicar: ${err.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Mutation: Delete profile (soft delete)
  // ---------------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('mt_dashboard_profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['mt-dashboard-profiles-admin'] });
      toast.success("Perfil removido com sucesso");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao remover perfil");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Filter by search
  // ---------------------------------------------------------------------------

  const filteredProfiles = (profiles || []).filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.nome.toLowerCase().includes(searchLower) ||
      p.codigo.toLowerCase().includes(searchLower)
    );
  });

  // ---------------------------------------------------------------------------
  // Loading & Error states
  // ---------------------------------------------------------------------------

  if (isLoading || isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">Erro ao carregar perfis de dashboard</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfis de Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie os perfis de dashboard e seus boards/widgets
          </p>
        </div>
        <Button asChild>
          <Link to="/configuracoes/dashboard-profiles/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Perfis */}
      <Card>
        <CardHeader>
          <CardTitle>Perfis Cadastrados</CardTitle>
          <CardDescription>
            {filteredProfiles.length} perfil(is) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Perfil</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Roles Vinculados</TableHead>
                <TableHead>Cargos</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-center">Ordem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum perfil de dashboard encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    {/* Icone + Nome */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: (profile.cor || '#6366f1') + '20' }}
                        >
                          <ProfileIcon
                            iconName={profile.icone}
                            className="h-4 w-4"
                            style={{ color: profile.cor || '#6366f1' } as any}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{profile.nome}</p>
                          {profile.descricao && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {profile.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Código */}
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {profile.codigo}
                      </code>
                    </TableCell>

                    {/* Roles */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.role_codigos?.length > 0 ? (
                          profile.role_codigos.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Cargos */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.cargos?.length > 0 ? (
                          profile.cargos.map((cargo) => (
                            <Badge key={cargo} variant="outline" className="text-xs">
                              {cargo}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Ativo */}
                    <TableCell className="text-center">
                      <Badge variant={profile.is_active ? "default" : "secondary"}>
                        {profile.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>

                    {/* Ordem */}
                    <TableCell className="text-center">
                      {profile.ordem}
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/configuracoes/dashboard-profiles/${profile.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/configuracoes/dashboard-profiles/${profile.id}/editar`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicateProfile.mutate(profile)}
                            disabled={duplicateProfile.isPending}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(profile.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este perfil de dashboard?
              Todos os boards e widgets associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
