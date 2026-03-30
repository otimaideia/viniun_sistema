import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Globe,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tenant } from '@/types/multitenant';

// =============================================================================
// PÁGINA: Empresas (Tenants)
// Listagem e gerenciamento de empresas no sistema multi-tenant
// =============================================================================

interface TenantWithStats extends Tenant {
  _count?: {
    franchises: number;
    users: number;
  };
}

export default function Empresas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carregar tenants
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_tenants')
        .select('*')
        .order('nome_fantasia', { ascending: true });

      if (error) throw error;

      // Para cada tenant, buscar contagem de franquias e usuários
      const tenantsWithStats = await Promise.all(
        (data || []).map(async (tenant) => {
          const [franchisesRes, usersRes] = await Promise.all([
            supabase
              .from('mt_franchises')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', tenant.id),
            supabase
              .from('mt_users')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', tenant.id),
          ]);

          return {
            ...tenant,
            _count: {
              franchises: franchisesRes.count || 0,
              users: usersRes.count || 0,
            },
          };
        })
      );

      setTenants(tenantsWithStats);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast({
        title: 'Erro ao carregar empresas',
        description: 'Não foi possível carregar a lista de empresas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Deletar tenant
  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('mt_tenants')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'Empresa removida',
        description: 'A empresa foi removida com sucesso.',
      });

      loadTenants();
    } catch (error: any) {
      console.error('Erro ao deletar empresa:', error);
      toast({
        title: 'Erro ao remover empresa',
        description: error.message || 'Não foi possível remover a empresa.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Toggle status
  const toggleStatus = async (tenant: TenantWithStats) => {
    try {
      const { error } = await supabase
        .from('mt_tenants')
        .update({ is_active: !tenant.is_active })
        .eq('id', tenant.id);

      if (error) throw error;

      toast({
        title: tenant.is_active ? 'Empresa desativada' : 'Empresa ativada',
        description: `${tenant.nome_fantasia} foi ${tenant.is_active ? 'desativada' : 'ativada'}.`,
      });

      loadTenants();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da empresa.',
        variant: 'destructive',
      });
    }
  };

  // Filtrar tenants
  const filteredTenants = tenants.filter(
    (t) =>
      t.nome_fantasia.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.cnpj?.includes(searchQuery)
  );

  // Estatísticas gerais
  const stats = {
    total: tenants.length,
    ativos: tenants.filter((t) => t.is_active).length,
    inativos: tenants.filter((t) => !t.is_active).length,
    totalFranquias: tenants.reduce((acc, t) => acc + (t._count?.franchises || 0), 0),
    totalUsuarios: tenants.reduce((acc, t) => acc + (t._count?.users || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Empresas
          </h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas no sistema multi-tenant
          </p>
        </div>
        <Button asChild>
          <Link to="/onboarding/empresa">
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Link>
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.ativos} ativa(s) · {stats.inativos} inativa(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.ativos / stats.total) * 100 || 0).toFixed(0)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Franquias</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFranquias}</div>
            <p className="text-xs text-muted-foreground">
              Em todas as empresas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">
              Em todas as empresas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou CNPJ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={loadTenants}>
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Subdomínio</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-center">Franquias</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? 'Nenhuma empresa encontrada com esse filtro'
                        : 'Nenhuma empresa cadastrada'}
                    </p>
                    {!searchQuery && (
                      <Button asChild className="mt-4">
                        <Link to="/onboarding/empresa">
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeira empresa
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tenant.nome_fantasia}</div>
                        <div className="text-xs text-muted-foreground">
                          {tenant.cnpj || tenant.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {tenant.subdominio || tenant.slug}
                        </code>
                        {tenant.dominio_customizado && (
                          <Badge variant="outline" className="text-xs">
                            Domínio próprio
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {tenant.plano?.toUpperCase() || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        {tenant._count?.franchises || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {tenant._count?.users || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.is_active ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => navigate(`/configuracoes/empresas/${tenant.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/configuracoes/empresas/${tenant.id}/editar`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`https://${tenant.subdominio || tenant.slug}.seusite.com.br`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Acessar Painel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleStatus(tenant)}>
                            {tenant.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(tenant.id)}
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
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              empresa e todos os dados associados (franquias, usuários, leads, etc).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
