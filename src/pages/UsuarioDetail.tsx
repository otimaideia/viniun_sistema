import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { useUsersAdapter } from '@/hooks/useUsersAdapter';
import { useFranqueadosAdapter } from '@/hooks/useFranqueadosAdapter';
import { AppRole } from '@/types/user';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Edit,
  Mail,
  Shield,
  User,
  XCircle,
} from 'lucide-react';

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

// Cores dos badges por role
const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: 'bg-red-100 text-red-800 border-red-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  diretoria: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  franqueado: 'bg-blue-100 text-blue-800 border-blue-200',
  central: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  gerente: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  marketing: 'bg-pink-100 text-pink-800 border-pink-200',
  sdr: 'bg-orange-100 text-orange-800 border-orange-200',
  consultora_vendas: 'bg-amber-100 text-amber-800 border-amber-200',
  avaliadora: 'bg-teal-100 text-teal-800 border-teal-200',
  aplicadora: 'bg-lime-100 text-lime-800 border-lime-200',
  esteticista: 'bg-rose-100 text-rose-800 border-rose-200',
  unidade: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function UsuarioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, isLoading, approveUser, rejectUser, isApproving } = useUsersAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const usuario = users.find(u => u.id === id);
  const franquia = franqueados.find(f => f.id === usuario?.unidade_id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-96 max-w-3xl" />
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

  const handleToggleApproval = () => {
    if (usuario.is_approved) {
      rejectUser(usuario.id);
    } else {
      approveUser(usuario.id);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/usuarios')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{usuario.full_name || 'Sem nome'}</h1>
              <p className="text-sm text-muted-foreground">{usuario.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/usuarios/${usuario.id}/editar`}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        {/* Conteudo */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
          {/* Informacoes Basicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Informacoes Basicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{usuario.email}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nome Completo</p>
                  <p className="font-medium">{usuario.full_name || 'Nao informado'}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cadastrado em</p>
                  <p className="font-medium">
                    {format(new Date(usuario.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nivel de Acesso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                Nivel de Acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Perfil</p>
                <Badge className={`${ROLE_COLORS[usuario.role]} border`}>
                  {ROLE_LABELS[usuario.role]}
                </Badge>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Status</p>
                <div className="flex items-center gap-2">
                  {usuario.is_approved ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Aprovado
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Pendente
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {usuario.approved_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Aprovado em</p>
                    <p className="font-medium">
                      {format(new Date(usuario.approved_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={usuario.is_approved ? 'destructive' : 'default'}
                    className="w-full"
                    disabled={isApproving}
                  >
                    {usuario.is_approved ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Revogar Aprovacao
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar Usuario
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {usuario.is_approved ? 'Revogar aprovacao?' : 'Aprovar usuario?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {usuario.is_approved
                        ? `Tem certeza que deseja revogar a aprovacao de ${usuario.full_name || usuario.email}? O usuario perdera acesso ao sistema.`
                        : `Tem certeza que deseja aprovar ${usuario.full_name || usuario.email}? O usuario tera acesso ao sistema de acordo com seu nivel de permissao.`
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleToggleApproval}>
                      {usuario.is_approved ? 'Revogar' : 'Aprovar'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Unidade/Franquia */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-500" />
                Unidade Vinculada
              </CardTitle>
            </CardHeader>
            <CardContent>
              {franquia ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{franquia.nome_fantasia}</p>
                    <p className="text-sm text-muted-foreground">
                      {franquia.cidade && franquia.estado
                        ? `${franquia.cidade}, ${franquia.estado}`
                        : 'Localizacao nao informada'
                      }
                    </p>
                    {franquia.telefone && (
                      <p className="text-sm text-muted-foreground mt-1">{franquia.telefone}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={franquia.ativo
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {franquia.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhuma unidade vinculada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Edite o usuario para vincular a uma unidade
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
