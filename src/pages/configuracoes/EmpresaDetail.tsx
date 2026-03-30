import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Edit,
  MapPin,
  User,
  Palette,
  Settings,
  Package,
  Grid3X3,
  Shield,
  Building,
  Globe,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Tenant, TenantBranding, Franchise } from '@/types/multitenant';

// =============================================================================
// PÁGINA: Detalhes da Empresa (Tenant)
// Visualização completa de uma empresa no sistema multi-tenant
// =============================================================================

interface TenantWithDetails extends Tenant {
  branding?: TenantBranding;
  franchises?: Franchise[];
  users?: any[];
  modules?: any[];
}

export default function EmpresaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carregar dados do tenant
  useEffect(() => {
    if (id) {
      loadTenant();
    }
  }, [id]);

  const loadTenant = async () => {
    setIsLoading(true);
    try {
      // Buscar tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('mt_tenants')
        .select('*')
        .eq('id', id)
        .single();

      if (tenantError) throw tenantError;

      // Buscar branding
      const { data: brandingData } = await supabase
        .from('mt_tenant_branding')
        .select('*')
        .eq('tenant_id', id)
        .single();

      // Buscar franquias
      const { data: franchisesData } = await supabase
        .from('mt_franchises')
        .select('*')
        .eq('tenant_id', id)
        .order('nome');

      // Buscar usuários
      const { data: usersData } = await supabase
        .from('mt_users')
        .select('*')
        .eq('tenant_id', id)
        .order('nome');

      // Buscar módulos
      const { data: modulesData } = await supabase
        .from('mt_tenant_modules')
        .select('*, module:mt_modules(*)')
        .eq('tenant_id', id);

      setTenant({
        ...tenantData,
        branding: brandingData || undefined,
        franchises: franchisesData || [],
        users: usersData || [],
        modules: modulesData || [],
      });
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
      toast({
        title: 'Erro ao carregar empresa',
        description: 'Não foi possível carregar os dados da empresa.',
        variant: 'destructive',
      });
      navigate('/configuracoes/empresas');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle status
  const toggleStatus = async () => {
    if (!tenant) return;

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

      loadTenant();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da empresa.',
        variant: 'destructive',
      });
    }
  };

  // Deletar tenant
  const handleDelete = async () => {
    if (!tenant) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('mt_tenants')
        .delete()
        .eq('id', tenant.id);

      if (error) throw error;

      toast({
        title: 'Empresa removida',
        description: 'A empresa foi removida com sucesso.',
      });

      navigate('/configuracoes/empresas');
    } catch (error: any) {
      console.error('Erro ao deletar empresa:', error);
      toast({
        title: 'Erro ao remover empresa',
        description: error.message || 'Não foi possível remover a empresa.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

  // Formatar data
  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">Empresa não encontrada</h2>
        <p className="text-muted-foreground mb-4">
          A empresa solicitada não existe ou foi removida.
        </p>
        <Button asChild>
          <Link to="/configuracoes/empresas">Voltar para lista</Link>
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
            <Link to="/configuracoes/empresas">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{tenant.nome_fantasia}</h1>
              {tenant.is_active ? (
                <Badge className="bg-green-100 text-green-700">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{tenant.razao_social}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadTenant}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={toggleStatus}>
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
          </Button>
          <Button asChild>
            <Link to={`/configuracoes/empresas/${tenant.id}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Franquias</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.franchises?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Limite: {tenant.max_franquias || 'Ilimitado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Limite: {tenant.max_usuarios || 'Ilimitado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.modules?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Módulos habilitados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plano</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold uppercase">{tenant.plano || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {tenant.data_expiracao
                ? `Expira: ${formatDate(tenant.data_expiracao)}`
                : 'Sem expiração'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com detalhes */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="franquias">Franquias</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
        </TabsList>

        {/* Tab: Dados Gerais */}
        <TabsContent value="dados" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Dados da Empresa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Dados da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Nome Fantasia" value={tenant.nome_fantasia} />
                <DataRow label="Razão Social" value={tenant.razao_social} />
                <DataRow label="CNPJ" value={tenant.cnpj} />
                <DataRow label="Slug" value={tenant.slug} />
                <DataRow label="Subdomínio" value={tenant.subdominio} />
                <DataRow label="Domínio Customizado" value={tenant.dominio_customizado} />
              </CardContent>
            </Card>

            {/* Endereço e Contato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço e Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow
                  label="Endereço"
                  value={
                    tenant.endereco
                      ? `${tenant.endereco}, ${tenant.numero || 's/n'}`
                      : undefined
                  }
                />
                <DataRow label="Bairro" value={tenant.bairro} />
                <DataRow
                  label="Cidade/UF"
                  value={tenant.cidade ? `${tenant.cidade}/${tenant.estado}` : undefined}
                />
                <DataRow label="CEP" value={tenant.cep} />
                <DataRow label="Telefone" value={tenant.telefone} />
                <DataRow label="E-mail" value={tenant.email} />
              </CardContent>
            </Card>

            {/* Responsável */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Responsável Legal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Nome" value={tenant.responsavel_nome} />
                <DataRow label="CPF" value={tenant.responsavel_cpf} />
                <DataRow label="Cargo" value={tenant.responsavel_cargo} />
                <DataRow label="E-mail" value={tenant.responsavel_email} />
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configurações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Fuso Horário" value={tenant.timezone} />
                <DataRow label="Idioma" value={tenant.idioma} />
                <DataRow label="Moeda" value={tenant.moeda} />
                <DataRow label="Data de Ativação" value={formatDate(tenant.data_ativacao)} />
                <DataRow label="Data de Expiração" value={formatDate(tenant.data_expiracao)} />
              </CardContent>
            </Card>

            {/* Limites */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Plano e Limites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Plano" value={tenant.plano?.toUpperCase()} />
                <DataRow
                  label="Máx. Franquias"
                  value={tenant.max_franquias?.toString() || 'Ilimitado'}
                />
                <DataRow
                  label="Máx. Usuários"
                  value={tenant.max_usuarios?.toString() || 'Ilimitado'}
                />
                <DataRow
                  label="Máx. Leads/mês"
                  value={tenant.max_leads_mes?.toString() || 'Ilimitado'}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Branding */}
        <TabsContent value="branding" className="space-y-4">
          {tenant.branding ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Cores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: tenant.branding.cor_primaria }}
                    />
                    <div>
                      <p className="text-sm font-medium">Cor Primária</p>
                      <code className="text-xs">{tenant.branding.cor_primaria}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded border"
                      style={{ backgroundColor: tenant.branding.cor_secundaria }}
                    />
                    <div>
                      <p className="text-sm font-medium">Cor Secundária</p>
                      <code className="text-xs">{tenant.branding.cor_secundaria}</code>
                    </div>
                  </div>
                  {tenant.branding.cor_acento && (
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded border"
                        style={{ backgroundColor: tenant.branding.cor_acento }}
                      />
                      <div>
                        <p className="text-sm font-medium">Cor de Acento</p>
                        <code className="text-xs">{tenant.branding.cor_acento}</code>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Logos e Fontes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tenant.branding.logo_url && (
                    <div>
                      <p className="text-sm font-medium mb-2">Logo Principal</p>
                      <img
                        src={tenant.branding.logo_url}
                        alt="Logo"
                        className="h-16 object-contain border rounded p-2"
                      />
                    </div>
                  )}
                  {tenant.branding.logo_escuro_url && (
                    <div>
                      <p className="text-sm font-medium mb-2">Logo (Modo Escuro)</p>
                      <img
                        src={tenant.branding.logo_escuro_url}
                        alt="Logo Escuro"
                        className="h-16 object-contain bg-gray-800 border rounded p-2"
                      />
                    </div>
                  )}
                  <DataRow label="Fonte Primária" value={tenant.branding.fonte_primaria} />
                  <DataRow label="Fonte Secundária" value={tenant.branding.fonte_secundaria} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Palette className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">
                  Nenhuma configuração de branding definida.
                </p>
                <Button asChild className="mt-4">
                  <Link to={`/configuracoes/empresas/${tenant.id}/editar`}>
                    Configurar Branding
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Franquias */}
        <TabsContent value="franquias" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                Franquias ({tenant.franchises?.length || 0})
              </CardTitle>
              <Button size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Nova Franquia
              </Button>
            </CardHeader>
            <CardContent>
              {tenant.franchises && tenant.franchises.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.franchises.map((franchise) => (
                      <TableRow key={franchise.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {franchise.codigo}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{franchise.nome}</TableCell>
                        <TableCell>
                          {franchise.cidade}/{franchise.estado}
                        </TableCell>
                        <TableCell>
                          {franchise.is_active ? (
                            <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhuma franquia cadastrada.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Usuários */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários ({tenant.users?.length || 0})
              </CardTitle>
              <Button size="sm">
                <Users className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </CardHeader>
            <CardContent>
              {tenant.users && tenant.users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenant.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.nome}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-green-100 text-green-700">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Módulos */}
        <TabsContent value="modulos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Módulos Habilitados ({tenant.modules?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenant.modules && tenant.modules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tenant.modules.map((tm) => (
                    <Badge
                      key={tm.id}
                      variant={tm.module?.is_core ? 'default' : 'secondary'}
                    >
                      {tm.module?.nome || tm.module_id}
                      {tm.module?.is_core && (
                        <span className="ml-1 text-xs opacity-70">CORE</span>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhum módulo habilitado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente{' '}
              <strong>{tenant.nome_fantasia}</strong> e todos os dados associados
              (franquias, usuários, leads, etc).
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

// Componente auxiliar para exibir dados
function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1 border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '-'}</span>
    </div>
  );
}
