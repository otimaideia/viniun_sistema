import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building,
  ArrowLeft,
  Edit,
  MapPin,
  Phone,
  Mail,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Building2,
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
import type { Franchise, Tenant } from '@/types/multitenant';

// =============================================================================
// PÁGINA: Detalhes da Franquia
// Visualização completa de uma franquia
// =============================================================================

interface FranchiseWithDetails extends Franchise {
  tenant?: Tenant;
  users?: Record<string, unknown>[];
  modules?: Record<string, unknown>[];
}

export default function FranquiaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [franchise, setFranchise] = useState<FranchiseWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadFranchise();
    }
  }, [id]);

  const loadFranchise = async () => {
    setIsLoading(true);
    try {
      // Buscar franquia
      const { data: franchiseData, error: franchiseError } = await supabase
        .from('mt_franchises')
        .select('*, tenant:mt_tenants(*)')
        .eq('id', id)
        .single();

      if (franchiseError) throw franchiseError;

      // Buscar usuários
      const { data: usersData } = await supabase
        .from('mt_users')
        .select('*')
        .eq('franchise_id', id)
        .order('nome');

      // Buscar módulos
      const { data: modulesData } = await supabase
        .from('mt_franchise_modules')
        .select('*, module:mt_modules(*)')
        .eq('franchise_id', id);

      setFranchise({
        ...franchiseData,
        users: usersData || [],
        modules: modulesData || [],
      });
    } catch (error) {
      console.error('Erro ao carregar franquia:', error);
      toast({
        title: 'Erro ao carregar franquia',
        description: 'Não foi possível carregar os dados da franquia.',
        variant: 'destructive',
      });
      navigate('/configuracoes/franquias');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async () => {
    if (!franchise) return;

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

      loadFranchise();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da franquia.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!franchise) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('mt_franchises')
        .delete()
        .eq('id', franchise.id);

      if (error) throw error;

      toast({
        title: 'Franquia removida',
        description: 'A franquia foi removida com sucesso.',
      });

      navigate('/configuracoes/franquias');
    } catch (error: unknown) {
      console.error('Erro ao deletar franquia:', error);
      toast({
        title: 'Erro ao remover franquia',
        description: error instanceof Error ? error.message : 'Não foi possível remover a franquia.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

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

  if (!franchise) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">Franquia não encontrada</h2>
        <p className="text-muted-foreground mb-4">
          A franquia solicitada não existe ou foi removida.
        </p>
        <Button asChild>
          <Link to="/configuracoes/franquias">Voltar para lista</Link>
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
            <Link to="/configuracoes/franquias">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{franchise.nome}</h1>
              <Badge variant="outline">{franchise.codigo}</Badge>
              {franchise.is_active ? (
                <Badge className="bg-green-100 text-green-700">Ativa</Badge>
              ) : (
                <Badge variant="secondary">Inativa</Badge>
              )}
            </div>
            {franchise.tenant && (
              <Link
                to={`/configuracoes/empresas/${franchise.tenant.id}`}
                className="text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Building2 className="h-4 w-4" />
                {franchise.tenant.nome_fantasia}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadFranchise}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={toggleStatus}>
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
          </Button>
          <Button asChild>
            <Link to={`/configuracoes/franquias/${franchise.id}/editar`}>
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{franchise.users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Usuários vinculados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Localização</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {franchise.cidade && franchise.estado
                ? `${franchise.cidade}/${franchise.estado}`
                : 'Não informada'}
            </div>
            <p className="text-xs text-muted-foreground">
              {franchise.endereco || 'Endereço não cadastrado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastro</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatDate(franchise.created_at)}</div>
            <p className="text-xs text-muted-foreground">
              Data de criação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com detalhes */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
        </TabsList>

        {/* Tab: Dados Gerais */}
        <TabsContent value="dados" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Dados da Franquia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Código" value={franchise.codigo} />
                <DataRow label="Nome" value={franchise.nome} />
                <DataRow label="CNPJ" value={franchise.cnpj} />
                <DataRow
                  label="Empresa"
                  value={franchise.tenant?.nome_fantasia}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow
                  label="Endereço"
                  value={
                    franchise.endereco
                      ? `${franchise.endereco}, ${franchise.numero || 's/n'}`
                      : undefined
                  }
                />
                <DataRow label="Bairro" value={franchise.bairro} />
                <DataRow
                  label="Cidade/UF"
                  value={
                    franchise.cidade
                      ? `${franchise.cidade}/${franchise.estado}`
                      : undefined
                  }
                />
                <DataRow label="CEP" value={franchise.cep} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Telefone" value={franchise.telefone} />
                <DataRow label="E-mail" value={franchise.email} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Nome" value={franchise.responsavel_nome} />
                <DataRow label="Telefone" value={franchise.responsavel_telefone} />
                <DataRow label="E-mail" value={franchise.responsavel_email} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Usuários */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários ({franchise.users?.length || 0})
              </CardTitle>
              <Button size="sm" asChild>
                <Link to={`/configuracoes/usuarios/novo?franchise=${franchise.id}`}>
                  Novo Usuário
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {franchise.users && franchise.users.length > 0 ? (
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
                    {franchise.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/configuracoes/usuarios/${user.id}`}
                            className="hover:text-primary"
                          >
                            {user.nome}
                          </Link>
                        </TableCell>
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
                  <p className="text-muted-foreground">Nenhum usuário vinculado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Módulos */}
        <TabsContent value="modulos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Módulos Habilitados ({franchise.modules?.length || 0})
              </CardTitle>
              <CardDescription>
                Módulos específicos desta franquia (além dos da empresa)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {franchise.modules && franchise.modules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {franchise.modules.map((fm) => (
                    <Badge key={fm.id} variant="secondary">
                      {fm.module?.nome || fm.module_id}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta franquia usa os módulos padrão da empresa.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir franquia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente{' '}
              <strong>{franchise.nome}</strong> e todos os dados associados.
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

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-1 border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '-'}</span>
    </div>
  );
}
