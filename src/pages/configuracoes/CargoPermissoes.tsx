import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useRoles, usePermissionsList, useRolePermissions } from '@/hooks/multitenant/useRolesAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Shield,
  ArrowLeft,
  Search,
  Check,
  X,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Users,
  MessageSquare,
  Target,
  Calendar,
  FileText,
  Settings,
  Building2,
  TrendingUp,
  Megaphone,
  Briefcase,
  BarChart3,
  Zap,
  Link as LinkIcon,
  Bot,
  Package,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';

// Ícones por módulo
const getModuleIcon = (moduleCode: string) => {
  const icons: Record<string, React.ReactNode> = {
    dashboard: <LayoutDashboard className="h-4 w-4" />,
    leads: <Users className="h-4 w-4" />,
    funil: <Target className="h-4 w-4" />,
    agendamentos: <Calendar className="h-4 w-4" />,
    whatsapp: <MessageSquare className="h-4 w-4" />,
    chatbot: <Bot className="h-4 w-4" />,
    formularios: <FileText className="h-4 w-4" />,
    usuarios: <Users className="h-4 w-4" />,
    franqueados: <Building2 className="h-4 w-4" />,
    servicos: <Package className="h-4 w-4" />,
    metas: <TrendingUp className="h-4 w-4" />,
    influenciadoras: <Megaphone className="h-4 w-4" />,
    campanhas: <Megaphone className="h-4 w-4" />,
    parcerias: <Briefcase className="h-4 w-4" />,
    recrutamento: <UserPlus className="h-4 w-4" />,
    departamentos: <Building2 className="h-4 w-4" />,
    equipes: <Users className="h-4 w-4" />,
    relatorios: <BarChart3 className="h-4 w-4" />,
    configuracoes: <Settings className="h-4 w-4" />,
    integracoes: <LinkIcon className="h-4 w-4" />,
    automacoes: <Zap className="h-4 w-4" />,
  };

  return icons[moduleCode] || <Settings className="h-4 w-4" />;
};

// Cor da categoria
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    sistema: 'bg-gray-500',
    vendas: 'bg-green-500',
    operacao: 'bg-blue-500',
    comunicacao: 'bg-purple-500',
    marketing: 'bg-pink-500',
    gestao: 'bg-orange-500',
    rh: 'bg-cyan-500',
  };

  return colors[category] || 'bg-gray-500';
};

// Badge da categoria
const getCategoryBadge = (categoria: string) => {
  return <span className={`px-2 py-0.5 rounded text-xs text-white ${getCategoryColor(categoria)}`}>{categoria}</span>;
};

export default function CargoPermissoes() {
  const { id: roleId } = useParams<{ id: string }>();
  const { accessLevel } = useTenantContext();
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const { permissionsByModule, isLoading: isLoadingPermissions } = usePermissionsList();
  const {
    grantedPermissions,
    isLoading: isLoadingRolePermissions,
    togglePermission,
    grantAllModule,
    revokeAllModule,
    isGranted,
  } = useRolePermissions(roleId || null);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Encontrar o role atual
  const currentRole = roles.find(r => r.id === roleId);

  // Verificar permissão de acesso
  if (accessLevel !== 'platform' && accessLevel !== 'tenant' && accessLevel !== 'franchise') {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  const isLoading = isLoadingRoles || isLoadingPermissions || isLoadingRolePermissions;

  // Filtrar módulos por busca
  const filteredModules = useMemo(() => {
    if (!searchTerm) return permissionsByModule;

    const search = searchTerm.toLowerCase();
    const filtered: typeof permissionsByModule = {};

    Object.entries(permissionsByModule).forEach(([code, module]) => {
      const matchingPermissions = module.permissions.filter(
        p =>
          p.nome.toLowerCase().includes(search) ||
          p.codigo.toLowerCase().includes(search) ||
          p.descricao?.toLowerCase().includes(search)
      );

      if (matchingPermissions.length > 0 || module.name.toLowerCase().includes(search)) {
        filtered[code] = {
          ...module,
          permissions: matchingPermissions.length > 0 ? matchingPermissions : module.permissions,
        };
      }
    });

    return filtered;
  }, [permissionsByModule, searchTerm]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    let total = 0;
    let granted = 0;

    Object.values(permissionsByModule).forEach(module => {
      module.permissions.forEach(perm => {
        total++;
        if (isGranted(perm.id)) granted++;
      });
    });

    return { total, granted, percentage: total > 0 ? Math.round((granted / total) * 100) : 0 };
  }, [permissionsByModule, isGranted]);

  // Handler para toggle de permissão
  const handleToggle = async (permissionId: string, currentGranted: boolean) => {
    try {
      await togglePermission.mutateAsync({ permissionId, granted: !currentGranted });
    } catch (error) {
      // Erro tratado no hook
    }
  };

  // Handler para conceder todas as permissões de um módulo
  const handleGrantAll = async (moduleCode: string) => {
    const module = permissionsByModule[moduleCode];
    if (!module) return;

    const permissionIds = module.permissions.map(p => p.id);
    await grantAllModule.mutateAsync(permissionIds);
  };

  // Handler para revogar todas as permissões de um módulo
  const handleRevokeAll = async (moduleCode: string) => {
    const module = permissionsByModule[moduleCode];
    if (!module) return;

    const permissionIds = module.permissions.map(p => p.id);
    await revokeAllModule.mutateAsync(permissionIds);
  };

  // Calcular permissões concedidas por módulo
  const getModuleStats = (moduleCode: string) => {
    const module = permissionsByModule[moduleCode];
    if (!module) return { total: 0, granted: 0 };

    const total = module.permissions.length;
    const granted = module.permissions.filter(p => isGranted(p.id)).length;
    return { total, granted };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (!currentRole) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Cargo não encontrado</p>
        <Link to="/configuracoes/cargos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Cargos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/configuracoes/cargos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Permissões: {currentRole.nome}
            </h1>
            <p className="text-muted-foreground">
              Defina o que o cargo "{currentRole.nome}" pode fazer no sistema
            </p>
          </div>
        </div>

        <Badge variant={currentRole.is_system ? 'secondary' : 'outline'}>
          {currentRole.is_system ? 'Sistema' : 'Customizado'}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Permissões Concedidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {stats.granted}
              </span>
              <span className="text-muted-foreground">/ {stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Permissões Negadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {stats.total - stats.granted}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nível de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
              <span className="text-sm font-medium">{stats.percentage}%</span>
            </div>
          </CardContent>
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

      {/* Lista de Permissões por Módulo */}
      <Card>
        <CardHeader>
          <CardTitle>Permissões por Módulo</CardTitle>
          <CardDescription>
            Marque as permissões que este cargo deve ter
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
              const moduleStats = getModuleStats(moduleCode);
              const allGranted = moduleStats.granted === moduleStats.total;
              const noneGranted = moduleStats.granted === 0;

              return (
                <AccordionItem
                  key={moduleCode}
                  value={moduleCode}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(module.category)} bg-opacity-10`}>
                          {getModuleIcon(moduleCode)}
                        </div>
                        <div className="text-left">
                          <p className="font-medium">{module.name}</p>
                          <div className="flex items-center gap-2">
                            {getCategoryBadge(module.category)}
                            <span className="text-xs text-muted-foreground">
                              {moduleStats.granted}/{moduleStats.total} permissões
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {allGranted ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Check className="h-3 w-3 mr-1" />
                            Todas
                          </Badge>
                        ) : noneGranted ? (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" />
                            Nenhuma
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Parcial
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {/* Ações em lote */}
                      <div className="flex items-center gap-2 pb-4 border-b">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGrantAll(moduleCode)}
                          disabled={grantAllModule.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
                          Conceder Todas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeAll(moduleCode)}
                          disabled={revokeAllModule.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1 text-red-600" />
                          Revogar Todas
                        </Button>
                      </div>

                      {/* Lista de permissões */}
                      <div className="space-y-3">
                        {module.permissions.map((permission) => {
                          const granted = isGranted(permission.id);

                          return (
                            <div
                              key={permission.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                granted ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{permission.nome}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {permission.categoria}
                                  </Badge>
                                </div>
                                {permission.descricao && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {permission.descricao}
                                  </p>
                                )}
                                <code className="text-xs text-muted-foreground">
                                  {permission.codigo}
                                </code>
                              </div>

                              <Switch
                                checked={granted}
                                onCheckedChange={() => handleToggle(permission.id, granted)}
                                disabled={togglePermission.isPending}
                              />
                            </div>
                          );
                        })}
                      </div>
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
