import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsersAdapter } from '@/hooks/useUsersAdapter';
import { useFranqueadosAdapter } from '@/hooks/useFranqueadosAdapter';
import { AppRole } from '@/types/user';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Loader2, Save, Shield, User } from 'lucide-react';

// Labels amigáveis para os roles
const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  diretoria: 'Diretoria',
  franqueado: 'Franqueado',
  central: 'Central',
  gerente: 'Gerente',
  marketing: 'Marketing',
  sdr: 'SDR',
  consultora_vendas: 'Consultora de Vendas',
  avaliadora: 'Avaliadora',
  aplicadora: 'Aplicadora',
  esteticista: 'Esteticista',
  unidade: 'Colaborador',
};

// Descrições dos roles
const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: 'Acesso total a todas as franquias e configuracoes do sistema',
  admin: 'Administrador da franquia com acesso total na unidade',
  diretoria: 'Diretoria regional com acesso total a sua regiao',
  franqueado: 'Dono ou gestor da franquia',
  central: 'Central de atendimento - leads e WhatsApp de todas unidades',
  gerente: 'Gerente da unidade - gerencia equipe e operacao',
  marketing: 'Equipe de marketing - campanhas, influenciadoras, formularios',
  sdr: 'Pre-vendas - prospeccao e qualificacao de leads',
  consultora_vendas: 'Consultora de vendas - atendimento ao cliente',
  avaliadora: 'Avaliadora tecnica de procedimentos',
  aplicadora: 'Profissional que aplica procedimentos - ve propria agenda',
  esteticista: 'Esteticista - ve propria agenda',
  unidade: 'Colaborador da unidade - somente visualizacao',
};

// Ordem de hierarquia para exibição
const ROLE_ORDER: AppRole[] = [
  'super_admin',
  'admin',
  'diretoria',
  'franqueado',
  'central',
  'gerente',
  'marketing',
  'sdr',
  'consultora_vendas',
  'avaliadora',
  'aplicadora',
  'esteticista',
  'unidade',
];

export default function UsuarioEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { users, isLoading, updateRole, updateUnidade, isUpdatingRole } = useUsersAdapter();
  const { franqueados, isLoading: isLoadingFranqueados } = useFranqueadosAdapter();

  const [selectedRole, setSelectedRole] = useState<AppRole>('unidade');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('none');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const usuario = users.find(u => u.id === id);

  // Inicializar valores do formulário quando o usuário for carregado
  useEffect(() => {
    if (usuario) {
      setSelectedRole(usuario.role);
      setSelectedUnidade(usuario.unidade_id || 'none');
    }
  }, [usuario]);

  const handleRoleChange = (value: AppRole) => {
    setSelectedRole(value);
    setHasChanges(true);
  };

  const handleUnidadeChange = (value: string) => {
    setSelectedUnidade(value);
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!usuario) return;

    setIsSaving(true);

    try {
      // Atualizar role se mudou
      if (selectedRole !== usuario.role) {
        updateRole({ userId: usuario.id, role: selectedRole });
      }

      // Atualizar unidade se mudou
      const newUnidadeId = selectedUnidade === 'none' ? null : selectedUnidade;
      if (newUnidadeId !== usuario.unidade_id) {
        updateUnidade({ userId: usuario.id, unidadeId: newUnidadeId });
      }

      toast.success('Usuario atualizado com sucesso!');
      navigate(`/usuarios/${usuario.id}`);
    } catch (error) {
      console.error('Erro ao atualizar usuario:', error);
      toast.error('Erro ao atualizar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isLoadingFranqueados) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-96 max-w-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!usuario) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/usuarios')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Usuario nao encontrado</h1>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">O usuario solicitado nao foi encontrado.</p>
              <Button className="mt-4" onClick={() => navigate('/usuarios')}>
                Voltar para lista
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/usuarios/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Usuario</h1>
            <p className="text-sm text-muted-foreground">
              {usuario.full_name || usuario.email}
            </p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="space-y-6">
            {/* Informações do Usuário (somente leitura) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  Informacoes do Usuario
                </CardTitle>
                <CardDescription>
                  Dados basicos do usuario (nao editaveis)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{usuario.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{usuario.full_name || 'Nao informado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nível de Acesso */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  Nivel de Acesso
                </CardTitle>
                <CardDescription>
                  Defina o perfil de permissoes do usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Perfil de Acesso</Label>
                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_ORDER.map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex flex-col">
                            <span>{ROLE_LABELS[role]}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRole && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {ROLE_DESCRIPTIONS[selectedRole]}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Unidade/Franquia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                  Unidade Vinculada
                </CardTitle>
                <CardDescription>
                  Vincule o usuario a uma unidade/franquia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade</Label>
                  <Select value={selectedUnidade} onValueChange={handleUnidadeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma unidade</SelectItem>
                      {franqueados.map((franquia) => (
                        <SelectItem key={franquia.id} value={franquia.id}>
                          <div className="flex items-center gap-2">
                            <span>{franquia.nome_fantasia}</span>
                            {!franquia.ativo && (
                              <span className="text-xs text-muted-foreground">(Inativa)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRole === 'super_admin' && (
                    <p className="text-sm text-amber-600 mt-2">
                      Super Admins tem acesso a todas as unidades, independente da vinculacao.
                    </p>
                  )}
                  {selectedRole === 'central' && (
                    <p className="text-sm text-blue-600 mt-2">
                      Usuarios da Central tem acesso a leads e WhatsApp de todas as unidades.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/usuarios/${id}`)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!hasChanges || isSaving || isUpdatingRole}
              >
                {(isSaving || isUpdatingRole) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Save className="h-4 w-4 mr-2" />
                Salvar Alteracoes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
