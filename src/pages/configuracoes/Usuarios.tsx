import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Building2,
  Building,
  Shield,
  Mail,
  Phone,
  Loader2,
  ArrowRightLeft,
  Clock,
  UserCheck,
  UserX,
  MessageSquare,
  Key,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { useToast } from '@/hooks/use-toast';
import { useAdminManageAuthUser } from '@/hooks/multitenant/useAdminAuthUserMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { TransferRecordsModal } from '@/components/configuracoes/TransferRecordsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
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
import type { Tenant, Franchise } from '@/types/multitenant';

// =============================================================================
// PÁGINA: Usuários Multi-Tenant
// Listagem e gerenciamento de usuários no sistema multi-tenant
// =============================================================================

interface UserWithRelations {
  id: string;
  auth_user_id: string;
  tenant_id: string;
  franchise_id?: string;
  nome: string;
  nome_curto?: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  avatar_url?: string;
  access_level: string;
  status: string;
  created_at: string;
  tenant?: Tenant;
  franchise?: Franchise;
}

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  platform_admin: { label: 'Platform Admin', color: 'bg-purple-100 text-purple-700' },
  tenant_admin: { label: 'Admin Empresa', color: 'bg-blue-100 text-blue-700' },
  franchise_admin: { label: 'Admin Franquia', color: 'bg-cyan-100 text-cyan-700' },
  user: { label: 'Usuário', color: 'bg-gray-100 text-gray-700' },
};

export default function Usuarios() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, franchise, accessLevel, isLoading: isTenantLoading } = useTenantContext();
  const adminManageAuthUser = useAdminManageAuthUser();

  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Para franchise users, auto-selecionar sua franquia
  // Para tenant users, auto-selecionar seu tenant
  const [selectedTenant, setSelectedTenant] = useState<string>(
    searchParams.get('tenant') || 'all'
  );
  const [selectedFranchise, setSelectedFranchise] = useState<string>(
    searchParams.get('franchise') || 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [transferUser, setTransferUser] = useState<UserWithRelations | null>(null);
  const [sendingCredentialsId, setSendingCredentialsId] = useState<string | null>(null);

  // Determinar permissões baseado no nível de acesso
  const canSelectTenant = accessLevel === 'platform';
  const canSelectFranchise = accessLevel === 'platform' || accessLevel === 'tenant';
  const canCreateUser = accessLevel !== 'user';
  const canDeleteUser = accessLevel === 'platform' || accessLevel === 'tenant' || accessLevel === 'franchise';

  // Carregar tenants apenas para platform admin
  useEffect(() => {
    if (accessLevel === 'platform') {
      loadTenants();
    }
  }, [accessLevel]);

  // Auto-selecionar tenant/franchise baseado no contexto
  useEffect(() => {
    if (!isTenantLoading) {
      if (accessLevel === 'tenant' && tenant) {
        setSelectedTenant(tenant.id);
      } else if (accessLevel === 'franchise' && tenant) {
        setSelectedTenant(tenant.id);
        if (franchise) {
          setSelectedFranchise(franchise.id);
        }
      }
    }
  }, [accessLevel, tenant, franchise, isTenantLoading]);

  useEffect(() => {
    if (!isTenantLoading) {
      loadFranchises();
      loadUsers();
    }
  }, [selectedTenant, selectedFranchise, isTenantLoading, accessLevel, tenant, franchise]);

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
    // Franchise users não precisam carregar lista de franquias
    if (accessLevel === 'franchise') {
      setFranchises([]);
      return;
    }

    try {
      let query = supabase
        .from('mt_franchises')
        .select('id, nome, codigo, tenant_id')
        .eq('is_active', true)
        .order('nome');

      // Tenant admin só vê franquias do seu tenant
      if (accessLevel === 'tenant' && tenant) {
        query = query.eq('tenant_id', tenant.id);
      } else if (selectedTenant && selectedTenant !== 'all') {
        query = query.eq('tenant_id', selectedTenant);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFranchises(data || []);
    } catch (error) {
      console.error('Erro ao carregar franquias:', error);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('mt_users')
        .select('*, tenant:mt_tenants(id, nome_fantasia), franchise:mt_franchises(id, nome, codigo)')
        .order('nome', { ascending: true });

      // Filtrar baseado no nível de acesso (segurança adicional ao RLS)
      if (accessLevel === 'franchise' && franchise) {
        // Franchise admin só vê usuários da sua franquia
        query = query.eq('franchise_id', franchise.id);
      } else if (accessLevel === 'tenant' && tenant) {
        // Tenant admin vê todos do seu tenant
        query = query.eq('tenant_id', tenant.id);
        // Mas pode filtrar por franquia específica
        if (selectedFranchise && selectedFranchise !== 'all') {
          query = query.eq('franchise_id', selectedFranchise);
        }
      } else if (accessLevel === 'platform') {
        // Platform admin pode filtrar livremente
        if (selectedTenant && selectedTenant !== 'all') {
          query = query.eq('tenant_id', selectedTenant);
        }
        if (selectedFranchise && selectedFranchise !== 'all') {
          query = query.eq('franchise_id', selectedFranchise);
        }
      } else {
        // User comum não deve ver nada (ou só seu próprio perfil)
        setUsers([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista de usuários.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      // Remover vínculo em mt_payroll_employees (FK constraint)
      await supabase
        .from('mt_payroll_employees')
        .delete()
        .eq('user_id', deleteId);

      // Deletar roles do usuário
      await supabase
        .from('mt_user_roles')
        .delete()
        .eq('user_id', deleteId);

      // Deletar o usuário
      const { error } = await supabase
        .from('mt_users')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: 'Usuário removido',
        description: 'O usuário foi removido com sucesso.',
      });

      loadUsers();
    } catch (error: unknown) {
      console.error('Erro ao deletar usuário:', error);
      toast({
        title: 'Erro ao remover usuário',
        description: error instanceof Error ? error.message : 'Não foi possível remover o usuário.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const toggleStatus = async (user: UserWithRelations) => {
    // Se for desativar, abrir modal de transferência
    if (user.status === 'ativo') {
      setTransferUser(user);
      return;
    }

    // Se for reativar, fazer direto
    try {
      const { error } = await supabase
        .from('mt_users')
        .update({ status: 'ativo' })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Usuário ativado',
        description: `${user.nome} foi ativado.`,
      });

      loadUsers();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do usuário.',
        variant: 'destructive',
      });
    }
  };

  // Desativar usuário após transferência (ou direto se sem registros)
  const deactivateUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('mt_users')
        .update({ status: 'inativo' })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Usuário desativado',
        description: `${userName} foi desativado com sucesso.`,
      });

      setTransferUser(null);
      loadUsers();
    } catch (error) {
      console.error('Erro ao desativar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar o usuário.',
        variant: 'destructive',
      });
    }
  };

  // Aprovar usuário pendente
  const approveUser = async (user: UserWithRelations) => {
    try {
      const { error } = await supabase
        .from('mt_users')
        .update({ status: 'ativo' })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Usuário aprovado',
        description: `${user.nome} foi aprovado e pode acessar o sistema.`,
      });

      loadUsers();
    } catch (error: unknown) {
      console.error('Erro ao aprovar:', error);
      toast({
        title: 'Erro ao aprovar usuário',
        description: error instanceof Error ? error.message : 'Não foi possível aprovar o usuário.',
        variant: 'destructive',
      });
    }
  };

  // Rejeitar usuário pendente
  const rejectUser = async (user: UserWithRelations) => {
    try {
      const { error } = await supabase
        .from('mt_users')
        .update({ status: 'inativo' })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Usuário rejeitado',
        description: `${user.nome} foi rejeitado.`,
      });

      loadUsers();
    } catch (error: unknown) {
      console.error('Erro ao rejeitar:', error);
      toast({
        title: 'Erro ao rejeitar usuário',
        description: error instanceof Error ? error.message : 'Não foi possível rejeitar o usuário.',
        variant: 'destructive',
      });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSendCredentialsWhatsApp = async (user: UserWithRelations) => {
    const rawPhone = user.whatsapp || user.telefone;
    if (!rawPhone) {
      toast({
        title: 'Sem telefone',
        description: 'Este usuário não possui telefone/WhatsApp cadastrado.',
        variant: 'destructive',
      });
      return;
    }

    setSendingCredentialsId(user.id);
    try {
      const password = generatePassword();

      // Definir senha no Auth via hook useAdminManageAuthUser
      await adminManageAuthUser.mutateAsync({
        mtUserId: user.id,
        password,
        email: user.email,
      });

      const { data: sessions } = await supabase
        .from('mt_whatsapp_sessions')
        .select('session_name')
        .eq('status', 'working')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!sessions || sessions.length === 0) {
        toast({
          title: 'Senha definida, mas sem WhatsApp',
          description: `Senha gerada: ${password} — Nenhuma sessão WhatsApp ativa para enviar.`,
        });
        return;
      }

      const cleaned = rawPhone.replace(/\D/g, '');
      const phone = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
      if (phone.length < 12 || phone.length > 15) {
        toast({
          title: 'Senha definida, mas telefone inválido',
          description: `Senha gerada: ${password} — Telefone "${rawPhone}" não é válido.`,
        });
        return;
      }

      const chatId = `${phone}@c.us`;
      const loginUrl = 'https://app.viniun.com.br';
      const message = `🔐 *Credenciais de Acesso*\n\nOlá, *${user.nome_curto || user.nome}*!\n\nSeguem suas credenciais para acessar o sistema:\n\n📧 *E-mail:* ${user.email}\n🔑 *Senha:* ${password}\n🌐 *Link:* ${loginUrl}\n\n⚠️ _Por segurança, recomendamos alterar sua senha no primeiro acesso._`;

      const sendResult = await wahaClient.sendText(sessions[0].session_name, chatId, message);
      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Erro ao enviar mensagem WhatsApp');
      }

      toast({
        title: 'Credenciais enviadas!',
        description: `Senha gerada e enviada via WhatsApp para ${rawPhone}.`,
      });
    } catch (error: unknown) {
      console.error('Erro ao enviar credenciais:', error);
      toast({
        title: 'Erro ao enviar credenciais',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSendingCredentialsId(null);
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === 'all' || u.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: users.length,
    ativos: users.filter((u) => u.status === 'ativo').length,
    pendentes: users.filter((u) => u.status === 'pendente').length,
    inativos: users.filter((u) => u.status === 'inativo').length,
    admins: users.filter((u) => u.access_level === 'platform_admin' || u.access_level === 'tenant_admin').length,
  };

  // Atualizar query params
  const handleTenantChange = (value: string) => {
    setSelectedTenant(value);
    setSelectedFranchise('all');
    if (value === 'all') {
      searchParams.delete('tenant');
    } else {
      searchParams.set('tenant', value);
    }
    searchParams.delete('franchise');
    setSearchParams(searchParams);
  };

  const handleFranchiseChange = (value: string) => {
    setSelectedFranchise(value);
    if (value === 'all') {
      searchParams.delete('franchise');
    } else {
      searchParams.set('franchise', value);
    }
    setSearchParams(searchParams);
  };

  // Loading state
  if (isTenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determinar título baseado no contexto
  const getTitle = () => {
    if (accessLevel === 'franchise' && franchise) {
      return `Usuários - ${franchise.nome}`;
    }
    if (accessLevel === 'tenant' && tenant) {
      return `Usuários - ${tenant.nome_fantasia}`;
    }
    return 'Usuários';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {getTitle()}
          </h1>
          <p className="text-muted-foreground">
            {accessLevel === 'franchise'
              ? 'Gerencie os usuários da sua franquia'
              : accessLevel === 'tenant'
              ? 'Gerencie os usuários da sua empresa'
              : 'Gerencie os usuários do sistema multi-tenant'}
          </p>
        </div>
        {canCreateUser && (
          <Button asChild>
            <Link to="/configuracoes/usuarios/novo">
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Link>
          </Button>
        )}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.ativos} ativo(s) · {stats.pendentes > 0 ? `${stats.pendentes} pendente(s) · ` : ''}{stats.inativos} inativo(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.ativos / stats.total) * 100 || 0).toFixed(0)}% do total
            </p>
          </CardContent>
        </Card>

        {stats.pendentes > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-800">Pendentes de Aprovação</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendentes}</div>
              <Button
                variant="link"
                className="p-0 h-auto text-xs text-amber-700"
                onClick={() => setSelectedStatus('pendente')}
              >
                Ver pendentes →
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">
              Platform + Tenant admins
            </p>
          </CardContent>
        </Card>

        {/* Card de Empresas - apenas para platform admin */}
        {accessLevel === 'platform' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
              <p className="text-xs text-muted-foreground">
                Com usuários cadastrados
              </p>
            </CardContent>
          </Card>
        )}

        {/* Card de Franquias - para platform e tenant admin */}
        {(accessLevel === 'platform' || accessLevel === 'tenant') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Franquias</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{franchises.length}</div>
              <p className="text-xs text-muted-foreground">
                Disponíveis
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Seletor de tenant - apenas para platform admin */}
        {canSelectTenant && (
          <Select value={selectedTenant} onValueChange={handleTenantChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Seletor de franquia - para platform e tenant admin */}
        {canSelectFranchise && franchises.length > 0 && (
          <Select
            value={selectedFranchise}
            onValueChange={handleFranchiseChange}
            disabled={canSelectTenant && selectedTenant === 'all'}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as franquias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as franquias</SelectItem>
              {franchises.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro de status */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={loadUsers}>
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Franquia</TableHead>
                <TableHead>Tipo</TableHead>
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
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? 'Nenhum usuário encontrado com esse filtro'
                        : 'Nenhum usuário cadastrado'}
                    </p>
                    {!searchQuery && (
                      <Button asChild className="mt-4">
                        <Link to="/configuracoes/usuarios/novo">
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeiro usuário
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.nome}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        {user.telefone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.telefone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.tenant ? (
                        <Link
                          to={`/configuracoes/empresas/${user.tenant.id}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Building2 className="h-3 w-3" />
                          {user.tenant.nome_fantasia}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.franchise ? (
                        <Link
                          to={`/configuracoes/franquias/${user.franchise.id}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Building className="h-3 w-3" />
                          {user.franchise.nome}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Todas</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={TIPO_LABELS[user.access_level]?.color || 'bg-gray-100 text-gray-700'}>
                        {TIPO_LABELS[user.access_level]?.label || user.access_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === 'ativo' ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : user.status === 'pendente' ? (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => approveUser(user)}
                              title="Aprovar"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => rejectUser(user)}
                              title="Rejeitar"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
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
                            onClick={() => navigate(`/configuracoes/usuarios/${user.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/configuracoes/usuarios/${user.id}/editar`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSendCredentialsWhatsApp(user)}
                            disabled={sendingCredentialsId === user.id || (!user.telefone && !user.whatsapp)}
                          >
                            {sendingCredentialsId === user.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Enviar Senha via WhatsApp
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'pendente' ? (
                            <>
                              <DropdownMenuItem onClick={() => approveUser(user)}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => rejectUser(user)} className="text-destructive">
                                <UserX className="h-4 w-4 mr-2" />
                                Rejeitar
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => toggleStatus(user)}>
                              {user.status === 'ativo' ? (
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
                          {canDeleteUser && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(user.id)}
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

      {/* Modal de transferência de registros ao desativar */}
      {transferUser && (
        <TransferRecordsModal
          isOpen={!!transferUser}
          onClose={() => setTransferUser(null)}
          user={transferUser}
          onTransferComplete={() =>
            deactivateUser(transferUser.id, transferUser.nome)
          }
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário será removido do sistema.
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
