import { useState, useMemo, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { usePermissionsAdapter } from "@/hooks/usePermissionsAdapter";
import { useTenantContext, useModules } from "@/contexts/TenantContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useUserPermissions } from "@/hooks/multitenant/useUserPermissions";
import { ModuleName } from "@/types/user";
import { Button } from "@/components/ui/button";
import {
  User,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
const logoViniun = "/images/logo-viniun.svg";
import { YESiaWidget } from "@/components/ai-assistant/YESiaWidget";

// Sub-components
import { MobileHeader, DesktopTopBar } from "./TopBar";
import { SidebarNav } from "./SidebarNav";
import { type NavItem, type NavSection } from "./SidebarSection";

// Navigation icons
import {
  LayoutDashboard,
  UserPlus,
  Settings,
  CalendarDays,
  Briefcase,
  MessageCircle,
  FileText,
  Megaphone,
  Target,
  Palette,
  BarChart3,
  Sparkles,
  Filter,
  CheckCircle,
  GitBranch,
  Bot,
  Signal,
  Smartphone,
  Handshake,
  Tag,
  Link2,
  FolderTree,
  Puzzle,
  Store,
  Globe,
  Trophy,
  TrendingUp,
  TrendingDown,
  Package,
  Zap,
  Webhook,
  UsersRound,
  Share2,
  List,
  DollarSign,
  Wallet,
  ArrowDownRight,
  ClipboardList,
  HelpCircle,
  GraduationCap,
  BookOpen,
  Award,
  Medal,
  Activity,
  Calculator,
  Clock,
  Printer,
  Fingerprint,
  FolderOpen,
  Landmark,
  ClipboardCheck,
  BrainCircuit,
  ListTodo,
  Tablet,
  DoorOpen,
  Scale,
  Bell,
  CalendarClock,
  Network,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

// Função para gerar slug a partir do nome
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function DashboardLayout({ children, defaultCollapsed = false }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultCollapsed);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const { user, logout } = useAuth();
  const { role, isAdmin, isUnidade, unidadeId, isLoading: profileLoading } = useUserProfileAdapter();
  const { franqueados } = useFranqueadosAdapter();
  const { canView, userRole, isLoading: permissionsLoading } = usePermissionsAdapter();
  const { tenant, accessLevel, isLoading: tenantLoading } = useTenantContext();
  const { canAccess: userCanAccess, isLoading: userPermsLoading } = useUserPermissions();
  const { logoUrl, logoWhiteUrl, primaryColor, isLoading: brandingLoading } = useBranding();
  const { modules: tenantModules, hasModule, isModuleActive } = useModules();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-colapsar sidebar em rotas de chat do WhatsApp (precisa de mais espaço)
  const isWhatsAppChat = location.pathname.startsWith('/whatsapp/conversas') || location.pathname.startsWith('/whatsapp/chat');
  useEffect(() => {
    if (isWhatsAppChat) {
      setSidebarCollapsed(true);
    }
  }, [isWhatsAppChat]);

  // Logo dinâmico baseado no tenant ou fallback para logo padrão
  const isLoadingBranding = tenantLoading || brandingLoading;
  const currentLogo = isLoadingBranding ? logoViniun : (logoUrl || logoViniun);
  const currentFavicon = isLoadingBranding ? "/favicon.png" : (logoWhiteUrl || "/favicon.png");

  // Encontra o slug da franquia do usuário
  const franquiaSlug = useMemo(() => {
    if (!isUnidade || !unidadeId || !franqueados.length) return null;
    const franquia = franqueados.find(f => f.id === unidadeId);
    return franquia ? generateSlug(franquia.nome_fantasia) : null;
  }, [isUnidade, unidadeId, franqueados]);

  // Item especial "Minha Franquia" para usuários de unidade
  const minhaFranquiaItem: NavItem | null = useMemo(() => {
    if (!isUnidade) return null;
    const baseUrl = franquiaSlug ? `/franquia/${franquiaSlug}` : "/franquia";
    return { href: baseUrl, label: "Minha Franquia", icon: Building2 };
  }, [isUnidade, franquiaSlug]);

  // ─── Navigation sections ──────────────────────────────────────────────────
  // IMPORTANTE: Todos os módulos de mt_modules devem ter um item correspondente aqui
  const allNavSections: NavSection[] = [
    {
      title: "PRINCIPAL",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
      ],
    },
    {
      title: "LEADS & VENDAS",
      items: [
        { href: "/leads/dashboard", label: "Dashboard Leads", icon: BarChart3, module: "leads" },
        { href: "/leads", label: "Leads", icon: Users, module: "leads" },
        { href: "/funil", label: "Funil de Vendas", icon: GitBranch, module: "funil" },
        { href: "/indicacoes", label: "Indicações", icon: UserPlus, module: "leads" },
        { href: "/metas", label: "Metas", icon: TrendingUp, module: "metas" },
        { href: "/ranking", label: "Ranking", icon: Trophy, module: "ranking" },
        { href: "/vendas", label: "Vendas", icon: DollarSign, module: "vendas",
          children: [
            { href: "/vendas", label: "Dashboard", icon: LayoutDashboard, module: "vendas" },
            { href: "/vendas/todas", label: "Todas as Vendas", icon: List, module: "vendas" },
            { href: "/vendas/tabela-precos", label: "Tabela de Preços", icon: List, module: "vendas" },
            { href: "/vendas/tratamentos", label: "Planos de Tratamento", icon: ClipboardList, module: "vendas" },
            { href: "/vendas/comissoes", label: "Comissões", icon: DollarSign, module: "vendas" },
            { href: "/vendas/relatorios", label: "Relatórios", icon: BarChart3, module: "vendas" },
          ],
        },
      ],
    },
    {
      title: "COMUNICAÇÃO",
      items: [
        { href: "/whatsapp", label: "WhatsApp Dashboard", icon: BarChart3, module: "whatsapp" },
        { href: "/whatsapp/conversas", label: "Conversas", icon: MessageCircle, module: "whatsapp" },
        { href: "/whatsapp/sessoes", label: "Sessões", icon: Smartphone, module: "whatsapp" },
        { href: "/whatsapp/automacoes", label: "Automações WA", icon: Bot, module: "whatsapp" },
        { href: "/whatsapp/filas", label: "Filas de Atendimento", icon: Users, module: "whatsapp" },
        { href: "/whatsapp/broadcast", label: "Disparo em Massa", icon: Megaphone, module: "broadcast" },
        { href: "/whatsapp/listas", label: "Listas Destinatários", icon: List, module: "broadcast" },
        { href: "/whatsapp/grupos", label: "Grupos WhatsApp", icon: UsersRound, module: "whatsapp" },
        { href: "/whatsapp/grupos/operacoes", label: "Operações de Grupos", icon: CalendarClock, module: "whatsapp" },
        { href: "/whatsapp/status", label: "Status WA", icon: Signal, module: "whatsapp" },
        {
          href: "/whatsapp/hybrid-config",
          label: "Integração Híbrida",
          icon: Zap,
          module: "whatsapp",
          minAccessLevel: 'franchise' as const,
          children: [
            { href: "/whatsapp/hybrid-config", label: "Configuração", icon: Settings, module: "whatsapp" },
            { href: "/whatsapp/providers", label: "Providers", icon: Smartphone, module: "whatsapp" },
            { href: "/whatsapp/routing", label: "Regras de Roteamento", icon: Filter, module: "whatsapp" },
            { href: "/whatsapp/custos", label: "Custos", icon: BarChart3, module: "whatsapp" },
            { href: "/whatsapp/meta-templates", label: "Templates Meta", icon: FileText, module: "whatsapp" },
            { href: "/whatsapp/routing-logs", label: "Logs de Roteamento", icon: List, module: "whatsapp" },
          ],
        },
        { href: "/whatsapp/bot-config", label: "Config Chatbot", icon: Settings, module: "chatbot" },
        { href: "/chatbot", label: "Chatbot IA", icon: Bot, module: "chatbot" },
        { href: "/meta-messenger/config", label: "Meta Messenger", icon: MessageCircle, module: "meta_messenger" },
        { href: "/meta-messenger/conversations", label: "Conversas Meta", icon: MessageCircle, module: "meta_messenger" },
      ],
    },
    {
      title: "OPERAÇÃO",
      items: [
        { href: "/agendamentos", label: "Agendamentos", icon: CalendarDays, module: "agendamentos" },
        { href: "/configuracoes/notificacoes-agendamento", label: "Notificações Agendamento", icon: Bell, module: "agendamentos" },
        { href: "/auditorias", label: "Auditorias", icon: ClipboardCheck, module: "auditorias" },
        { href: "/tablet/fila", label: "Tablet", icon: Tablet, module: "tablet_atendimento" },
        { href: "/formularios", label: "Formulários", icon: FileText, module: "formularios" },
        { href: "/servicos", label: "Serviços", icon: Package, module: "servicos" },
        { href: "/franqueados", label: "Franqueados", icon: Building2, module: "franqueados" },
        { href: "/produtividade", label: "Produtividade", icon: Activity, module: "produtividade",
          children: [
            { href: "/produtividade", label: "MEI Produtividade", icon: Activity, module: "produtividade" },
            { href: "/produtividade/ponto", label: "Cartão de Ponto", icon: Clock, module: "produtividade" },
            { href: "/produtividade/escala-impressao", label: "Escala Impressão", icon: Printer, module: "produtividade" },
            { href: "/produtividade/resumo", label: "Resumo Mensal", icon: BarChart3, module: "produtividade" },
            { href: "/meu-ponto", label: "Meu Ponto", icon: Fingerprint, module: "produtividade" },
            { href: "/minha-presenca", label: "Minha Presença", icon: ClipboardCheck, module: "produtividade" },
          ],
        },
        { href: "/checklist/dashboard", label: "Checklist", icon: ClipboardCheck, module: "checklist",
          children: [
            { href: "/checklist/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "checklist" },
            { href: "/checklist/diario", label: "Meu Checklist", icon: ClipboardCheck, module: "checklist" },
            { href: "/checklist", label: "Templates", icon: ClipboardList, module: "checklist", minAccessLevel: "franchise" },
            { href: "/checklist/diario/gestor", label: "Checklist Equipe", icon: Users, module: "checklist", minAccessLevel: "franchise" },
            { href: "/checklist/relatorios", label: "Relatórios", icon: BarChart3, module: "checklist", minAccessLevel: "franchise" },
          ],
        },
        { href: "/tarefas", label: "Tarefas", icon: ListTodo, module: "tarefas",
          children: [
            { href: "/tarefas/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "tarefas" },
            { href: "/tarefas", label: "Minhas Tarefas", icon: ListTodo, module: "tarefas" },
            { href: "/tarefas/configuracoes", label: "Configurações", icon: Settings, module: "tarefas", minAccessLevel: "franchise" },
          ],
        },
        { href: "/estoque", label: "Estoque", icon: Store, module: "estoque",
          children: [
            { href: "/estoque", label: "Dashboard", icon: LayoutDashboard, module: "estoque" },
            { href: "/estoque/insumos", label: "Insumos", icon: Package, module: "estoque" },
            { href: "/estoque/movimentacoes", label: "Movimentações", icon: List, module: "estoque" },
            { href: "/estoque/movimentacoes/saida", label: "Saída / Ajuste", icon: ArrowDownRight, module: "estoque" },
            { href: "/estoque/consumos", label: "Consumos", icon: BarChart3, module: "estoque" },
            { href: "/estoque/vinculos", label: "Vínculos Serviço", icon: Link2, module: "estoque" },
            { href: "/estoque/fornecedores", label: "Fornecedores", icon: Building2, module: "estoque" },
            { href: "/estoque/cotacao", label: "Cotação", icon: Scale, module: "estoque" },
          ],
        },
      ],
    },
    {
      title: "MARKETING & PARCERIAS",
      items: [
        { href: "/marketing", label: "Dashboard", icon: LayoutDashboard, module: "marketing" },
        { href: "/marketing/campanhas", label: "Campanhas", icon: Target, module: "campanhas" },
        {
          href: "/influenciadoras",
          label: "Influenciadoras",
          icon: Sparkles,
          module: "influenciadoras",
          children: [
            { href: "/influenciadoras/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "influenciadoras" },
            { href: "/influenciadoras/lista", label: "Listagem", icon: List, module: "influenciadoras" },
            { href: "/influenciadoras/indicacoes", label: "Indicações", icon: Share2, module: "influenciadoras" },
          ],
        },
        { href: "/promocoes", label: "Promoções", icon: Tag, module: "promocoes" },
        { href: "/parcerias", label: "Parcerias", icon: Handshake, module: "parcerias" },
        { href: "/marketing/galeria", label: "Galeria de Artes", icon: Palette, module: "marketing" },
      ],
    },
    {
      title: "PROCESSOS",
      module: "processos",
      items: [
        { href: "/processos/dashboard", label: "Dashboard POPs", icon: LayoutDashboard, module: "processos" },
        { href: "/processos", label: "Procedimentos", icon: ClipboardList, module: "processos" },
        { href: "/processos/categorias", label: "Categorias", icon: FolderTree, module: "processos" },
        { href: "/faq", label: "Perguntas Frequentes", icon: HelpCircle, module: "processos" },
        { href: "/faq/dashboard", label: "FAQ Analytics", icon: BarChart3, module: "processos", minAccessLevel: 'tenant' as const },
      ],
    },
    {
      title: "TREINAMENTOS",
      module: "treinamentos",
      items: [
        { href: "/treinamentos", label: "Dashboard", icon: LayoutDashboard, module: "treinamentos" },
        { href: "/treinamentos/trilhas", label: "Trilhas", icon: GraduationCap, module: "treinamentos" },
        { href: "/aprender", label: "Meu Aprendizado", icon: BookOpen, module: "treinamentos" },
        { href: "/gamificacao", label: "Gamificação", icon: Trophy, module: "treinamentos" },
        { href: "/gamificacao/ranking", label: "Ranking", icon: Medal, module: "treinamentos" },
        { href: "/gamificacao/conquistas", label: "Conquistas", icon: Award, module: "treinamentos" },
      ],
    },
    {
      title: "INTELIGÊNCIA ARTIFICIAL",
      module: "ai_agents" as ModuleName,
      items: [
        { href: "/ia", label: "YESia Dashboard", icon: BrainCircuit, module: "ai_agents" as ModuleName },
        { href: "/ia/agentes", label: "Agentes IA", icon: Bot, module: "ai_agents" as ModuleName },
        { href: "/ia/custos", label: "Custos & Tokens", icon: DollarSign, module: "ai_agents" as ModuleName, minAccessLevel: "franchise" as const },
        { href: "/ia/config", label: "Configuração IA", icon: Settings, module: "ai_agents" as ModuleName, minAccessLevel: "tenant" as const },
      ],
    },
    {
      title: "RH",
      items: [
        { href: "/recrutamento", label: "Recrutamento", icon: Briefcase, module: "recrutamento" },
      ],
    },
    {
      title: "IMOBILIÁRIO",
      items: [
        { href: "/imoveis/dashboard", label: "Dashboard Imóveis", icon: BarChart3, module: "imoveis" },
        { href: "/imoveis", label: "Imóveis", icon: Building2, module: "imoveis" },
        { href: "/proprietarios", label: "Proprietários", icon: UserPlus, module: "proprietarios_imoveis" },
        { href: "/captacao", label: "Captação", icon: Target, module: "captacao" },
        { href: "/corretores", label: "Corretores", icon: Briefcase, module: "corretores" },
        { href: "/edificios", label: "Edifícios", icon: Landmark, module: "edificios" },
        { href: "/construtoras", label: "Construtoras", icon: Package, module: "construtoras" },
        { href: "/clientes-imoveis", label: "Clientes", icon: UsersRound, module: "clientes_imoveis" },
        { href: "/imoveis/consultas", label: "Consultas", icon: MessageCircle, module: "consultas_imoveis" },
        { href: "/imoveis/tabelas-preco", label: "Tabelas de Preço", icon: DollarSign, module: "tabelas_preco" },
        { href: "/imoveis/rede", label: "Rede Colaborativa", icon: Network, module: "tabelas_rede" },
        { href: "/imoveis/portais", label: "Portais", icon: Globe, module: "portais_imoveis" },
        { href: "/imoveis/pedidos", label: "Pedidos", icon: ClipboardList, module: "pedidos_imoveis" },
        { href: "/imoveis/email-marketing", label: "Email Marketing", icon: Megaphone, module: "email_marketing_imoveis" },
        { href: "/imoveis/conteudo", label: "Conteúdo", icon: FileText, module: "conteudo_imoveis" },
        { href: "/imoveis/relatorios", label: "Relatórios", icon: TrendingUp, module: "relatorios_imoveis" },
        { href: "/imoveis/configuracoes", label: "Configurações", icon: Settings, module: "imoveis", minAccessLevel: "tenant" as const },
        { href: "/configuracoes/localizacoes", label: "Localizações", icon: Globe, module: "localizacoes", minAccessLevel: "tenant" as const },
      ],
    },
    {
      title: "ADMINISTRAÇÃO",
      items: [
        { href: "/documentos", label: "Documentos", icon: FolderOpen, module: "documentos", minAccessLevel: "franchise" as const },
        { href: "/relatorios", label: "Relatórios", icon: BarChart3, module: "relatorios" },
        { href: "/relatorios/diarios", label: "Relatório Diário", icon: BarChart3, module: "relatorios" },
        { href: "/relatorios/ocupacao", label: "Ocupação Salas", icon: DoorOpen, module: "relatorios" },
        { href: "/usuarios", label: "Usuários", icon: Shield, module: "usuarios" },
        { href: "/aprovacoes", label: "Aprovações", icon: CheckCircle, module: "aprovacoes" },
        { href: "/financeiro", label: "Financeiro", icon: Wallet, module: "financeiro",
          children: [
            { href: "/financeiro", label: "Dashboard", icon: LayoutDashboard, module: "financeiro" },
            { href: "/financeiro/receitas", label: "Receitas", icon: TrendingUp, module: "financeiro" },
            { href: "/financeiro/despesas", label: "Despesas", icon: TrendingDown, module: "financeiro" },
            { href: "/financeiro/contas", label: "Contas", icon: Building2, module: "financeiro" },
            { href: "/financeiro/folha", label: "Folha", icon: Users, module: "financeiro" },
            { href: "/financeiro/conciliacao", label: "Conciliação", icon: Link2, module: "financeiro" },
            { href: "/financeiro/projecao", label: "Projeção", icon: Target, module: "projecao" },
            { href: "/financeiro/categorias", label: "Categorias", icon: FolderTree, module: "financeiro" },
            { href: "/financeiro/relatorios", label: "Relatórios", icon: BarChart3, module: "financeiro" },
          ],
        },
        { href: "/patrimonio", label: "Patrimônio", icon: Landmark, module: "patrimonio" as ModuleName,
          children: [
            { href: "/patrimonio", label: "Dashboard", icon: LayoutDashboard, module: "patrimonio" as ModuleName },
            { href: "/patrimonio/ativos", label: "Ativos", icon: List, module: "patrimonio" as ModuleName },
            { href: "/patrimonio/categorias", label: "Categorias", icon: FolderTree, module: "patrimonio" as ModuleName },
            { href: "/patrimonio/relatorios", label: "Relatórios", icon: BarChart3, module: "patrimonio" as ModuleName },
          ],
        },
        { href: "/precificacao", label: "Precificação", icon: Calculator, module: "precificacao" as ModuleName,
          children: [
            { href: "/precificacao", label: "Dashboard", icon: LayoutDashboard, module: "precificacao" as ModuleName },
            { href: "/precificacao/concorrencia", label: "Análise Competitiva", icon: BarChart3, module: "precificacao" as ModuleName },
            { href: "/precificacao/concorrentes", label: "Concorrentes", icon: Building2, module: "precificacao" as ModuleName },
          ],
        },
        { href: "/automacoes", label: "Automações", icon: Zap, module: "automacoes" },
        { href: "/api-webhooks", label: "API & Webhooks", icon: Webhook, module: "api_webhooks" },
        { href: "/yesia", label: "YESia", icon: BrainCircuit, module: "yesia" },
        {
          href: "/configuracoes",
          label: "Configurações",
          icon: Settings,
          module: "configuracoes",
          children: [
            { href: "/configuracoes/empresas", label: "Empresas", icon: Globe, module: "configuracoes", minAccessLevel: "platform" },
            { href: "/configuracoes/franquias", label: "Franquias", icon: Store, module: "configuracoes" },
            { href: "/configuracoes/usuarios", label: "Usuários MT", icon: Users, module: "configuracoes" },
            { href: "/configuracoes/departamentos", label: "Departamentos", icon: FolderTree, module: "departamentos" },
            { href: "/configuracoes/equipes", label: "Equipes", icon: UsersRound, module: "equipes" },
            { href: "/configuracoes/cargos", label: "Cargos e Permissões", icon: Shield, module: "configuracoes", minAccessLevel: "franchise" },
            { href: "/configuracoes/integracoes", label: "Integrações", icon: Link2, module: "integracoes" },
            { href: "/configuracoes/diretorias", label: "Diretorias", icon: Building2, module: "diretorias" },
            { href: "/configuracoes/permissoes", label: "Permissões", icon: Shield, module: "configuracoes", minAccessLevel: "tenant" },
            { href: "/configuracoes/modulos", label: "Módulos", icon: Puzzle, module: "configuracoes", minAccessLevel: "tenant" },
          ],
        },
      ],
    },
  ];

  // ─── Module filtering logic ───────────────────────────────────────────────

  const moduleCodeToSidebarModule: Record<string, string[]> = {
    'dashboard': ['dashboard'],
    'leads': ['leads'],
    'funil': ['funil'],
    'agendamentos': ['agendamentos'],
    'whatsapp': ['whatsapp'],
    'chatbot': ['chatbot'],
    'formularios': ['formularios'],
    'influenciadoras': ['influenciadoras'],
    'parcerias': ['parcerias'],
    'campanhas': ['campanhas', 'marketing'],
    'marketing': ['marketing', 'campanhas'],
    'recrutamento': ['recrutamento'],
    'metas': ['metas'],
    'franqueados': ['franqueados'],
    'servicos': ['servicos'],
    'usuarios': ['usuarios', 'aprovacoes'],
    'relatorios': ['relatorios'],
    'integracoes': ['integracoes'],
    'automacoes': ['automacoes'],
    'api_webhooks': ['api_webhooks'],
    'aprovacoes': ['aprovacoes'],
    'configuracoes': ['configuracoes'],
    'departamentos': ['departamentos'],
    'equipes': ['equipes'],
    'diretorias': ['diretorias'],
    'ranking': ['ranking'],
    'estoque': ['estoque'],
    'vendas': ['vendas'],
    'financeiro': ['financeiro'],
    'patrimonio': ['patrimonio'],
    'produtividade': ['produtividade'],
    'ai_agents': ['ai_agents'],
    'yesia': ['yesia'],
    'promocoes': ['promocoes'],
    'broadcast': ['broadcast'],
    'meta_messenger': ['meta_messenger'],
    'checklist': ['checklist'],
    'tarefas': ['tarefas'],
    'processos': ['processos'],
    'treinamentos': ['treinamentos'],
    'documentos': ['documentos'],
    'projecao': ['projecao'],
    'precificacao': ['precificacao'],
    'auditorias': ['auditorias'],
    'tablet_atendimento': ['tablet_atendimento'],
    // IMOBILIÁRIO
    'localizacoes': ['localizacoes'],
    'edificios': ['edificios'],
    'construtoras': ['construtoras'],
    'imoveis': ['imoveis'],
    'tabelas_preco': ['tabelas_preco'],
    'tabelas_rede': ['tabelas_rede'],
    'proprietarios_imoveis': ['proprietarios_imoveis'],
    'captacao': ['captacao'],
    'corretores': ['corretores'],
    'clientes_imoveis': ['clientes_imoveis'],
    'consultas_imoveis': ['consultas_imoveis'],
    'portais_imoveis': ['portais_imoveis'],
    'pedidos_imoveis': ['pedidos_imoveis'],
    'email_marketing_imoveis': ['email_marketing_imoveis'],
    'conteudo_imoveis': ['conteudo_imoveis'],
    'relatorios_imoveis': ['relatorios_imoveis'],
  };

  const isModuleEnabled = (moduleName: string): boolean => {
    if (!tenantModules || tenantModules.length === 0) return true;
    for (const [mtCode, sidebarModules] of Object.entries(moduleCodeToSidebarModule)) {
      if (sidebarModules.includes(moduleName)) {
        const isActive = isModuleActive(mtCode);
        const module = tenantModules.find(m => m.codigo === mtCode);
        if (module?.is_core) return true;
        return isActive;
      }
    }
    return true;
  };

  const useMTModules = tenantModules && tenantModules.length > 0;

  const ACCESS_LEVEL_PRIORITY: Record<string, number> = {
    'platform': 1, 'tenant': 2, 'franchise': 3, 'user': 4,
  };

  const hasAccessLevel = (minLevel?: string): boolean => {
    if (!minLevel) return true;
    const userPriority = ACCESS_LEVEL_PRIORITY[accessLevel] || 4;
    const requiredPriority = ACCESS_LEVEL_PRIORITY[minLevel] || 1;
    return userPriority <= requiredPriority;
  };

  const filteredNavSections = useMemo(() => {
    if (permissionsLoading || tenantLoading) return [];
    if (accessLevel === 'user' && userPermsLoading) return [];

    return allNavSections
      .map((section) => {
        if (section.module) {
          if (useMTModules) {
            if (!isModuleEnabled(section.module)) return null;
            if (accessLevel === 'user' && !userCanAccess(section.module)) return null;
          } else {
            if (!canView(section.module)) return null;
          }
        }

        const filteredItems = section.items
          .filter((item) => {
            if (!hasAccessLevel(item.minAccessLevel)) return false;
            if (!item.module) return true;
            if (useMTModules) {
              if (!isModuleEnabled(item.module)) return false;
              if (accessLevel === 'user') return userCanAccess(item.module);
              return true;
            } else {
              return canView(item.module);
            }
          })
          .map((item) => {
            if (item.children) {
              const filteredChildren = item.children.filter((child) => {
                if (!hasAccessLevel(child.minAccessLevel)) return false;
                if (!child.module) return true;
                if (useMTModules) return isModuleEnabled(child.module);
                return canView(child.module);
              });
              return { ...item, children: filteredChildren };
            }
            return item;
          });

        if (filteredItems.length === 0) return null;
        return { ...section, items: filteredItems };
      })
      .filter((section): section is NavSection => section !== null);
  }, [canView, permissionsLoading, tenantLoading, tenantModules, isModuleActive, useMTModules, accessLevel, userCanAccess, userPermsLoading]);

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const navSections = (profileLoading || permissionsLoading) ? [] : filteredNavSections;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  const getRoleBadge = () => {
    if (role === "super_admin") {
      return (
        <Badge variant="default" className="text-xs bg-primary">
          <Shield className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    }
    if (role === "admin") {
      return (
        <Badge variant="secondary" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    if (role === "central") {
      return (
        <Badge variant="secondary" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          Central
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <Building2 className="h-3 w-3 mr-1" />
        Unidade
      </Badge>
    );
  };

  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";
  const mainMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64";

  return (
    <div className="min-h-svh bg-background">
      {/* Mobile Header */}
      <MobileHeader
        userEmail={user?.email}
        role={role}
        currentLogo={currentLogo}
        tenantName={tenant?.nome_fantasia || "Viniun"}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onLogout={handleLogout}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Navegação principal"
        className={cn(
          "fixed left-0 top-0 z-40 h-full bg-card border-r border-border transform transition-all duration-200 ease-in-out lg:translate-x-0",
          sidebarWidth,
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-center h-16 border-b border-border px-2 relative">
            {sidebarCollapsed ? (
              <img src={currentFavicon} alt={tenant?.nome_fantasia || "Viniun"} className="h-8 w-8 object-contain" />
            ) : (
              <img src={currentLogo} alt={tenant?.nome_fantasia || "Viniun"} className="h-10 object-contain" />
            )}

            {/* Collapse Button - Desktop only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-card border border-border shadow-sm hidden lg:flex"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronLeft className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Navigation */}
          <SidebarNav
            sections={navSections}
            collapsed={sidebarCollapsed}
            currentPath={location.pathname}
            expandedMenus={expandedMenus}
            onToggleSubmenu={toggleSubmenu}
            onCloseMobileSidebar={closeMobileSidebar}
            isUnidade={isUnidade}
            minhaFranquiaItem={minhaFranquiaItem}
          />

          {/* User Section */}
          <div className="p-2 border-t border-border">
            {sidebarCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full h-10 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56 bg-popover">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                    <div className="mt-1">{getRoleBadge()}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{user?.email}</p>
                      <div className="mt-0.5">{getRoleBadge()}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main role="main" aria-label="Conteúdo principal" className={cn("transition-all duration-200", mainMargin)}>
        {/* Desktop Header */}
        <DesktopTopBar
          userEmail={user?.email}
          role={role}
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <div className="p-4 sm:p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* YESia AI Assistant Widget */}
      <YESiaWidget />
    </div>
  );
}
