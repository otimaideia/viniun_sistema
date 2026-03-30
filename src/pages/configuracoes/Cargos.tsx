import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';
import { useRoles, type Role, type CreateRoleData } from '@/hooks/multitenant/useRolesAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Settings,
  Lock,
  ArrowLeft,
  Users,
  Crown,
  Building2,
  Store,
  User
} from 'lucide-react';

// Ícones por nível de role
const getRoleIcon = (nivel: number) => {
  switch (nivel) {
    case 0:
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 1:
      return <Building2 className="h-4 w-4 text-purple-500" />;
    case 2:
      return <Shield className="h-4 w-4 text-blue-500" />;
    case 3:
      return <Store className="h-4 w-4 text-green-500" />;
    default:
      return <User className="h-4 w-4 text-gray-500" />;
  }
};

// Badge de nível
const getNivelBadge = (nivel: number) => {
  const configs: Record<number, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    0: { label: 'Platform', variant: 'destructive' },
    1: { label: 'Super Admin', variant: 'default' },
    2: { label: 'Admin', variant: 'secondary' },
    3: { label: 'Gerente', variant: 'outline' },
  };

  const config = configs[nivel] || { label: `Nível ${nivel}`, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function Cargos() {
  const { accessLevel } = useTenantContext();
  const { roles, isLoading, createRole, updateRole, deleteRole } = useRoles();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<CreateRoleData>({
    codigo: '',
    nome: '',
    descricao: '',
    nivel: 100,
  });

  const isFranchiseAdmin = accessLevel === 'franchise';
  const canCreateRoles = accessLevel === 'platform' || accessLevel === 'tenant';

  // Verificar permissão de acesso - franchise admin pode ver e gerenciar permissões dos roles
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

  const handleCreate = async () => {
    try {
      await createRole.mutateAsync(formData);
      setIsCreateOpen(false);
      setFormData({ codigo: '', nome: '', descricao: '', nivel: 100 });
    } catch (error) {
      // Erro tratado no hook
    }
  };

  const handleUpdate = async () => {
    if (!editingRole) return;

    try {
      await updateRole.mutateAsync({
        id: editingRole.id,
        nome: formData.nome,
        descricao: formData.descricao,
        nivel: formData.nivel,
      });
      setEditingRole(null);
      setFormData({ codigo: '', nome: '', descricao: '', nivel: 100 });
    } catch (error) {
      // Erro tratado no hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRole.mutateAsync(id);
    } catch (error) {
      // Erro tratado no hook
    }
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      codigo: role.codigo,
      nome: role.nome,
      descricao: role.descricao || '',
      nivel: role.nivel,
    });
  };

  const closeEdit = () => {
    setEditingRole(null);
    setFormData({ codigo: '', nome: '', descricao: '', nivel: 100 });
  };

  // Filtrar roles visíveis por nível de acesso
  // Franchise admin só vê roles nível >= 3 (franchise + operacionais)
  const visibleRoles = isFranchiseAdmin
    ? roles.filter(r => r.nivel >= 3)
    : roles;

  // Agrupar roles por nível
  const rolesByLevel = visibleRoles.reduce((acc, role) => {
    const level = role.nivel <= 1 ? 'admin' : role.nivel <= 3 ? 'gerente' : 'operacional';
    if (!acc[level]) acc[level] = [];
    acc[level].push(role);
    return acc;
  }, {} as Record<string, Role[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Cargos e Roles
            </h1>
            <p className="text-muted-foreground">
              Gerencie os cargos do sistema e suas permissões
            </p>
          </div>
        </div>

        {canCreateRoles && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cargo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Cargo</DialogTitle>
              <DialogDescription>
                Defina um novo cargo/role para o sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  placeholder="ex: supervisor_vendas"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único, sem espaços
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  placeholder="ex: Supervisor de Vendas"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva as responsabilidades deste cargo..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">Nível Hierárquico</Label>
                <Input
                  id="nivel"
                  type="number"
                  min="4"
                  max="100"
                  value={formData.nivel}
                  onChange={(e) => setFormData({ ...formData, nivel: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-muted-foreground">
                  Quanto menor o número, maior o acesso. Níveis 0-3 são reservados para admins.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createRole.isPending || !formData.codigo || !formData.nome}>
                {createRole.isPending ? 'Criando...' : 'Criar Cargo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{visibleRoles.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{rolesByLevel.admin?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gerentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{rolesByLevel.gerente?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operacionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{rolesByLevel.operacional?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cargos</CardTitle>
          <CardDescription>
            Clique em "Permissões" para definir o que cada cargo pode fazer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : visibleRoles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum cargo cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role.nivel)}
                        <div>
                          <p className="font-medium">{role.nome}</p>
                          {role.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {role.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {role.codigo}
                      </code>
                    </TableCell>
                    <TableCell>{getNivelBadge(role.nivel)}</TableCell>
                    <TableCell>
                      {role.is_system ? (
                        <Badge variant="secondary">
                          <Lock className="h-3 w-3 mr-1" />
                          Sistema
                        </Badge>
                      ) : (
                        <Badge variant="outline">Customizado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/configuracoes/cargos/${role.id}/permissoes`}>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Permissões
                          </Button>
                        </Link>

                        {!role.is_system && canCreateRoles && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(role)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Cargo</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o cargo "{role.nome}"?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(role.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cargo</DialogTitle>
            <DialogDescription>
              Altere as informações do cargo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-codigo">Código</Label>
              <Input
                id="edit-codigo"
                value={formData.codigo}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O código não pode ser alterado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nivel">Nível Hierárquico</Label>
              <Input
                id="edit-nivel"
                type="number"
                min="4"
                max="100"
                value={formData.nivel}
                onChange={(e) => setFormData({ ...formData, nivel: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateRole.isPending || !formData.nome}>
              {updateRole.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
