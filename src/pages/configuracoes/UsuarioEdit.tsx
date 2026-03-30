import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  User,
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  Phone,
  Building2,
  Shield,
  Bell,
  Globe,
  Lock,
  Users,
  Plus,
  X,
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantContext } from '@/contexts/TenantContext';
import { useUserPermissions } from '@/hooks/multitenant/useUserPermissions';
import { useDepartments, useUserDepartments } from '@/hooks/multitenant/useDepartments';
import { useTeams } from '@/hooks/multitenant/useTeams';
import { useRoles, usePermissionsList, useUserRolesAdmin } from '@/hooks/multitenant/useRolesAdmin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Tenant, Franchise } from '@/types/multitenant';

// =============================================================================
// Componente: Aba de Permissões por Usuário
// Permite override de permissões do role (mt_user_permissions)
// =============================================================================

function UserPermissionsTab({ userId, selectedRoleId }: { userId: string; selectedRoleId: string }) {
  const { tenant } = useTenantContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { permissionsByModule, isLoading: isLoadingPermissions } = usePermissionsList();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Buscar permissões do role do usuário
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['mt-role-permissions-for-user', selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return [];
      const { data, error } = await supabase
        .from('mt_role_permissions')
        .select('permission_id, granted')
        .eq('role_id', selectedRoleId)
        .eq('granted', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedRoleId,
  });

  const rolePermissionIds = useMemo(
    () => new Set(rolePermissions.map(rp => rp.permission_id)),
    [rolePermissions]
  );

  // Buscar permissões específicas do usuário (overrides)
  const { data: userOverrides = [], isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['mt-user-permissions-edit', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mt_user_permissions')
        .select('id, permission_id, granted, reason')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const userOverrideMap = useMemo(() => {
    const map = new Map<string, { id: string; granted: boolean; reason?: string }>();
    userOverrides.forEach(o => map.set(o.permission_id, o));
    return map;
  }, [userOverrides]);

  // Mutation: Toggle permissão do usuário (criar/atualizar/deletar override)
  const toggleUserPermission = useMutation({
    mutationFn: async ({ permissionId, action }: {
      permissionId: string;
      action: 'grant' | 'revoke' | 'reset';
    }) => {
      const existing = userOverrideMap.get(permissionId);

      if (action === 'reset') {
        // Remover override - voltar para herdar do role
        if (existing) {
          // Log audit antes de deletar
          await logPermissionChange(userId, permissionId, existing.granted, null, 'reset');
          const { error } = await supabase
            .from('mt_user_permissions')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
        }
        return;
      }

      const granted = action === 'grant';

      if (existing) {
        await logPermissionChange(userId, permissionId, existing.granted, granted, 'update');
        const { error } = await supabase
          .from('mt_user_permissions')
          .update({
            granted,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        await logPermissionChange(userId, permissionId, null, granted, 'create');
        const { error } = await supabase
          .from('mt_user_permissions')
          .insert({
            user_id: userId,
            permission_id: permissionId,
            tenant_id: tenant?.id,
            granted,
            is_override: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mt-user-permissions-edit', userId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar permissão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Log de audit para mudanças de permissão (Task 4)
  const logPermissionChange = async (
    targetUserId: string,
    permissionId: string,
    oldGranted: boolean | null,
    newGranted: boolean | null,
    action: string
  ) => {
    try {
      await supabase.from('mt_audit_logs').insert({
        tenant_id: tenant?.id,
        action: `permission.${action}`,
        resource_type: 'user_permission',
        resource_id: targetUserId,
        resource_name: `permission:${permissionId}`,
        old_data: oldGranted !== null ? { granted: oldGranted } : null,
        new_data: newGranted !== null ? { granted: newGranted } : null,
        changed_fields: ['granted'],
      });
    } catch (err) {
      console.warn('[Audit] Erro ao registrar log:', err);
    }
  };

  // Filtrar módulos
  const filteredModules = useMemo(() => {
    if (!searchTerm) return permissionsByModule;
    const search = searchTerm.toLowerCase();
    const filtered: typeof permissionsByModule = {};
    Object.entries(permissionsByModule).forEach(([code, module]) => {
      const matchingPerms = module.permissions.filter(
        p => p.nome.toLowerCase().includes(search) ||
             p.codigo.toLowerCase().includes(search) ||
             p.descricao?.toLowerCase().includes(search)
      );
      if (matchingPerms.length > 0 || module.name.toLowerCase().includes(search)) {
        filtered[code] = {
          ...module,
          permissions: matchingPerms.length > 0 ? matchingPerms : module.permissions,
        };
      }
    });
    return filtered;
  }, [permissionsByModule, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    let total = 0, fromRole = 0, overrideGrant = 0, overrideRevoke = 0;
    Object.values(permissionsByModule).forEach(module => {
      module.permissions.forEach(perm => {
        total++;
        if (rolePermissionIds.has(perm.id)) fromRole++;
        const override = userOverrideMap.get(perm.id);
        if (override) {
          if (override.granted) overrideGrant++;
          else overrideRevoke++;
        }
      });
    });
    return { total, fromRole, overrideGrant, overrideRevoke };
  }, [permissionsByModule, rolePermissionIds, userOverrideMap]);

  // Determinar estado efetivo de uma permissão
  const getPermissionState = useCallback((permId: string): 'granted_role' | 'granted_override' | 'revoked_override' | 'denied' => {
    const override = userOverrideMap.get(permId);
    if (override) {
      return override.granted ? 'granted_override' : 'revoked_override';
    }
    return rolePermissionIds.has(permId) ? 'granted_role' : 'denied';
  }, [userOverrideMap, rolePermissionIds]);

  if (isLoadingPermissions || isLoadingOverrides) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Permissões herdadas do cargo são mostradas em azul. Você pode conceder ou revogar
          permissões específicas para este usuário (override). Clique para alternar entre
          os estados: <span className="font-medium text-green-600">concedida</span>,{' '}
          <span className="font-medium text-red-600">revogada</span>, ou{' '}
          <span className="font-medium text-muted-foreground">herdar do cargo</span>.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-lg font-bold">{stats.total}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Via Cargo</div>
          <div className="text-lg font-bold text-blue-600">{stats.fromRole}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Override +</div>
          <div className="text-lg font-bold text-green-600">{stats.overrideGrant}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Override -</div>
          <div className="text-lg font-bold text-red-600">{stats.overrideRevoke}</div>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar permissões..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Permissões por módulo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permissões por Módulo</CardTitle>
          <CardDescription>
            Clique nos botões para conceder (+), revogar (-) ou resetar (herdar do cargo)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            value={expandedModules}
            onValueChange={setExpandedModules}
            className="space-y-2"
          >
            {Object.entries(filteredModules).map(([moduleCode, module]) => {
              const modulePerms = module.permissions;
              const grantedCount = modulePerms.filter(p => {
                const state = getPermissionState(p.id);
                return state === 'granted_role' || state === 'granted_override';
              }).length;
              const overrideCount = modulePerms.filter(p => userOverrideMap.has(p.id)).length;

              return (
                <AccordionItem key={moduleCode} value={moduleCode} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{module.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {grantedCount}/{modulePerms.length}
                        </span>
                      </div>
                      {overrideCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {overrideCount} override{overrideCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {modulePerms.map((perm) => {
                        const state = getPermissionState(perm.id);
                        const hasOverride = userOverrideMap.has(perm.id);

                        return (
                          <div
                            key={perm.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                              state === 'granted_override' ? 'bg-green-50 border-green-200' :
                              state === 'revoked_override' ? 'bg-red-50 border-red-200' :
                              state === 'granted_role' ? 'bg-blue-50 border-blue-200' :
                              'bg-gray-50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{perm.nome}</span>
                                {state === 'granted_role' && !hasOverride && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 shrink-0">
                                    cargo
                                  </Badge>
                                )}
                                {hasOverride && (
                                  <Badge variant="outline" className={`text-xs shrink-0 ${
                                    state === 'granted_override' ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'
                                  }`}>
                                    override
                                  </Badge>
                                )}
                              </div>
                              <code className="text-xs text-muted-foreground">{perm.codigo}</code>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {/* Botão Conceder */}
                              <Button
                                type="button"
                                variant={state === 'granted_override' ? 'default' : 'outline'}
                                size="sm"
                                className={`h-7 w-7 p-0 ${state === 'granted_override' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => {
                                  if (state === 'granted_override') {
                                    toggleUserPermission.mutate({ permissionId: perm.id, action: 'reset' });
                                  } else {
                                    toggleUserPermission.mutate({ permissionId: perm.id, action: 'grant' });
                                  }
                                }}
                                disabled={toggleUserPermission.isPending}
                                title="Conceder (override)"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>

                              {/* Botão Revogar */}
                              <Button
                                type="button"
                                variant={state === 'revoked_override' ? 'default' : 'outline'}
                                size="sm"
                                className={`h-7 w-7 p-0 ${state === 'revoked_override' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                onClick={() => {
                                  if (state === 'revoked_override') {
                                    toggleUserPermission.mutate({ permissionId: perm.id, action: 'reset' });
                                  } else {
                                    toggleUserPermission.mutate({ permissionId: perm.id, action: 'revoke' });
                                  }
                                }}
                                disabled={toggleUserPermission.isPending}
                                title="Revogar (override)"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>

                              {/* Botão Reset (só aparece se tem override) */}
                              {hasOverride && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground"
                                  onClick={() => toggleUserPermission.mutate({ permissionId: perm.id, action: 'reset' })}
                                  disabled={toggleUserPermission.isPending}
                                  title="Resetar (herdar do cargo)"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {Object.keys(filteredModules).length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Nenhuma permissão encontrada para "{searchTerm}"
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// PÁGINA: Criar/Editar Usuário Multi-Tenant
// Formulário completo para gerenciamento de usuários
// =============================================================================

export default function UsuarioEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenant, franchise, accessLevel } = useTenantContext();
  const {
    hasPermission,
    isPlatformAdmin,
    isTenantAdmin,
    isFranchiseAdmin,
  } = useUserPermissions();
  const isEditing = !!id;

  // Permissões dinâmicas para seleção de tenant/franchise
  // Platform admin pode selecionar qualquer tenant
  // Tenant admin pode selecionar qualquer franquia do seu tenant
  // Franchise admin só pode criar usuários na sua franquia
  const canSelectTenant = isPlatformAdmin || hasPermission('usuarios.manage_tenant');
  const canSelectFranchise = isPlatformAdmin || isTenantAdmin || hasPermission('usuarios.manage_franchise');

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);

  // Hooks para departamentos e equipes
  const { departments, isLoading: isLoadingDepts } = useDepartments();
  const {
    userDepartments,
    assignDepartment,
    unassignDepartment,
    setPrimaryDepartment,
    isLoading: isLoadingUserDepts,
    refetch: refetchUserDepts
  } = useUserDepartments(id);
  const { teams, addMember, removeMember, isLoading: isLoadingTeams } = useTeams();

  // Hooks para roles/cargos
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const {
    userRoles,
    assignRole,
    removeRole: removeUserRole,
    isLoading: isLoadingUserRoles,
  } = useUserRolesAdmin(id || null);

  // Estado do role selecionado (ID do role em mt_roles)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  // Estado local para equipes do usuário (carregadas separadamente)
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [isLoadingUserTeams, setIsLoadingUserTeams] = useState(false);

  // Estado do formulário - pré-preencher com contexto do usuário atual
  const [formData, setFormData] = useState({
    tenant_id: searchParams.get('tenant') || (isFranchiseAdmin || isTenantAdmin ? tenant?.id || '' : ''),
    franchise_id: searchParams.get('franchise') || (isFranchiseAdmin ? franchise?.id || '' : ''),
    access_level: 'user',
    email: '',
    nome: '',
    nome_curto: '',
    telefone: '',
    whatsapp: '',
    cargo: '',
    departamento: '',
    matricula: '',
    idioma: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    tema: 'system',
    notificacoes_email: true,
    notificacoes_push: true,
    notificacoes_whatsapp: false,
    status: 'ativo',
    data_admissao: '',
    must_change_password: true,
    commission_role: '' as string,
  });

  // Carregar equipes do usuário
  const loadUserTeams = async () => {
    if (!id) return;
    setIsLoadingUserTeams(true);
    try {
      const { data, error } = await supabase
        .from('mt_team_members')
        .select(`
          *,
          team:mt_teams(id, codigo, nome, cor, icone)
        `)
        .eq('user_id', id)
        .eq('is_active', true);

      if (error) throw error;
      setUserTeams(data || []);
    } catch (err) {
      console.error('Erro ao carregar equipes do usuário:', err);
    } finally {
      setIsLoadingUserTeams(false);
    }
  };

  // Sincronizar selectedRoleId quando userRoles carregar
  useEffect(() => {
    if (userRoles.length > 0 && !selectedRoleId) {
      // Pegar o primeiro role ativo (normalmente so tem 1)
      setSelectedRoleId(userRoles[0]?.role_id || '');
    }
  }, [userRoles]);

  useEffect(() => {
    loadTenants();
    if (isEditing) {
      loadUsuario();
      loadUserTeams();
    }
  }, [id]);

  // Preencher tenant/franchise do contexto quando não estiver editando
  useEffect(() => {
    if (!isEditing && !formData.tenant_id && tenant?.id) {
      setFormData(prev => ({
        ...prev,
        tenant_id: tenant.id,
        franchise_id: isFranchiseAdmin && franchise?.id ? franchise.id : prev.franchise_id,
      }));
    }
  }, [tenant?.id, franchise?.id, isEditing, isFranchiseAdmin]);

  useEffect(() => {
    if (formData.tenant_id) {
      loadFranchises(formData.tenant_id);
    } else {
      setFranchises([]);
    }
  }, [formData.tenant_id]);

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

  const loadFranchises = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('mt_franchises')
        .select('id, nome, codigo')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('nome');

      if (error) throw error;
      setFranchises(data || []);
    } catch (error) {
      console.error('Erro ao carregar franquias:', error);
      setFranchises([]);
    }
  };

  const loadUsuario = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        tenant_id: data.tenant_id || '',
        franchise_id: data.franchise_id || '',
        access_level: data.access_level || 'user',
        email: data.email || '',
        nome: data.nome || '',
        nome_curto: data.nome_curto || '',
        telefone: data.telefone || '',
        whatsapp: data.whatsapp || '',
        cargo: data.cargo || '',
        departamento: data.departamento || '',
        matricula: data.matricula || '',
        idioma: data.idioma || 'pt-BR',
        timezone: data.timezone || 'America/Sao_Paulo',
        tema: data.tema || 'system',
        notificacoes_email: data.notificacoes_email ?? true,
        notificacoes_push: data.notificacoes_push ?? true,
        notificacoes_whatsapp: data.notificacoes_whatsapp ?? false,
        status: data.status || 'ativo',
        data_admissao: data.data_admissao || '',
        must_change_password: data.must_change_password ?? false,
        commission_role: data.commission_role || '',
      });
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

  // Sincronizar role do usuario em mt_user_roles
  const syncUserRole = async (userId: string, newRoleId: string, userTenantId: string, userFranchiseId: string | null) => {
    // Buscar roles atuais do usuario
    const { data: currentRoles, error: fetchError } = await supabase
      .from('mt_user_roles')
      .select('id, role_id')
      .eq('user_id', userId);

    if (fetchError) throw new Error(`Erro ao buscar roles: ${fetchError.message}`);

    const existingRoleIds = (currentRoles || []).map(r => r.role_id);

    if (newRoleId && !existingRoleIds.includes(newRoleId)) {
      // Remover roles anteriores (usuario tem 1 role principal)
      if (currentRoles && currentRoles.length > 0) {
        const { error: delError } = await supabase
          .from('mt_user_roles')
          .delete()
          .eq('user_id', userId);
        if (delError) throw new Error(`Erro ao remover cargo anterior: ${delError.message}`);
      }

      // Inserir novo role com tenant_id e franchise_id obrigatórios
      const { error: insError } = await supabase
        .from('mt_user_roles')
        .insert({
          user_id: userId,
          role_id: newRoleId,
          tenant_id: userTenantId,
          franchise_id: userFranchiseId || null,
        });
      if (insError) throw new Error(`Erro ao atribuir cargo: ${insError.message}`);
    } else if (!newRoleId && currentRoles && currentRoles.length > 0) {
      // Remover todos os roles se nenhum selecionado
      const { error: delError } = await supabase
        .from('mt_user_roles')
        .delete()
        .eq('user_id', userId);
      if (delError) throw new Error(`Erro ao remover cargo: ${delError.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.email || !formData.nome || !formData.access_level) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha e-mail, nome e nível de acesso.',
        variant: 'destructive',
      });
      return;
    }

    // Validar vínculo baseado no access_level
    if (['tenant_admin', 'franchise_admin', 'user'].includes(formData.access_level) && !formData.tenant_id) {
      toast({
        title: 'Empresa obrigatória',
        description: 'Selecione uma empresa para este nível de acesso.',
        variant: 'destructive',
      });
      return;
    }

    if (['franchise_admin', 'user'].includes(formData.access_level) && !formData.franchise_id) {
      toast({
        title: 'Franquia obrigatória',
        description: 'Selecione uma franquia para este nível de acesso.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        tenant_id: formData.tenant_id || null,
        franchise_id: formData.franchise_id || null,
        data_admissao: formData.data_admissao || null,
        commission_role: formData.commission_role || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('mt_users')
          .update(dataToSave)
          .eq('id', id);

        if (error) throw error;

        // Sincronizar role em mt_user_roles
        await syncUserRole(id!, selectedRoleId, dataToSave.tenant_id!, dataToSave.franchise_id);

      } else {
        const { data, error } = await supabase
          .from('mt_users')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;

        // Vincular role ao novo usuario
        if (selectedRoleId) {
          await syncUserRole(data.id, selectedRoleId, data.tenant_id, data.franchise_id);
        }

        toast({
          title: 'Usuário criado',
          description: `${formData.nome} foi criado com sucesso.`,
        });

        navigate(`/configuracoes/usuarios/${data.id}`);
        return;
      }

      toast({
        title: 'Usuário atualizado',
        description: `${formData.nome} foi atualizado com sucesso.`,
      });

      navigate(`/configuracoes/usuarios/${id}`);
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);

      // Verificar erro de e-mail duplicado
      if (error.code === '23505') {
        toast({
          title: 'E-mail já cadastrado',
          description: 'Este e-mail já está em uso por outro usuário.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao salvar',
          description: error.message || 'Não foi possível salvar o usuário.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handlers para departamentos
  const handleAssignDepartment = async (departmentId: string) => {
    if (!id) return;
    try {
      await assignDepartment(id, departmentId, userDepartments.length === 0);
      toast({
        title: 'Departamento vinculado',
        description: 'Usuário adicionado ao departamento.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao vincular departamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUnassignDepartment = async (departmentId: string) => {
    if (!id) return;
    try {
      await unassignDepartment(id, departmentId);
      toast({
        title: 'Departamento removido',
        description: 'Usuário removido do departamento.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover departamento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSetPrimaryDepartment = async (departmentId: string) => {
    if (!id) return;
    try {
      await setPrimaryDepartment(id, departmentId);
      toast({
        title: 'Departamento principal definido',
        description: 'Este é agora o departamento principal do usuário.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao definir departamento principal',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Handlers para equipes
  const handleAddToTeam = async (teamId: string, role: 'lider' | 'coordenador' | 'membro' = 'membro') => {
    if (!id) return;
    try {
      await addMember(teamId, id, role);
      await loadUserTeams();
      toast({
        title: 'Equipe vinculada',
        description: 'Usuário adicionado à equipe.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao vincular equipe',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveFromTeam = async (teamId: string) => {
    if (!id) return;
    try {
      await removeMember(teamId, id);
      await loadUserTeams();
      toast({
        title: 'Equipe removida',
        description: 'Usuário removido da equipe.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover da equipe',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filtrar departamentos e equipes já vinculados
  const assignedDeptIds = userDepartments.map((ud: any) => ud.department_id);
  const assignedTeamIds = userTeams.map((ut: any) => ut.team_id);
  const availableDepartments = departments.filter((d) => !assignedDeptIds.includes(d.id));
  const availableTeams = teams.filter((t) => !assignedTeamIds.includes(t.id));

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" type="button" asChild>
            <Link to={isEditing ? `/configuracoes/usuarios/${id}` : '/configuracoes/usuarios'}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? `Editando ${formData.nome}`
                : 'Preencha os dados para criar um novo usuário'}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="vinculo">Vínculo & Acesso</TabsTrigger>
          {isEditing && <TabsTrigger value="deptos-equipes">Departamentos & Equipes</TabsTrigger>}
          {isEditing && (isPlatformAdmin || isTenantAdmin) && (
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
          )}
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        {/* Tab: Dados Pessoais */}
        <TabsContent value="dados" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Identificação
                </CardTitle>
                <CardDescription>
                  Informações pessoais do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => updateField('nome', e.target.value)}
                    placeholder="Nome completo do usuário"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome_curto">Nome Curto</Label>
                  <Input
                    id="nome_curto"
                    value={formData.nome_curto}
                    onChange={(e) => updateField('nome_curto', e.target.value)}
                    placeholder="Apelido ou nome curto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="email@empresa.com.br"
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contato
                </CardTitle>
                <CardDescription>
                  Informações de contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => updateField('telefone', e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => updateField('whatsapp', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_admissao">Data de Admissão</Label>
                  <Input
                    id="data_admissao"
                    type="date"
                    value={formData.data_admissao}
                    onChange={(e) => updateField('data_admissao', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Vínculo & Acesso */}
        <TabsContent value="vinculo" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Vínculo Organizacional
                </CardTitle>
                <CardDescription>
                  Empresa e franquia do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Alerta para franchise_admin */}
                {isFranchiseAdmin && (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      Como gerente de unidade, você só pode criar usuários vinculados à sua franquia.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tenant_id">Empresa {!canSelectTenant && <Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />}</Label>
                  <Select
                    value={formData.tenant_id || '__none__'}
                    onValueChange={(value) => {
                      updateField('tenant_id', value === '__none__' ? '' : value);
                      updateField('franchise_id', ''); // Reset franquia ao mudar empresa
                    }}
                    disabled={!canSelectTenant}
                  >
                    <SelectTrigger className={!canSelectTenant ? 'opacity-60' : ''}>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma (Platform Admin)</SelectItem>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="franchise_id">Franquia {!canSelectFranchise && <Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />}</Label>
                  <Select
                    value={formData.franchise_id || (canSelectTenant ? '__all__' : undefined)}
                    onValueChange={(value) => updateField('franchise_id', value === '__all__' ? '' : value)}
                    disabled={!canSelectFranchise || !formData.tenant_id || franchises.length === 0}
                  >
                    <SelectTrigger className={!canSelectFranchise ? 'opacity-60' : ''}>
                      <SelectValue placeholder={
                        !canSelectFranchise && franchise
                          ? franchise.nome
                          : !formData.tenant_id
                            ? "Selecione uma empresa primeiro"
                            : franchises.length === 0
                              ? "Nenhuma franquia disponível"
                              : "Selecione a franquia"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {canSelectTenant && <SelectItem value="__all__">Todas as franquias</SelectItem>}
                      {franchises.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome} ({f.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo / Role *</Label>
                    <Select
                      value={selectedRoleId || '__none__'}
                      onValueChange={(value) => {
                        const roleId = value === '__none__' ? '' : value;
                        setSelectedRoleId(roleId);
                        // Atualizar campo texto de cargo com o nome do role
                        const role = roles.find(r => r.id === roleId);
                        updateField('cargo', role?.nome || '');
                      }}
                      disabled={isLoadingRoles}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingRoles ? "Carregando cargos..." : "Selecione o cargo"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem cargo definido</SelectItem>
                        {roles
                          .filter(r => {
                            // Franchise admin nao pode atribuir roles de nivel admin (0-2)
                            if (isFranchiseAdmin) return r.nivel >= 3;
                            if (isTenantAdmin) return r.nivel >= 1;
                            return true;
                          })
                          .map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <span>{role.nome}</span>
                              <span className="text-xs text-muted-foreground">
                                (nv. {role.nivel})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRoleId && (
                      <p className="text-xs text-muted-foreground">
                        As permissoes deste cargo sao gerenciadas em{' '}
                        <Link to={`/configuracoes/cargos/${selectedRoleId}/permissoes`} className="text-primary underline">
                          Cargos e Permissoes
                        </Link>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commission_role">Papel de Comissão</Label>
                    <Select
                      value={formData.commission_role || '__none__'}
                      onValueChange={(value) => updateField('commission_role', value === '__none__' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem papel de comissão</SelectItem>
                        <SelectItem value="consultora">Consultora</SelectItem>
                        <SelectItem value="supervisora">Supervisora</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="aplicadora">Aplicadora</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define o papel para cálculo automático de comissões
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="departamento">Departamento Principal</Label>
                    <Select
                      value={formData.departamento || '__none__'}
                      onValueChange={(value) => updateField('departamento', value === '__none__' ? '' : value)}
                      disabled={isLoadingDepts}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingDepts ? "Carregando..." : "Selecione o departamento"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.nome}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: dept.cor || '#6B7280' }}
                              />
                              {dept.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">
                        Vincule departamentos na aba "Departamentos & Equipes"
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matricula">Matrícula</Label>
                  <Input
                    id="matricula"
                    value={formData.matricula}
                    onChange={(e) => updateField('matricula', e.target.value)}
                    placeholder="Código de matrícula interno"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Nível de Acesso
                </CardTitle>
                <CardDescription>
                  Permissões e status do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access_level">Nível de Acesso *</Label>
                  <Select
                    value={formData.access_level}
                    onValueChange={(value) => updateField('access_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform_admin">Platform Admin (Acesso Total)</SelectItem>
                      <SelectItem value="tenant_admin">Tenant Admin (Admin da Empresa)</SelectItem>
                      <SelectItem value="franchise_admin">Franchise Admin (Admin da Franquia)</SelectItem>
                      <SelectItem value="user">Usuário (Acesso Básico)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.access_level === 'platform_admin' && 'Acesso total a todas as empresas e funcionalidades.'}
                    {formData.access_level === 'tenant_admin' && 'Gerencia a empresa e todas as suas franquias.'}
                    {formData.access_level === 'franchise_admin' && 'Gerencia apenas a franquia selecionada.'}
                    {formData.access_level === 'user' && 'Acesso básico conforme permissões específicas.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => updateField('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="must_change_password">Forçar troca de senha</Label>
                    <p className="text-xs text-muted-foreground">
                      Usuário deverá trocar a senha no próximo login
                    </p>
                  </div>
                  <Switch
                    id="must_change_password"
                    checked={formData.must_change_password}
                    onCheckedChange={(checked) => updateField('must_change_password', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Departamentos & Equipes (só para edição) */}
        {isEditing && (
          <TabsContent value="deptos-equipes" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Departamentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Departamentos Vinculados
                  </CardTitle>
                  <CardDescription>
                    Departamentos aos quais o usuário pertence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingUserDepts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : userDepartments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum departamento vinculado
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userDepartments.map((ud: any) => (
                        <div
                          key={ud.id}
                          className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: ud.department?.cor || '#6B7280' }}
                            />
                            <span className="font-medium">{ud.department?.nome}</span>
                            {ud.is_primary && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                Principal
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!ud.is_primary && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPrimaryDepartment(ud.department_id)}
                                title="Definir como principal"
                              >
                                <Star className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnassignDepartment(ud.department_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar departamento */}
                  {availableDepartments.length > 0 && (
                    <div className="pt-4 border-t">
                      <Label className="text-sm text-muted-foreground mb-2 block">Adicionar Departamento</Label>
                      <Select onValueChange={handleAssignDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDepartments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: dept.cor || '#6B7280' }}
                                />
                                {dept.nome}
                                {dept.parent && (
                                  <span className="text-muted-foreground text-xs">
                                    ({dept.parent.nome})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Equipes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Equipes Vinculadas
                  </CardTitle>
                  <CardDescription>
                    Equipes das quais o usuário faz parte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingUserTeams ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : userTeams.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma equipe vinculada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userTeams.map((ut: any) => (
                        <div
                          key={ut.id}
                          className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: ut.team?.cor || '#3B82F6' }}
                            />
                            <span className="font-medium">{ut.team?.nome}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {ut.role_in_team}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromTeam(ut.team_id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar equipe */}
                  {availableTeams.length > 0 && (
                    <div className="pt-4 border-t">
                      <Label className="text-sm text-muted-foreground mb-2 block">Adicionar à Equipe</Label>
                      <div className="flex gap-2">
                        <Select onValueChange={(value) => handleAddToTeam(value, 'membro')}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione uma equipe" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: team.cor || '#3B82F6' }}
                                  />
                                  {team.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        O usuário será adicionado como "membro". Altere o papel na página de detalhes da equipe.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Tab: Permissões do Usuário (override de role) */}
        {isEditing && (isPlatformAdmin || isTenantAdmin) && (
          <TabsContent value="permissoes" className="space-y-4">
            <UserPermissionsTab userId={id!} selectedRoleId={selectedRoleId} />
          </TabsContent>
        )}

        {/* Tab: Preferências */}
        <TabsContent value="preferencias" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Canais de notificação do usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notificacoes_email">Notificações por E-mail</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber alertas e comunicados por e-mail
                    </p>
                  </div>
                  <Switch
                    id="notificacoes_email"
                    checked={formData.notificacoes_email}
                    onCheckedChange={(checked) => updateField('notificacoes_email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notificacoes_push">Notificações Push</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber notificações no navegador
                    </p>
                  </div>
                  <Switch
                    id="notificacoes_push"
                    checked={formData.notificacoes_push}
                    onCheckedChange={(checked) => updateField('notificacoes_push', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notificacoes_whatsapp">Notificações WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber alertas importantes via WhatsApp
                    </p>
                  </div>
                  <Switch
                    id="notificacoes_whatsapp"
                    checked={formData.notificacoes_whatsapp}
                    onCheckedChange={(checked) => updateField('notificacoes_whatsapp', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Localização & Interface
                </CardTitle>
                <CardDescription>
                  Preferências de idioma e aparência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="idioma">Idioma</Label>
                  <Select
                    value={formData.idioma}
                    onValueChange={(value) => updateField('idioma', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => updateField('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                      <SelectItem value="America/Recife">Recife (GMT-3)</SelectItem>
                      <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tema">Tema</Label>
                  <Select
                    value={formData.tema}
                    onValueChange={(value) => updateField('tema', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Sistema (Automático)</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </form>
  );
}
