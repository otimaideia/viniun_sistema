import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPermissions } from '@/hooks/multitenant/useUserPermissions';
import type { Franchise, Tenant } from '@/types/multitenant';

// =============================================================================
// PÁGINA: Franquias
// Listagem e gerenciamento de franquias no sistema multi-tenant
// =============================================================================

interface FranchiseWithTenant extends Franchise {
  tenant?: Tenant;
  _count?: {
    users: number;
  };
}

export default function Franquias() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useUserPermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const [franchises, setFranchises] = useState<FranchiseWithTenant[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>(
    searchParams.get('tenant') || 'all'
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carregar dados
  useEffect(() => {
    loadTenants();
    loadFranchises();
  }, [selectedTenant]);

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('mt_tenants')
        .select('id, nome_fantasia, slug')
        .eq('is_active', true)
        .order('nome_fantasia');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadFranchises = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_franchises')
        .select('*, tenant:mt_tenants(id, nome_fantasia, slug)')
        .order('nome', { ascending: true });

      if (selectedTenant && selectedTenant !== 'all') {
        query = query.eq('tenant_id', selectedTenant);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar contagem de usuários por franquia
      const franchisesWithStats = await Promise.all(
        (data || []).map(async (franchise) => {
          const { count } = await supabase
            .from('mt_users')
            .select('id', { count: 'exact', head: true })
            .eq('franchise_id', franchise.id);

          return {
            ...franchise,
            _count: {
              users: count || 0,
            },
          };
        })
      );

      setFranchises(franchisesWithStats);
    } catch (error) {
      console.error('Erro ao carregar franquias:', error);
      toast({
        title: 'Erro ao carregar franquias',
        description: 'Não foi possível carregar a lista de franquias.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Deletar franquia
  const handleDelete = async () => {
    if (!deleteId) return;
    if (!hasPermission('franqueados.delete')) {
      toast({ title: 'Sem permissão', description: 'Você não tem permissão para excluir franquias.', variant: 'destructive' });
      setDeleteId(null);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('mt_franchises')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'Franquia removida',
        description: 'A franquia foi removida com sucesso.',
      });

      loadFranchises();
    } catch (error: any) {
      console.error('Erro ao deletar franquia:', error);
      toast({
        title: 'Erro ao remover franquia',
        description: error.message || 'Não foi possível remover a franquia.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Toggle status
  const toggleStatus = async (franchise: FranchiseWithTenant) => {
    if (!hasPermission('franqueados.edit')) {
      toast({ title: 'Sem permissão', description: 'Você não tem permissão para alterar franquias.', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase
        .from('mt_franchises')
        .update({ is_active: !franchise.is_active })
        .eq('id', franchise.id);

      if (error) throw error;

      toast({
        title: franchise.is_active ? 'Franquia desativada' : 'Franquia ativada',
        description: `${franchise.nome} foi ${franchise.is_active ? 'desativada' : 'ativada'}.`,
      });

      loadFranchises();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da franquia.',
        variant: 'destructive',
      });
    }
  };

  // Filtrar franquias
  const filteredFranchises = franchises.filter(
    (f) =>
      f.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cidade?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Estatísticas
  const stats = {
    total: franchises.length,
    ativas: franchises.filter((f) => f.is_active).length,
    inativas: franchises.filter((f) => !f.is_active).length,
    totalUsuarios: franchises.reduce((acc, f) => acc + (f._count?.users || 0), 0),
  };

  // Atualizar query params
  const handleTenantChange = (value: string) => {
    setSelectedTenant(value);
    if (value === 'all') {
      searchParams.delete('tenant');
    } else {
      searchParams.set('tenant', value);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6" />
            Franquias
          </h1>
          <p className="text-muted-foreground">
            Gerencie as franquias cadastradas no sistema
          </p>
        </div>
        {hasPermission('franqueados.create') && (
          <Button asChild>
            <Link to="/configuracoes/franquias/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Franquia
            </Link>
          </Button>
        )}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Franquias</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.ativas} ativa(s) · {stats.inativas} inativa(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Franquias Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ativas}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.ativas / stats.total) * 100 || 0).toFixed(0)}% do total
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
              Em todas as franquias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">
              Com franquias ativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedTenant} onValueChange={handleTenantChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as empresas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.nome_fantasia}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadFranchises}>
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Franquia</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Contato</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredFranchises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Building className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? 'Nenhuma franquia encontrada com esse filtro'
                        : 'Nenhuma franquia cadastrada'}
                    </p>
                    {!searchQuery && (
                      <Button asChild className="mt-4">
                        <Link to="/configuracoes/franquias/novo">
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeira franquia
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFranchises.map((franchise) => (
                  <TableRow key={franchise.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{franchise.nome}</div>
                        <code className="text-xs text-muted-foreground bg-muted px-1 rounded">
                          {franchise.codigo}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      {franchise.tenant ? (
                        <Link
                          to={`/configuracoes/empresas/${franchise.tenant.id}`}
                          className="text-primary hover:underline"
                        >
                          {franchise.tenant.nome_fantasia}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {franchise.cidade && franchise.estado ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {franchise.cidade}/{franchise.estado}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {franchise.telefone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {franchise.telefone}
                          </div>
                        )}
                        {franchise.email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {franchise.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {franchise._count?.users || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {franchise.is_active ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativa
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
                            onClick={() => navigate(`/configuracoes/franquias/${franchise.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {hasPermission('franqueados.edit') && (
                            <DropdownMenuItem
                              onClick={() => navigate(`/configuracoes/franquias/${franchise.id}/editar`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {(hasPermission('franqueados.edit') || hasPermission('franqueados.delete')) && (
                            <DropdownMenuSeparator />
                          )}
                          {hasPermission('franqueados.edit') && (
                            <DropdownMenuItem onClick={() => toggleStatus(franchise)}>
                              {franchise.is_active ? (
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
                          )}
                          {hasPermission('franqueados.delete') && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(franchise.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          )}
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
            <AlertDialogTitle>Excluir franquia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              franquia e todos os dados associados (usuários, leads, etc).
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
