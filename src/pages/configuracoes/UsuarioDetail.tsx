import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Key,
  Bell,
  Users,
  Star,
  Eye,
  EyeOff,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { wahaClient } from '@/services/waha/wahaDirectClient';
import { useToast } from '@/hooks/use-toast';
import { useUserDepartments } from '@/hooks/multitenant/useDepartments';
import { useUserTeams } from '@/hooks/multitenant/useTeams';
import { useUserRolesAdmin, useRoles, usePermissionsList } from '@/hooks/multitenant/useRolesAdmin';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLoginHistoryMT, parseUserAgent } from '@/hooks/multitenant/useLoginHistoryMT';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// =============================================================================
// PÁGINA: Detalhes do Usuário Multi-Tenant
// Visualização completa dos dados do usuário
// =============================================================================

interface MTUser {
  id: string;
  auth_user_id: string | null;
  tenant_id: string | null;
  franchise_id: string | null;
  access_level: string;
  email: string;
  nome: string;
  nome_curto: string | null;
  avatar_url: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cargo: string | null;
  departamento: string | null;
  matricula: string | null;
  idioma: string | null;
  timezone: string | null;
  tema: string | null;
  notificacoes_email: boolean;
  notificacoes_push: boolean;
  notificacoes_whatsapp: boolean;
  ultimo_login: string | null;
  login_count: number;
  failed_login_count: number;
  locked_until: string | null;
  must_change_password: boolean;
  two_factor_enabled: boolean;
  status: string;
  data_admissao: string | null;
  data_demissao: string | null;
  created_at: string;
  updated_at: string;
  tenant?: { nome_fantasia: string; slug: string } | null;
  franchise?: { nome: string; codigo: string } | null;
}

export default function UsuarioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [usuario, setUsuario] = useState<MTUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para redefinição de senha
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);

  // Hooks para departamentos e equipes do usuário
  const { userDepartments, isLoading: isLoadingDepts } = useUserDepartments(id);
  const { userTeams, isLoading: isLoadingTeams } = useUserTeams(id);

  // Hooks para permissões e cargos
  const { userRoles, isLoading: isLoadingUserRoles, assignRole, removeRole } = useUserRolesAdmin(id || null);
  const { roles: availableRoles, isLoading: isLoadingRoles } = useRoles();
  const { permissionsByModule, isLoading: isLoadingPerms } = usePermissionsList();

  // Hook para histórico de login
  const { loginHistory, isLoading: isLoadingLoginHistory, stats: loginStats } = useLoginHistoryMT(id);

  // Estado para adicionar novo cargo
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  useEffect(() => {
    loadUsuario();
  }, [id]);

  const loadUsuario = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_users')
        .select(`
          *,
          tenant:mt_tenants(nome_fantasia, slug),
          franchise:mt_franchises(nome, codigo)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setUsuario(data);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      toast({
        title: 'Erro ao carregar usuário',
        description: 'Não foi possível carregar os dados do usuário.',
        variant: 'destructive',
      });
      navigate('/configuracoes/usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('mt_users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi removido com sucesso.',
      });

      navigate('/configuracoes/usuarios');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o usuário.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Senha inválida',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      // Usar função SECURITY DEFINER no banco (não precisa de service key no frontend)
      const { data: result, error: rpcError } = await supabase.rpc('admin_manage_auth_user', {
        p_mt_user_id: usuario!.id,
        p_password: newPassword,
        p_email: usuario!.email,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (result && !result.success) throw new Error(result.error || 'Erro ao redefinir senha');

      toast({
        title: 'Senha redefinida',
        description: result?.action === 'created'
          ? 'Conta de autenticação criada e senha definida com sucesso.'
          : 'A senha foi atualizada com sucesso.',
      });

      setIsResetPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      loadUsuario();
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast({
        title: 'Erro ao redefinir senha',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
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

  const handleSendCredentialsWhatsApp = async () => {
    if (!usuario) return;

    const rawPhone = usuario.whatsapp || usuario.telefone;
    if (!rawPhone) {
      toast({
        title: 'Sem telefone',
        description: 'Este usuário não possui telefone/WhatsApp cadastrado.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingCredentials(true);
    try {
      // 1. Gerar senha
      const password = generatePassword();

      // 2. Definir senha no Auth via função SECURITY DEFINER
      const { data: result, error: rpcError } = await supabase.rpc('admin_manage_auth_user', {
        p_mt_user_id: usuario.id,
        p_password: password,
        p_email: usuario.email,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (result && !result.success) throw new Error(result.error || 'Erro ao definir senha');

      // 3. Buscar sessão WhatsApp ativa
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
        loadUsuario();
        return;
      }

      // 4. Formatar telefone
      const cleaned = rawPhone.replace(/\D/g, '');
      const phone = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
      if (phone.length < 12 || phone.length > 15) {
        toast({
          title: 'Senha definida, mas telefone inválido',
          description: `Senha gerada: ${password} — Telefone "${rawPhone}" não é válido para envio.`,
        });
        loadUsuario();
        return;
      }

      const chatId = `${phone}@c.us`;
      const loginUrl = 'https://app.yeslaserpraiagrande.com.br';

      const message = `🔐 *Credenciais de Acesso*\n\nOlá, *${usuario.nome_curto || usuario.nome}*!\n\nSeguem suas credenciais para acessar o sistema:\n\n📧 *E-mail:* ${usuario.email}\n🔑 *Senha:* ${password}\n🌐 *Link:* ${loginUrl}\n\n⚠️ _Por segurança, recomendamos alterar sua senha no primeiro acesso._`;

      // 5. Enviar via WhatsApp
      const sendResult = await wahaClient.sendText(sessions[0].session_name, chatId, message);
      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Erro ao enviar mensagem WhatsApp');
      }

      toast({
        title: 'Credenciais enviadas!',
        description: `Senha gerada e enviada via WhatsApp para ${rawPhone}.`,
      });
      loadUsuario();
    } catch (error: any) {
      console.error('Erro ao enviar credenciais:', error);
      toast({
        title: 'Erro ao enviar credenciais',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingCredentials(false);
    }
  };

  const getAccessLevelBadge = (level: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      platform_admin: { label: 'Platform Admin', variant: 'destructive' },
      tenant_admin: { label: 'Tenant Admin', variant: 'default' },
      franchise_admin: { label: 'Franchise Admin', variant: 'secondary' },
      user: { label: 'Usuário', variant: 'outline' },
    };
    const badge = badges[level] || { label: level, variant: 'outline' };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      ativo: { label: 'Ativo', variant: 'default' },
      inativo: { label: 'Inativo', variant: 'secondary' },
      suspenso: { label: 'Suspenso', variant: 'destructive' },
      pendente: { label: 'Pendente', variant: 'outline' },
    };
    const badge = badges[status] || { label: status, variant: 'outline' };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Usuário não encontrado</h2>
        <p className="text-muted-foreground mb-4">
          O usuário solicitado não existe ou foi removido.
        </p>
        <Button asChild>
          <Link to="/configuracoes/usuarios">Voltar para lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/configuracoes/usuarios">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {usuario.avatar_url ? (
                <img
                  src={usuario.avatar_url}
                  alt={usuario.nome}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{usuario.nome}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{usuario.email}</span>
                {getAccessLevelBadge(usuario.access_level)}
                {getStatusBadge(usuario.status)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/configuracoes/usuarios/${id}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o usuário "{usuario.nome}"?
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="acesso">Acesso & Segurança</TabsTrigger>
          <TabsTrigger value="permissoes" className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        {/* Tab: Dados Gerais */}
        <TabsContent value="dados" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Informações Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Nome Completo" value={usuario.nome} />
                <InfoRow label="Nome Curto" value={usuario.nome_curto} />
                <InfoRow label="E-mail" value={usuario.email} icon={<Mail className="h-4 w-4" />} />
                <InfoRow label="Telefone" value={usuario.telefone} icon={<Phone className="h-4 w-4" />} />
                <InfoRow label="WhatsApp" value={usuario.whatsapp} />
              </CardContent>
            </Card>

            {/* Vínculo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Vínculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Empresa"
                  value={usuario.tenant?.nome_fantasia}
                  link={usuario.tenant_id ? `/configuracoes/empresas/${usuario.tenant_id}` : undefined}
                />
                <InfoRow
                  label="Franquia"
                  value={usuario.franchise ? `${usuario.franchise.nome} (${usuario.franchise.codigo})` : null}
                  link={usuario.franchise_id ? `/configuracoes/franquias/${usuario.franchise_id}` : undefined}
                />
                <InfoRow label="Cargo" value={usuario.cargo} />
                <InfoRow label="Matrícula" value={usuario.matricula} />

                {/* Departamentos Vinculados (dinâmico) */}
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Departamentos
                  </span>
                  <div className="text-right">
                    {isLoadingDepts ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : userDepartments.length === 0 ? (
                      <span className="text-muted-foreground italic">Nenhum</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {userDepartments.map((ud: any) => (
                          <Badge
                            key={ud.id}
                            variant={ud.is_primary ? 'default' : 'outline'}
                            className="text-xs"
                            style={{
                              backgroundColor: ud.is_primary ? ud.department?.cor : 'transparent',
                              borderColor: ud.department?.cor,
                              color: ud.is_primary ? 'white' : ud.department?.cor,
                            }}
                          >
                            {ud.is_primary && <Star className="w-3 h-3 mr-1 fill-current" />}
                            {ud.department?.nome}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Equipes Vinculadas (dinâmico) */}
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Equipes
                  </span>
                  <div className="text-right">
                    {isLoadingTeams ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : userTeams.length === 0 ? (
                      <span className="text-muted-foreground italic">Nenhuma</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {userTeams.map((ut: any) => (
                          <Badge
                            key={ut.id}
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: ut.team?.cor,
                              color: ut.team?.cor,
                            }}
                          >
                            {ut.team?.nome}
                            <span className="ml-1 text-muted-foreground">({ut.role_in_team})</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Datas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Datas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Data de Admissão"
                  value={usuario.data_admissao ? format(new Date(usuario.data_admissao), 'dd/MM/yyyy', { locale: ptBR }) : null}
                />
                <InfoRow
                  label="Data de Demissão"
                  value={usuario.data_demissao ? format(new Date(usuario.data_demissao), 'dd/MM/yyyy', { locale: ptBR }) : null}
                />
                <InfoRow
                  label="Cadastrado em"
                  value={format(new Date(usuario.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                />
                <InfoRow
                  label="Última atualização"
                  value={format(new Date(usuario.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Acesso & Segurança */}
        <TabsContent value="acesso" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Nível de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nível</span>
                  {getAccessLevelBadge(usuario.access_level)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {getStatusBadge(usuario.status)}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">2FA Habilitado</span>
                  {usuario.two_factor_enabled ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sim
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Não
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deve trocar senha</span>
                  {usuario.must_change_password ? (
                    <Badge variant="destructive">Sim</Badge>
                  ) : (
                    <Badge variant="secondary">Não</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Atividade de Login
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Último login"
                  value={usuario.ultimo_login ? format(new Date(usuario.ultimo_login), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Nunca acessou'}
                />
                <InfoRow label="Total de logins" value={usuario.login_count?.toString() || '0'} />
                <InfoRow label="Tentativas falhas" value={usuario.failed_login_count?.toString() || '0'} />
                {usuario.locked_until && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Conta bloqueada até</span>
                    </div>
                    <p className="text-sm mt-1">
                      {format(new Date(usuario.locked_until), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Histórico de Login */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Histórico de Login
                </CardTitle>
                <CardDescription>
                  Últimas {loginHistory.length} tentativas de acesso ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLoginHistory ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : loginHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum registro de login encontrado.
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Dispositivo</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loginHistory.slice(0, 20).map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              {record.success ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Sucesso
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Falha
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {record.ip_address || '—'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {parseUserAgent(record.user_agent)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {record.auth_method || 'password'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {record.failure_reason || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Redefinir Senha */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Redefinir Senha
                </CardTitle>
                <CardDescription>
                  {usuario.auth_user_id
                    ? 'Defina uma nova senha para este usuário acessar o sistema.'
                    : 'Este usuário ainda não tem conta de autenticação. Ao definir uma senha, uma conta será criada automaticamente.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!usuario.auth_user_id && (
                  <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Sem conta de autenticação</span>
                    </div>
                    <p className="text-sm text-amber-600 mt-1">
                      Este usuário existe em mt_users mas não possui auth_user_id.
                      Ao definir uma senha, uma conta no Supabase Auth será criada e vinculada automaticamente.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsResetPasswordOpen(true)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {usuario.auth_user_id ? 'Redefinir Senha' : 'Criar Conta e Definir Senha'}
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleSendCredentialsWhatsApp}
                    disabled={isSendingCredentials || (!usuario.telefone && !usuario.whatsapp)}
                  >
                    {isSendingCredentials ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Enviar Credenciais via WhatsApp
                      </>
                    )}
                  </Button>
                </div>
                {!usuario.telefone && !usuario.whatsapp && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cadastre um telefone para enviar credenciais via WhatsApp.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dialog: Redefinir Senha */}
          <Dialog open={isResetPasswordOpen} onOpenChange={(open) => {
            setIsResetPasswordOpen(open);
            if (!open) {
              setNewPassword('');
              setConfirmPassword('');
              setShowPassword(false);
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redefinir Senha</DialogTitle>
                <DialogDescription>
                  Defina uma nova senha para {usuario.nome}.
                  {!usuario.auth_user_id && ' Uma conta de autenticação será criada automaticamente.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive">As senhas não conferem</p>
                )}
                {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="text-sm text-destructive">A senha deve ter pelo menos 6 caracteres</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsResetPasswordOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowPassword(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={
                    isResettingPassword ||
                    !newPassword ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword
                  }
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Confirmar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Tab: Permissões */}
        <TabsContent value="permissoes" className="space-y-4">
          {/* Cargos (Roles) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Cargos Atribuídos
              </CardTitle>
              <CardDescription>
                Os cargos determinam quais módulos e ações o usuário pode acessar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cargos atuais */}
              {isLoadingUserRoles ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-3/4" />
                </div>
              ) : userRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum cargo atribuído.</p>
              ) : (
                <div className="space-y-2">
                  {userRoles.map((ur: any) => (
                    <div key={ur.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-medium text-sm">{ur.role?.nome}</span>
                          <span className="text-xs text-muted-foreground ml-2">Nível {ur.role?.nivel}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => removeRole.mutate(ur.id)}
                        disabled={removeRole.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Adicionar cargo */}
              <div className="flex gap-2">
                <Select
                  value={selectedRoleId}
                  onValueChange={setSelectedRoleId}
                  disabled={isLoadingRoles}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um cargo para adicionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles
                      .filter(role => !userRoles.some((ur: any) => ur.role_id === role.id))
                      .map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          <span>{role.nome}</span>
                          <span className="ml-2 text-muted-foreground text-xs">(nível {role.nivel})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedRoleId || assignRole.isPending}
                  onClick={() => {
                    if (selectedRoleId) {
                      assignRole.mutate({ roleId: selectedRoleId });
                      setSelectedRoleId('');
                    }
                  }}
                >
                  {assignRole.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Permissões herdadas dos cargos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Permissões por Módulo
              </CardTitle>
              <CardDescription>
                Permissões herdadas dos cargos atribuídos acima. Para ajustar permissões de um cargo, acesse{' '}
                <Link to="/configuracoes/cargos" className="text-primary hover:underline">
                  Configurações → Cargos
                </Link>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPerms ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(permissionsByModule).map(([moduleCode, moduleData]) => (
                    <div key={moduleCode}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {moduleData.name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 pl-2">
                        {moduleData.permissions.map(perm => {
                          const hasIt = userRoles.some((ur: any) =>
                            ur.role?.nivel <= 2 // tenant/platform admin tem tudo
                          );
                          return (
                            <Badge
                              key={perm.id}
                              variant={hasIt ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {perm.nome}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {Object.keys(permissionsByModule).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma permissão configurada. Atribua um cargo acima.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Preferências */}
        <TabsContent value="preferencias" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">E-mail</span>
                  <Badge variant={usuario.notificacoes_email ? 'default' : 'secondary'}>
                    {usuario.notificacoes_email ? 'Ativado' : 'Desativado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Push</span>
                  <Badge variant={usuario.notificacoes_push ? 'default' : 'secondary'}>
                    {usuario.notificacoes_push ? 'Ativado' : 'Desativado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <Badge variant={usuario.notificacoes_whatsapp ? 'default' : 'secondary'}>
                    {usuario.notificacoes_whatsapp ? 'Ativado' : 'Desativado'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localização & Interface
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Idioma" value={usuario.idioma || 'pt-BR'} />
                <InfoRow label="Fuso horário" value={usuario.timezone || 'America/Sao_Paulo'} />
                <InfoRow label="Tema" value={usuario.tema || 'Sistema'} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente auxiliar para exibir informações
interface InfoRowProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  link?: string;
}

function InfoRow({ label, value, icon, link }: InfoRowProps) {
  const content = value || <span className="text-muted-foreground italic">Não informado</span>;

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      {link ? (
        <Link to={link} className="text-primary hover:underline font-medium">
          {content}
        </Link>
      ) : (
        <span className="font-medium text-right">{content}</span>
      )}
    </div>
  );
}
