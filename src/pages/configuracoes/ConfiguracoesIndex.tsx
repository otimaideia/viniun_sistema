import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenantContext } from "@/contexts/TenantContext";
import {
  Settings,
  Shield,
  Puzzle,
  Bell,
  Star,
  DoorOpen,
  CalendarPlus,
  Database,
  Link2,
  FolderTree,
  Users,
  ArrowRight,
  Boxes,
  Building2,
  Store,
  UserCog,
  Building,
  UsersRound,
  Key,
  KeyRound,
  LayoutDashboard
} from "lucide-react";

type AccessLevel = 'platform' | 'tenant' | 'franchise' | 'user';

interface ConfigCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  available: boolean;
  badge?: string;
  minAccessLevel?: AccessLevel;
}

const configSections: ConfigCard[] = [
  {
    title: "Minha Empresa",
    description: "Logo, cores e dados da sua empresa",
    icon: <Building2 className="h-8 w-8 text-viniun-navy" />,
    href: "/configuracoes/minha-empresa",
    available: true,
    minAccessLevel: "franchise",
  },
  {
    title: "Integrações",
    description: "Configure APIs externas, WhatsApp e OpenAI",
    icon: <Link2 className="h-8 w-8 text-blue-600" />,
    href: "/configuracoes/integracoes",
    available: true,
    minAccessLevel: "franchise",
  },
  {
    title: "Franquias MT",
    description: "Gerencie franquias com isolamento por tenant",
    icon: <Store className="h-8 w-8 text-pink-600" />,
    href: "/configuracoes/franquias",
    available: true,
    minAccessLevel: "franchise",
    badge: "MT",
  },
  {
    title: "Usuários MT",
    description: "Gerencie usuários com permissões multi-tenant",
    icon: <UserCog className="h-8 w-8 text-teal-600" />,
    href: "/configuracoes/usuarios",
    available: true,
    minAccessLevel: "franchise",
    badge: "MT",
  },
  {
    title: "Departamentos",
    description: "Organize equipes por departamentos hierárquicos",
    icon: <Building className="h-8 w-8 text-violet-600" />,
    href: "/configuracoes/departamentos",
    available: true,
    minAccessLevel: "franchise",
    badge: "MT",
  },
  {
    title: "Equipes",
    description: "Gerencie equipes e times de trabalho",
    icon: <UsersRound className="h-8 w-8 text-rose-600" />,
    href: "/configuracoes/equipes",
    available: true,
    minAccessLevel: "franchise",
    badge: "MT",
  },
  {
    title: "Cargos e Permissões",
    description: "Defina cargos e o que cada um pode fazer",
    icon: <Key className="h-8 w-8 text-amber-600" />,
    href: "/configuracoes/cargos",
    available: true,
    minAccessLevel: "franchise",
    badge: "MT",
  },
  {
    title: "Cofre de Senhas",
    description: "Gerencie credenciais, chaves de API e tokens com seguranca",
    icon: <KeyRound className="h-8 w-8 text-red-600" />,
    href: "/configuracoes/cofre-senhas",
    available: true,
    minAccessLevel: "franchise" as AccessLevel,
    badge: "MT",
  },
  {
    title: "Perfis de Dashboard",
    description: "Configure dashboards dinâmicos por perfil profissional",
    icon: <LayoutDashboard className="h-8 w-8 text-sky-600" />,
    href: "/configuracoes/dashboard-profiles",
    available: true,
    minAccessLevel: "franchise",
    badge: "MT",
  },
  {
    title: "Diretorias",
    description: "Gerencie diretorias regionais e vincule franquias",
    icon: <FolderTree className="h-8 w-8 text-purple-600" />,
    href: "/configuracoes/diretorias",
    available: true,
    minAccessLevel: "tenant",
  },
  {
    title: "Permissões",
    description: "Configure papéis e permissões de acesso detalhadas",
    icon: <Shield className="h-8 w-8 text-green-600" />,
    href: "/configuracoes/permissoes",
    available: true,
    minAccessLevel: "tenant",
  },
  {
    title: "Módulos",
    description: "Ative ou desative módulos por franquia",
    icon: <Puzzle className="h-8 w-8 text-orange-600" />,
    href: "/configuracoes/modulos",
    available: true,
    minAccessLevel: "tenant",
  },
  {
    title: "Cadastro de Módulos",
    description: "Gerencie os módulos do sistema",
    icon: <Boxes className="h-8 w-8 text-cyan-600" />,
    href: "/configuracoes/modulos-crud",
    available: true,
    minAccessLevel: "platform",
  },
  {
    title: "Empresas (Tenants)",
    description: "Gerencie empresas/tenants do sistema multi-tenant",
    icon: <Building2 className="h-8 w-8 text-indigo-600" />,
    href: "/configuracoes/empresas",
    available: true,
    minAccessLevel: "platform",
    badge: "MT",
  },
  {
    title: "Notificações de Agendamento",
    description: "Configurar confirmações, lembretes e notificações automáticas",
    icon: <Bell className="h-8 w-8 text-amber-600" />,
    href: "/configuracoes/notificacoes-agendamento",
    available: true,
    minAccessLevel: "franchise",
  },
  {
    title: "NPS e Feedback",
    description: "Pesquisas de satisfação e avaliação do Google",
    icon: <Star className="h-8 w-8 text-yellow-500" />,
    href: "/configuracoes/nps",
    available: true,
    minAccessLevel: "franchise",
  },
  {
    title: "Gestão de Salas",
    description: "Cadastro de salas, horários e profissionais",
    icon: <DoorOpen className="h-8 w-8 text-teal-600" />,
    href: "/configuracoes/salas",
    available: true,
    minAccessLevel: "franchise",
  },
  {
    title: "Auto-Agendamento",
    description: "Agendamento online pelo cliente",
    icon: <CalendarPlus className="h-8 w-8 text-green-600" />,
    href: "/configuracoes/auto-agendamento",
    available: true,
    minAccessLevel: "franchise",
  },
  {
    title: "Notificações",
    description: "Configure alertas e notificações do sistema",
    icon: <Bell className="h-8 w-8 text-amber-600" />,
    href: "/configuracoes/notificacoes",
    available: false,
    badge: "Em breve",
  },
  {
    title: "Dados e Backup",
    description: "Exportação de dados e configurações de backup",
    icon: <Database className="h-8 w-8 text-slate-600" />,
    href: "/configuracoes/dados",
    available: false,
    minAccessLevel: "tenant",
    badge: "Em breve",
  },
];

const ACCESS_PRIORITY: Record<AccessLevel, number> = {
  platform: 1,
  tenant: 2,
  franchise: 3,
  user: 4,
};

const ConfiguracoesIndex = () => {
  const { accessLevel } = useTenantContext();

  const userPriority = ACCESS_PRIORITY[accessLevel as AccessLevel] || 4;

  const visibleSections = configSections.filter(section => {
    if (section.minAccessLevel) {
      const requiredPriority = ACCESS_PRIORITY[section.minAccessLevel] || 1;
      if (userPriority > requiredPriority) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      {/* Config Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleSections.map((config) => (
          <Card
            key={config.title}
            className={`relative overflow-hidden transition-all ${
              config.available
                ? "hover:shadow-lg hover:border-primary/50 cursor-pointer"
                : "opacity-70"
            }`}
          >
            {config.available ? (
              <Link to={config.href} className="block">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    {config.icon}
                    <div className="flex items-center gap-2">
                      {config.badge && (
                        <Badge variant="secondary">{config.badge}</Badge>
                      )}
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <CardTitle className="mt-4">{config.title}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
              </Link>
            ) : (
              <CardHeader>
                <div className="flex items-start justify-between">
                  {config.icon}
                  <div className="flex items-center gap-2">
                    {config.badge && (
                      <Badge variant="secondary">{config.badge}</Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="mt-4">{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              to="/aprovacoes"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Users className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Aprovação de Usuários</p>
                <p className="text-sm text-muted-foreground">
                  Gerencie solicitações de acesso
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
            </Link>
            <Link
              to="/servicos"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Settings className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Catálogo de Serviços</p>
                <p className="text-sm text-muted-foreground">
                  Gerencie serviços disponíveis
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracoesIndex;
