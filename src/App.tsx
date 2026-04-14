import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import PendingApproval from "./pages/PendingApproval";
import Users from "./pages/Users";
import UsuarioDetail from "./pages/UsuarioDetail";
import UsuarioEdit from "./pages/UsuarioEdit";
import Franqueados from "./pages/Franqueados";
import FranqueadoDetail from "./pages/FranqueadoDetail";
import FranqueadoEdit from "./pages/FranqueadoEdit";
import MinhaFranquia from "./pages/MinhaFranquia";
import Franquia from "./pages/Franquia";
import Indicacoes from "./pages/Indicacoes";
import IndicacaoDetail from "./pages/IndicacaoDetail";
import Agendamentos from "./pages/Agendamentos";
import AgendamentoDetail from "./pages/AgendamentoDetail";
import AgendamentoEdit from "./pages/AgendamentoEdit";
// Recrutamento: lazy loading para reduzir bundle inicial
const Recrutamento = lazy(() => import("./pages/Recrutamento"));
const VagaDetail = lazy(() => import("./pages/VagaDetail"));
const VagaEdit = lazy(() => import("./pages/VagaEdit"));
const CandidatoDetail = lazy(() => import("./pages/CandidatoDetail"));
const CandidatoEdit = lazy(() => import("./pages/CandidatoEdit"));
const EntrevistaDetail = lazy(() => import("./pages/EntrevistaDetail"));
const EntrevistaEdit = lazy(() => import("./pages/EntrevistaEdit"));
// Configuracoes antiga removida - usando ConfiguracoesIndex como hub
import Servicos from "./pages/Servicos";
import ServicosRouter from "./pages/ServicosRouter";
import ServicoDetail from "./pages/ServicoDetail";
import ServicoEdit from "./pages/ServicoEdit";
import PrecificacaoDashboard from "./pages/precificacao/PrecificacaoDashboard";
import PrecificacaoDetail from "./pages/precificacao/PrecificacaoDetail";
import AnaliseConcorrencia from "./pages/precificacao/AnaliseConcorrencia";
import Concorrentes from "./pages/precificacao/Concorrentes";
import ConcorrenteEdit from "./pages/precificacao/ConcorrenteEdit";
import PacoteDetail from "./pages/PacoteDetail";
import PacoteEdit from "./pages/PacoteEdit";
import LeadDetail from "./pages/LeadDetail";
import LeadEdit from "./pages/LeadEdit";
import Leads from "./pages/Leads";
import LeadsDashboard from "./pages/LeadsDashboard";
import FunilVendas from "./pages/FunilVendas";
import FunilConfig from "./pages/FunilConfig";
import FunilRelatorios from "./pages/FunilRelatorios";
import WhatsAppSessoes from "./pages/WhatsAppSessoes";
import WhatsAppSessoes2 from "./pages/WhatsAppSessoes2";
import WhatsAppChat from "./pages/WhatsAppChat";
import WhatsAppDashboard from "./pages/WhatsAppDashboard";
import WhatsAppStatus from "./pages/WhatsAppStatus";
import WhatsAppAutomacoes from "./pages/WhatsAppAutomacoes";
import WhatsAppConfiguracoes from "./pages/WhatsAppConfiguracoes";
import Chatbot from "./pages/Chatbot";
import WhatsAppRelatorios from "./pages/WhatsAppRelatorios";
import WhatsAppRespostasRapidas from "./pages/WhatsAppRespostasRapidas";
import WhatsAppTemplates from "./pages/WhatsAppTemplates";
import WhatsAppFilas from "./pages/WhatsAppFilas";
import WhatsAppFilaDetail from "./pages/WhatsAppFilaDetail";
import WhatsAppFilaEdit from "./pages/WhatsAppFilaEdit";
import WhatsAppBotConfig from "./pages/WhatsAppBotConfig";
import AIAgents from "./pages/AIAgents";
import AIAgentEdit from "./pages/AIAgentEdit";
// WhatsApp Híbrido (WAHA + Meta Cloud API)
import WhatsAppHybridConfig from "./pages/configuracoes/WhatsAppHybridConfig";
import WhatsAppProviders from "./pages/configuracoes/WhatsAppProviders";
import WhatsAppRouting from "./pages/configuracoes/WhatsAppRouting";
import WhatsAppCustos from "./pages/WhatsAppCustos";
import WhatsAppMetaTemplates from "./pages/WhatsAppMetaTemplates";
import WhatsAppRoutingLogs from "./pages/WhatsAppRoutingLogs";
import WhatsAppHybridStats from "./pages/WhatsAppHybridStats";
// WhatsApp Broadcast & Grupos
import WhatsAppBroadcast from "./pages/WhatsAppBroadcast";
import WhatsAppBroadcastEdit from "./pages/WhatsAppBroadcastEdit";
import WhatsAppBroadcastDetail from "./pages/WhatsAppBroadcastDetail";
import WhatsAppListas from "./pages/WhatsAppListas";
import WhatsAppListaEdit from "./pages/WhatsAppListaEdit";
import WhatsAppListaDetail from "./pages/WhatsAppListaDetail";
import WhatsAppGrupos from "./pages/WhatsAppGrupos";
import WhatsAppGrupoDetail from "./pages/WhatsAppGrupoDetail";
import WhatsAppGrupoBulkAdd from "./pages/WhatsAppGrupoBulkAdd";
import WhatsAppGrupoOperacoes from "./pages/WhatsAppGrupoOperacoes";
import { MetaMessengerConfig } from "./pages/MetaMessengerConfig";
import { MetaConversations } from "./pages/MetaConversations";
import { MetaChat } from "./pages/MetaChat";
import Formularios from "./pages/Formularios";
import FormularioNovo from "./pages/FormularioNovo";
import FormularioEdit from "./pages/FormularioEdit";
import FormularioDetail from "./pages/FormularioDetail";
import FormularioPublico from "./pages/FormularioPublico";
import VagasPublicas from "./pages/VagasPublicas";
import NotFound from "./pages/NotFound";

// Landing pages (lazy loading - public)
const LandingViniun = lazy(() => import("./pages/landing/LandingViniun"));
const SignupEmpresa = lazy(() => import("./pages/landing/SignupEmpresa"));
const SignupSucesso = lazy(() => import("./pages/landing/SignupSucesso"));

// Influenciadoras (Admin)
import Influenciadoras from "./pages/Influenciadoras";
import InfluenciadorasDashboard from "./pages/InfluenciadorasDashboard";
import InfluenciadorasLista from "./pages/InfluenciadorasLista";
import InfluenciadorasIndicacoes from "./pages/InfluenciadorasIndicacoes";
import InfluenciadoraDetail from "./pages/InfluenciadoraDetail";
import InfluenciadoraEdit from "./pages/InfluenciadoraEdit";
import InfluenciadoraContratoEdit from "./pages/InfluenciadoraContratoEdit";
import InfluenciadoraPagamentoEdit from "./pages/InfluenciadoraPagamentoEdit";
import InfluenciadoraPostEdit from "./pages/InfluenciadoraPostEdit";
import InfluenciadoraContratoPreview from "./pages/InfluenciadoraContratoPreview";
import InfluenciadoraContratoAssinatura from "./pages/InfluenciadoraContratoAssinatura";
import InfluenciadoraNotifConfig from "./pages/influenciadoras/InfluenciadoraNotifConfig";
import InfluenciadoraReferralNotifConfig from "./pages/influenciadoras/InfluenciadoraReferralNotifConfig";

// Parcerias (Admin)
import Parcerias from "./pages/Parcerias";
import ParceriaDetail from "./pages/ParceriaDetail";
import ParceriaEdit from "./pages/ParceriaEdit";

// Portal do Parceiro (Self-Service)
import PortalParceiro from "./pages/portal-parceiro/PortalParceiro";
import PortalParceiroIndicacoes from "./pages/portal-parceiro/PortalParceiroIndicacoes";
import LoginParceiro from "./pages/portal-parceiro/LoginParceiro";
import CadastroParceiro from "./pages/portal-parceiro/CadastroParceiro";
import { ParceriaAuthProvider } from "@/contexts/ParceriaAuthContext";
import { ParceriaProtectedRoute } from "@/components/parceiro-portal";

// Portal da Influenciadora (Público + Self-Service)
import CadastroInfluenciadora from "./pages/influenciadora/CadastroInfluenciadora";
import LoginInfluenciadora from "./pages/influenciadora/LoginInfluenciadora";
import PortalInfluenciadora from "./pages/influenciadora/PortalInfluenciadora";
import MeuPerfilInfluenciadora from "./pages/influenciadora/MeuPerfilInfluenciadora";
import MeusValoresInfluenciadora from "./pages/influenciadora/MeusValoresInfluenciadora";
import MinhasIndicacoesInfluenciadora from "./pages/influenciadora/MinhasIndicacoesInfluenciadora";
import MeusGanhosInfluenciadora from "./pages/influenciadora/MeusGanhosInfluenciadora";
import MinhasPermutasInfluenciadora from "./pages/influenciadora/MinhasPermutasInfluenciadora";
import MeusPostsInfluenciadora from "./pages/influenciadora/MeusPostsInfluenciadora";
import MeuContratoInfluenciadora from "./pages/influenciadora/MeuContratoInfluenciadora";
import MinhasPromocoesInfluenciadora from "./pages/influenciadora/MinhasPromocoesInfluenciadora";
import OnboardingInfluenciadora from "./pages/influenciadora/OnboardingInfluenciadora";
import { InfluenciadoraAuthProvider } from "@/contexts/InfluenciadoraAuthContext";
import { InfluenciadoraProtectedRoute } from "@/components/influenciadora-portal";

// Novos Módulos - Fase 1
import Diretorias from "./pages/configuracoes/Diretorias";
import Metas from "./pages/Metas";
import Aprovacoes from "./pages/Aprovacoes";
import Automacoes from "./pages/Automacoes";
import ApiWebhooks from "./pages/ApiWebhooks";
import YesIA from "./pages/YesIA";
import CampanhasIndex from "./pages/campanhas/CampanhasIndex";
import CampanhaDetail from "./pages/campanhas/CampanhaDetail";
import CampanhaEdit from "./pages/campanhas/CampanhaEdit";

// Promoções (lazy loading)
const Promocoes = lazy(() => import("./pages/promocoes/Promocoes"));
const PromocaoEdit = lazy(() => import("./pages/promocoes/PromocaoEdit"));
const PromocaoDetail = lazy(() => import("./pages/promocoes/PromocaoDetail"));

// Marketing
import Marketing from "./pages/Marketing";
import MarketingTemplates from "./pages/MarketingTemplates";
import MarketingCampanhas from "./pages/MarketingCampanhas";
import MarketingAssets from "./pages/MarketingAssets";
import MarketingGaleria from "./pages/MarketingGaleria";
import MarketingAnalytics from "./pages/MarketingAnalytics";

// Relatórios
import Ranking from "./pages/relatorios/Ranking";
import RelatoriosIndex from "./pages/relatorios/RelatoriosIndex";

// Configurações
import ConfiguracoesIndex from "./pages/configuracoes/ConfiguracoesIndex";
import Permissoes from "./pages/configuracoes/Permissoes";
import Modulos from "./pages/configuracoes/Modulos";
import ModulosCrud from "./pages/configuracoes/ModulosCrud";
import Integracoes from "./pages/configuracoes/Integracoes";
import MinhaEmpresa from "./pages/configuracoes/MinhaEmpresa";

// Onboarding
import TenantOnboarding from "./pages/onboarding/TenantOnboarding";

// Multi-tenant CRUD
import Empresas from "./pages/configuracoes/Empresas";
import EmpresaDetail from "./pages/configuracoes/EmpresaDetail";
import EmpresaEdit from "./pages/configuracoes/EmpresaEdit";
import MTFranquias from "./pages/configuracoes/Franquias";
import MTFranquiaDetail from "./pages/configuracoes/FranquiaDetail";
import MTFranquiaEdit from "./pages/configuracoes/FranquiaEdit";
import MTUsuarios from "./pages/configuracoes/Usuarios";
import MTUsuarioDetail from "./pages/configuracoes/UsuarioDetail";
import MTUsuarioEdit from "./pages/configuracoes/UsuarioEdit";

// Multi-tenant: Dashboard Profiles
import DashboardProfiles from "./pages/configuracoes/DashboardProfiles";
import DashboardProfileDetail from "./pages/configuracoes/DashboardProfileDetail";
import DashboardProfileEdit from "./pages/configuracoes/DashboardProfileEdit";
import DashboardBoardConfig from "./pages/configuracoes/DashboardBoardConfig";

// Multi-tenant: Departamentos e Equipes
import Departamentos from "./pages/configuracoes/Departamentos";
import DepartamentoDetail from "./pages/configuracoes/DepartamentoDetail";
import DepartamentoEdit from "./pages/configuracoes/DepartamentoEdit";
import Equipes from "./pages/configuracoes/Equipes";
import EquipeDetail from "./pages/configuracoes/EquipeDetail";
import EquipeEdit from "./pages/configuracoes/EquipeEdit";

// Multi-tenant: Cargos e Permissões
import Cargos from "./pages/configuracoes/Cargos";
import CargoPermissoes from "./pages/configuracoes/CargoPermissoes";

// Multi-tenant: Cofre de Senhas
import CofreSenhas from "./pages/configuracoes/CofreSenhas";
import CofreSenhasDetail from "./pages/configuracoes/CofreSenhasDetail";
import CofreSenhasEdit from "./pages/configuracoes/CofreSenhasEdit";

// Jornada do Cliente - Módulos novos (lazy loading)
const NotificacoesAgendamento = lazy(() => import("./pages/configuracoes/NotificacoesAgendamento"));
const Auditorias = lazy(() => import("./pages/Auditorias"));
const AuditoriaDetail = lazy(() => import("./pages/AuditoriaDetail"));
const AuditoriaEdit = lazy(() => import("./pages/AuditoriaEdit"));
const NPSPublico = lazy(() => import("./pages/nps/NPSPublico"));
const NPSConfig = lazy(() => import("./pages/configuracoes/NPSConfig"));
const Salas = lazy(() => import("./pages/configuracoes/Salas"));
const SalaDetail = lazy(() => import("./pages/configuracoes/SalaDetail"));
const SalaEdit = lazy(() => import("./pages/configuracoes/SalaEdit"));
const Banners = lazy(() => import("./pages/configuracoes/Banners"));
const BannerEdit = lazy(() => import("./pages/configuracoes/BannerEdit"));
const RelatoriosDiarios = lazy(() => import("./pages/relatorios/RelatoriosDiarios"));
const OcupacaoSalas = lazy(() => import("./pages/relatorios/OcupacaoSalas"));
const LeadAnalytics = lazy(() => import("./pages/relatorios/LeadAnalytics"));
const LeadsSemResposta = lazy(() => import("./pages/relatorios/LeadsSemResposta"));
const TabletQueue = lazy(() => import("./pages/tablet/TabletQueue"));
const TabletTreatmentView = lazy(() => import("./pages/tablet/TabletTreatmentView"));
const AutoAgendamento = lazy(() => import("./pages/AutoAgendamento"));
const SelfSchedulingConfig = lazy(() => import("./pages/configuracoes/SelfSchedulingConfig"));

// Documentos
import Documentos from "./pages/Documentos";
import DocumentoDetail from "./pages/DocumentoDetail";
import DocumentoEdit from "./pages/DocumentoEdit";

// Estoque (lazy loading)
const EstoqueDashboard = lazy(() => import("./pages/estoque/EstoqueDashboard"));
const EstoqueInsumos = lazy(() => import("./pages/estoque/EstoqueInsumos"));
const EstoqueInsumoEdit = lazy(() => import("./pages/estoque/EstoqueInsumoEdit"));
const EstoqueInsumoDetail = lazy(() => import("./pages/estoque/EstoqueInsumoDetail"));
const EstoqueMovimentacoes = lazy(() => import("./pages/estoque/EstoqueMovimentacoes"));
const EstoqueEntrada = lazy(() => import("./pages/estoque/EstoqueEntrada"));
const EstoqueConsumos = lazy(() => import("./pages/estoque/EstoqueConsumos"));
const EstoqueVinculos = lazy(() => import("./pages/estoque/EstoqueVinculos"));
const EstoqueFornecedores = lazy(() => import("./pages/estoque/EstoqueFornecedores"));
const EstoqueSaida = lazy(() => import("./pages/estoque/EstoqueSaida"));
const EstoqueFornecedorDetail = lazy(() => import("./pages/estoque/EstoqueFornecedorDetail"));
const EstoqueTabelaPrecos = lazy(() => import("./pages/estoque/EstoqueTabelaPrecos"));
const EstoqueCotacao = lazy(() => import("./pages/estoque/EstoqueCotacao"));

// Vendas (lazy loading)
const VendasDashboard = lazy(() => import("./pages/vendas/VendasDashboard"));
const VendaEdit = lazy(() => import("./pages/vendas/VendaEdit"));
const VendaDetail = lazy(() => import("./pages/vendas/VendaDetail"));
const TabelaPrecos = lazy(() => import("./pages/vendas/TabelaPrecos"));
const TabelaPrecoEdit = lazy(() => import("./pages/vendas/TabelaPrecoEdit"));
const Comissoes = lazy(() => import("./pages/vendas/Comissoes"));
const ComissaoConfig = lazy(() => import("./pages/vendas/ComissaoConfig"));
const Vendas = lazy(() => import("./pages/vendas/Vendas"));
const RelatorioPrecos = lazy(() => import("./pages/vendas/RelatorioPrecos"));
const TreatmentPlans = lazy(() => import("./pages/vendas/TreatmentPlans"));
const TreatmentPlanDetail = lazy(() => import("./pages/vendas/TreatmentPlanDetail"));

// Processos e FAQ (lazy loading)
const SOPsList = lazy(() => import("./pages/processos/SOPsList"));
const SOPEdit = lazy(() => import("./pages/processos/SOPEdit"));
const SOPDetail = lazy(() => import("./pages/processos/SOPDetail"));
const SOPExecution = lazy(() => import("./pages/processos/SOPExecution"));
const SOPDashboard = lazy(() => import("./pages/processos/SOPDashboard"));
const SOPCategorias = lazy(() => import("./pages/processos/SOPCategorias"));
const SOPFlow = lazy(() => import("./pages/processos/SOPFlow"));
const FAQList = lazy(() => import("./pages/processos/FAQList"));
const FAQEdit = lazy(() => import("./pages/processos/FAQEdit"));
const FAQDetail = lazy(() => import("./pages/processos/FAQDetail"));
const FAQDashboard = lazy(() => import("./pages/processos/FAQDashboard"));

// Treinamentos (lazy loading)
const TrainingDashboard = lazy(() => import("./pages/treinamentos/TrainingDashboard"));
const TrainingTracks = lazy(() => import("./pages/treinamentos/TrainingTracks"));
const TrainingTrackEdit = lazy(() => import("./pages/treinamentos/TrainingTrackEdit"));
const TrainingTrackDetail = lazy(() => import("./pages/treinamentos/TrainingTrackDetail"));
const TrainingModuleEdit = lazy(() => import("./pages/treinamentos/TrainingModuleEdit"));
const TrainingLessonEdit = lazy(() => import("./pages/treinamentos/TrainingLessonEdit"));
const MeusTreinamentos = lazy(() => import("./pages/treinamentos/MeusTreinamentos"));
const TrackView = lazy(() => import("./pages/treinamentos/TrackView"));
const LessonPlayer = lazy(() => import("./pages/treinamentos/LessonPlayer"));
const QuizPlayer = lazy(() => import("./pages/treinamentos/QuizPlayer"));


// Gamificação (lazy loading)
const GamificationDashboard = lazy(() => import("./pages/gamificacao/GamificationDashboard"));
const Leaderboard = lazy(() => import("./pages/gamificacao/Leaderboard"));
const BadgesGallery = lazy(() => import("./pages/gamificacao/BadgesGallery"));
const XPHistory = lazy(() => import("./pages/gamificacao/XPHistory"));

// Financeiro (lazy loading)
const FinanceiroDashboard = lazy(() => import("./pages/financeiro/FinanceiroDashboard"));
const Lancamentos = lazy(() => import("./pages/financeiro/Lancamentos"));
const Receitas = lazy(() => import("./pages/financeiro/Receitas"));
const Despesas = lazy(() => import("./pages/financeiro/Despesas"));
const LancamentoEdit = lazy(() => import("./pages/financeiro/LancamentoEdit"));
const Contas = lazy(() => import("./pages/financeiro/Contas"));
const ContaEdit = lazy(() => import("./pages/financeiro/ContaEdit"));
const Categorias = lazy(() => import("./pages/financeiro/Categorias"));
const FinanceiroRelatorios = lazy(() => import("./pages/financeiro/Relatorios"));
const RecorrenteEdit = lazy(() => import("./pages/financeiro/RecorrenteEdit"));
const Folha = lazy(() => import("./pages/financeiro/Folha"));
const FolhaFuncionarioEdit = lazy(() => import("./pages/financeiro/FolhaFuncionarioEdit"));
const FolhaFuncionarioDetail = lazy(() => import("./pages/financeiro/FolhaFuncionarioDetail"));
const FolhaDetalhe = lazy(() => import("./pages/financeiro/FolhaDetalhe"));
const ConciliacaoIndex = lazy(() => import("./pages/financeiro/ConciliacaoIndex"));
const ConciliacaoImportar = lazy(() => import("./pages/financeiro/ConciliacaoImportar"));
const ConciliacaoDetail = lazy(() => import("./pages/financeiro/ConciliacaoDetail"));
const FluxoCaixa = lazy(() => import("./pages/financeiro/FluxoCaixa"));
const ProjecaoIndex = lazy(() => import("./pages/financeiro/ProjecaoIndex"));
const ProjecaoImportar = lazy(() => import("./pages/financeiro/ProjecaoImportar"));
const ProjecaoDetail = lazy(() => import("./pages/financeiro/ProjecaoDetail"));

// Patrimônio (lazy loading)
const PatrimonioDashboard = lazy(() => import("./pages/patrimonio/PatrimonioDashboard"));
const PatrimonioIndex = lazy(() => import("./pages/patrimonio/PatrimonioIndex"));
const PatrimonioDetail = lazy(() => import("./pages/patrimonio/PatrimonioDetail"));
const PatrimonioEdit = lazy(() => import("./pages/patrimonio/PatrimonioEdit"));
const PatrimonioCategorias = lazy(() => import("./pages/patrimonio/PatrimonioCategorias"));
const PatrimonioRelatorios = lazy(() => import("./pages/patrimonio/PatrimonioRelatorios"));

// Produtividade (lazy loading)
const Produtividade = lazy(() => import("./pages/produtividade/Produtividade"));
const ProdutividadeResumo = lazy(() => import("./pages/produtividade/ProdutividadeResumo"));
const CartaoPonto = lazy(() => import("./pages/produtividade/CartaoPonto"));
const EscalaMensalPrint = lazy(() => import("./pages/produtividade/EscalaMensalPrint"));
const MeuPonto = lazy(() => import("./pages/MeuPonto"));
const MinhaPresenca = lazy(() => import("./pages/MinhaPresenca"));
const PontoConfig = lazy(() => import("./pages/configuracoes/PontoConfig"));

// Checklist Diário
const ChecklistTemplates = lazy(() => import("./pages/checklist/ChecklistTemplates"));
const ChecklistTemplateEdit = lazy(() => import("./pages/checklist/ChecklistTemplateEdit"));
const ChecklistTemplateDetail = lazy(() => import("./pages/checklist/ChecklistTemplateDetail"));
const ChecklistDiario = lazy(() => import("./pages/checklist/ChecklistDiario"));
const ChecklistDiarioGestor = lazy(() => import("./pages/checklist/ChecklistDiarioGestor"));
const ChecklistRelatorios = lazy(() => import("./pages/checklist/ChecklistRelatorios"));
const ChecklistDashboard = lazy(() => import("./pages/checklist/ChecklistDashboard"));

// Tarefas (Delegação)
const Tarefas = lazy(() => import("./pages/tarefas/Tarefas"));
const TarefaEdit = lazy(() => import("./pages/tarefas/TarefaEdit"));
const TarefaDetail = lazy(() => import("./pages/tarefas/TarefaDetail"));
const TarefasDashboard = lazy(() => import("./pages/tarefas/TarefasDashboard"));
const TarefasConfig = lazy(() => import("./pages/tarefas/TarefasConfig"));

// YESia IA (lazy loading)
const IAHome = lazy(() => import("./pages/ia/IAHome"));
const IAConfig = lazy(() => import("./pages/ia/IAConfig"));
const IAAgents = lazy(() => import("./pages/ia/AIAgents"));
const IAAgentEdit = lazy(() => import("./pages/ia/AIAgentEdit"));
const IATokenDashboard = lazy(() => import("./pages/ia/AITokenDashboard"));
const IAKnowledgeBase = lazy(() => import("./pages/ia/AIKnowledgeBase"));
const IAMemory = lazy(() => import("./pages/ia/AIMemory"));
const IATraining = lazy(() => import("./pages/ia/AITraining"));
const IALearningJobs = lazy(() => import("./pages/ia/AILearningJobs"));
const IAAnalytics = lazy(() => import("./pages/ia/AIAnalytics"));
const IAProactiveRules = lazy(() => import("./pages/ia/AIProactiveRules"));
const TrafficDashboard = lazy(() => import("./pages/ia/traffic/TrafficDashboard"));
const AdCampaigns = lazy(() => import("./pages/ia/traffic/AdCampaigns"));
const AdCampaignEdit = lazy(() => import("./pages/ia/traffic/AdCampaignEdit"));
const AdCampaignDetail = lazy(() => import("./pages/ia/traffic/AdCampaignDetail"));
const AttributionReport = lazy(() => import("./pages/ia/traffic/AttributionReport"));
const CreativeAnalysis = lazy(() => import("./pages/ia/traffic/CreativeAnalysis"));

// Portal Franquia
import FranquiaDashboard from "./pages/franquia/FranquiaDashboard";
import FranquiaLeads from "./pages/franquia/FranquiaLeads";
import FranquiaFunil from "./pages/franquia/FranquiaFunil";
import FranquiaMetas from "./pages/franquia/FranquiaMetas";
import FranquiaConfiguracoes from "./pages/franquia/FranquiaConfiguracoes";
import FranquiaServicos from "./pages/franquia/FranquiaServicos";
import FranquiaFormularios from "./pages/franquia/FranquiaFormularios";
import FranquiaRelatorios from "./pages/franquia/FranquiaRelatorios";
import FranquiaWhatsApp from "./pages/franquia/FranquiaWhatsApp";
import FranquiaRanking from "./pages/franquia/FranquiaRanking";
import FranquiaUsuarios from "./pages/franquia/FranquiaUsuarios";
import FranquiaCampanhas from "./pages/franquia/FranquiaCampanhas";
import FranquiaPerfil from "./pages/franquia/FranquiaPerfil";

// Loja Pública (Sem autenticação)
import LojaPublica from "./pages/LojaPublica";
import LojaProdutoPublico from "./pages/LojaProdutoPublico";

// ═══════════════════════════════════════════════════
// IMOBILIÁRIO - Lazy imports (15 módulos)
// ═══════════════════════════════════════════════════
const ImoveisDashboard = lazy(() => import("./pages/imoveis/ImoveisDashboard"));
const ImoveisLista = lazy(() => import("./pages/imoveis/Imoveis"));
const ImovelDetail = lazy(() => import("./pages/imoveis/ImovelDetail"));
const ImovelEdit = lazy(() => import("./pages/imoveis/ImovelEdit"));
const ImovelConfiguracoes = lazy(() => import("./pages/imoveis/ImovelConfiguracoes"));
const EdificiosLista = lazy(() => import("./pages/imoveis/Edificios"));
const EdificioDetail = lazy(() => import("./pages/imoveis/EdificioDetail"));
const EdificioEdit = lazy(() => import("./pages/imoveis/EdificioEdit"));
const ConstrutorasLista = lazy(() => import("./pages/imoveis/Construtoras"));
const ConstrutoraDetail = lazy(() => import("./pages/imoveis/ConstrutoraDetail"));
const ConstrutoraEdit = lazy(() => import("./pages/imoveis/ConstrutoraEdit"));
const ProprietariosLista = lazy(() => import("./pages/imoveis/Proprietarios"));
const ProprietarioDetail = lazy(() => import("./pages/imoveis/ProprietarioDetail"));
const ProprietarioEdit = lazy(() => import("./pages/imoveis/ProprietarioEdit"));
const CaptadoresLista = lazy(() => import("./pages/imoveis/Captadores"));
const CaptadorDetail = lazy(() => import("./pages/imoveis/CaptadorDetail"));
const CaptadorEdit = lazy(() => import("./pages/imoveis/CaptadorEdit"));
const CorretoresLista = lazy(() => import("./pages/imoveis/Corretores"));
const CorretorDetail = lazy(() => import("./pages/imoveis/CorretorDetail"));
const CorretorEdit = lazy(() => import("./pages/imoveis/CorretorEdit"));
const ClientesImoveisLista = lazy(() => import("./pages/imoveis/ClientesImoveis"));
const ClienteImovelDetail = lazy(() => import("./pages/imoveis/ClienteDetail"));
const ClienteImovelEdit = lazy(() => import("./pages/imoveis/ClienteEdit"));
const ConsultasImoveisLista = lazy(() => import("./pages/imoveis/ConsultasImoveis"));
const ConsultaImovelDetail = lazy(() => import("./pages/imoveis/ConsultaDetail"));
const TabelasPrecoLista = lazy(() => import("./pages/imoveis/TabelasPreco"));
const TabelaPrecoImovelEdit = lazy(() => import("./pages/imoveis/TabelaPrecoEdit"));
const RedeTabelasPage = lazy(() => import("./pages/imoveis/RedeTabelas"));
const RedeTabelaEditPage = lazy(() => import("./pages/imoveis/RedeTabelaEdit"));
const RedeTabelaDetailPage = lazy(() => import("./pages/imoveis/RedeTabelaDetail"));
const RedeParceriasPage = lazy(() => import("./pages/imoveis/RedeParcerias"));
const PortaisImoveisPage = lazy(() => import("./pages/imoveis/PortaisImoveis"));
const PortalXmlExportPage = lazy(() => import("./pages/imoveis/PortalXmlExport"));
const PedidosImoveisLista = lazy(() => import("./pages/imoveis/Pedidos"));
const PedidoImovelDetail = lazy(() => import("./pages/imoveis/PedidoDetail"));
const EmailCampaignsPage = lazy(() => import("./pages/imoveis/EmailCampaigns"));
const CampaignEditPage = lazy(() => import("./pages/imoveis/CampaignEdit"));
const NoticiasImoveisPage = lazy(() => import("./pages/imoveis/Noticias"));
const NoticiaEditPage = lazy(() => import("./pages/imoveis/NoticiaEdit"));
const PaginasImoveisPage = lazy(() => import("./pages/imoveis/Paginas"));
const PaginaEditPage = lazy(() => import("./pages/imoveis/PaginaEdit"));
const RelatoriosImoveisPage = lazy(() => import("./pages/imoveis/RelatoriosImoveis"));
const LocalizacoesPage = lazy(() => import("./pages/imoveis/Localizacoes"));
const PropostasImoveisPage = lazy(() => import("./pages/imoveis/PropostasImoveis"));
const PropostaImovelEditPage = lazy(() => import("./pages/imoveis/PropostaImovelEdit"));
const PropostaImovelDetailPage = lazy(() => import("./pages/imoveis/PropostaImovelDetail"));
const PropostaPublicaPage = lazy(() => import("./pages/imoveis/PropostaPublica"));
const ContratosImoveisPage = lazy(() => import("./pages/imoveis/ContratosImoveis"));
const ContratoImovelEditPage = lazy(() => import("./pages/imoveis/ContratoImovelEdit"));
const ContratoImovelDetailPage = lazy(() => import("./pages/imoveis/ContratoImovelDetail"));
const ContratoAssinaturaPage = lazy(() => import("./pages/imoveis/ContratoAssinatura"));

// Site Público - Imóveis (sem autenticação)
const SiteHomePage = lazy(() => import("./pages/site-publico/HomePage"));
const BuscaImoveis = lazy(() => import("./pages/site-publico/BuscaImoveis"));
const DetalheImovelPublico = lazy(() => import("./pages/site-publico/DetalheImovelPublico"));
const SitemapXml = lazy(() => import("./pages/site-publico/SitemapXml"));

// Portal Corretor
const LoginCorretor = lazy(() => import("./pages/portal-corretor/LoginCorretor"));
const PortalCorretor = lazy(() => import("./pages/portal-corretor/PortalCorretor"));
const CorretorImoveis = lazy(() => import("./pages/portal-corretor/CorretorImoveis"));
const CorretorPropostasPage = lazy(() => import("./pages/portal-corretor/CorretorPropostas"));
const CorretorPerfilPage = lazy(() => import("./pages/portal-corretor/CorretorPerfil"));

// Portal Cliente Imobiliário
const ClienteImoveisDashboard = lazy(() => import("./pages/portal-cliente-imovel/ClienteImoveisDashboard"));
const ClientePropostasPage = lazy(() => import("./pages/portal-cliente-imovel/ClientePropostas"));
const ClienteContratosPage = lazy(() => import("./pages/portal-cliente-imovel/ClienteContratos"));
const ClienteFaturasPage = lazy(() => import("./pages/portal-cliente-imovel/ClienteFaturas"));

// Totem e Portal do Cliente (Público)
import Totem from "./pages/Totem";
const TotemPonto = lazy(() => import("./pages/TotemPonto"));
const TotemPresenca = lazy(() => import("./pages/TotemPresenca"));
import ClienteLogin from "./pages/cliente/ClienteLogin";
import ClienteDashboard from "./pages/cliente/ClienteDashboard";
import ClienteAgendamentos from "./pages/cliente/ClienteAgendamentos";
import ClienteServicos from "./pages/cliente/ClienteServicos";
import ClienteHistorico from "./pages/cliente/ClienteHistorico";
import ClientePerfil from "./pages/cliente/ClientePerfil";
import ClienteAgendar from "./pages/cliente/ClienteAgendar";
import { ClienteAuthProvider } from "@/contexts/ClienteAuthContext";
import { ClienteProtectedRoute } from "@/components/cliente";

const queryClient = new QueryClient();

// Domínios que devem exibir a landing page na raiz "/"
const LANDING_DOMAINS = [
  'www.viniun.com.br',
  'viniun.com.br',
  'localhost',
];

/** Redireciona /parceiro/:codigo para /parceiro/login?codigo=:codigo */
function ParceiroCodigoRedirect() {
  const { codigo } = useParams<{ codigo: string }>();
  return <Navigate to={`/parceiro/login?codigo=${codigo || ''}`} replace />;
}

const isLandingDomain = () => {
  if (typeof window === 'undefined') return false;
  return LANDING_DOMAINS.includes(window.location.hostname);
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <BrandingProvider>
              <Toaster />
              <Sonner />
              <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/aguardando-aprovacao" element={<PendingApproval />} />
            <Route path="/cadastro" element={<Suspense fallback={null}><SignupEmpresa /></Suspense>} />
            <Route path="/cadastro/sucesso" element={<Suspense fallback={null}><SignupSucesso /></Suspense>} />
            <Route path="/" element={
              isLandingDomain()
                ? <Suspense fallback={null}><LandingViniun /></Suspense>
                : <ProtectedRoute><DashboardLayout><Index /></DashboardLayout></ProtectedRoute>
            } />
            {/* Leads */}
            <Route path="/leads/dashboard" element={<ProtectedRoute module="leads"><DashboardLayout><LeadsDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute module="leads"><Leads /></ProtectedRoute>} />
            <Route path="/leads/novo" element={<ProtectedRoute module="leads"><LeadEdit /></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute module="leads"><LeadDetail /></ProtectedRoute>} />
            <Route path="/leads/:id/editar" element={<ProtectedRoute module="leads"><LeadEdit /></ProtectedRoute>} />
            {/* Funil de Vendas */}
            <Route path="/funil" element={<ProtectedRoute module="funil"><DashboardLayout defaultCollapsed><FunilVendas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/funil/:funilId" element={<ProtectedRoute module="funil"><DashboardLayout defaultCollapsed><FunilVendas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/funil/config/:funilId" element={<ProtectedRoute module="funil" requireFranchiseAdmin><DashboardLayout defaultCollapsed><FunilConfig /></DashboardLayout></ProtectedRoute>} />
            <Route path="/funil/relatorios" element={<ProtectedRoute module="funil"><DashboardLayout defaultCollapsed><FunilRelatorios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/funil/relatorios/:funilId" element={<ProtectedRoute module="funil"><DashboardLayout defaultCollapsed><FunilRelatorios /></DashboardLayout></ProtectedRoute>} />
            {/* Minha Franquia - Dashboard simplificado para unidades */}
            <Route path="/minha-franquia" element={<ProtectedRoute module="franqueados"><MinhaFranquia /></ProtectedRoute>} />
            {/* Franquia - Dashboard por unidade com slug */}
            <Route path="/franquia" element={<ProtectedRoute module="franqueados"><DashboardLayout><Franquia /></DashboardLayout></ProtectedRoute>} />
            <Route path="/franquia/:slug" element={<ProtectedRoute module="franqueados"><DashboardLayout><Franquia /></DashboardLayout></ProtectedRoute>} />
            {/* Indicações */}
            <Route path="/indicacoes" element={<ProtectedRoute module="leads"><DashboardLayout><Indicacoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/indicacoes/:id" element={<ProtectedRoute module="leads"><IndicacaoDetail /></ProtectedRoute>} />
            {/* Influenciadoras */}
            <Route path="/influenciadoras" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasDashboard /></ProtectedRoute>} />
            <Route path="/influenciadoras/dashboard" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasDashboard /></ProtectedRoute>} />
            <Route path="/influenciadoras/lista" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasLista /></ProtectedRoute>} />
            <Route path="/influenciadoras/indicacoes" element={<ProtectedRoute module="influenciadoras"><InfluenciadorasIndicacoes /></ProtectedRoute>} />
            <Route path="/influenciadoras/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraEdit /></ProtectedRoute>} />
            <Route path="/influenciadoras/:id" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraDetail /></ProtectedRoute>} />
            <Route path="/influenciadoras/:id/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraEdit /></ProtectedRoute>} />
            {/* Contratos, Pagamentos e Posts de Influenciadoras */}
            <Route path="/influenciadoras/:influenciadoraId/contratos/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraContratoEdit /></ProtectedRoute>} />
            <Route path="/influenciadoras/:influenciadoraId/contratos/:contratoId/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraContratoEdit /></ProtectedRoute>} />
            <Route path="/influenciadoras/:influenciadoraId/pagamentos/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPagamentoEdit /></ProtectedRoute>} />
            <Route path="/influenciadoras/:influenciadoraId/pagamentos/:pagamentoId/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPagamentoEdit /></ProtectedRoute>} />
            <Route path="/influenciadoras/:influenciadoraId/posts/novo" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPostEdit /></ProtectedRoute>} />
            <Route path="/influenciadoras/:influenciadoraId/posts/:postId/editar" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraPostEdit /></ProtectedRoute>} />
            {/* Configuração de Notificações */}
            <Route path="/influenciadoras/configuracoes/notificacoes" element={<ProtectedRoute module="influenciadoras"><DashboardLayout><InfluenciadoraNotifConfig /></DashboardLayout></ProtectedRoute>} />
            <Route path="/influenciadoras/indicacoes/configuracoes" element={<ProtectedRoute module="influenciadoras"><DashboardLayout><InfluenciadoraReferralNotifConfig /></DashboardLayout></ProtectedRoute>} />
            {/* Preview e Assinatura de Contratos */}
            <Route path="/influenciadoras/:influenciadoraId/contratos/:contratoId/preview" element={<ProtectedRoute module="influenciadoras"><InfluenciadoraContratoPreview /></ProtectedRoute>} />
            <Route path="/influenciadora/contrato/:contratoId/assinar" element={<InfluenciadoraContratoAssinatura />} />
            {/* Parcerias Empresariais */}
            <Route path="/parcerias" element={<ProtectedRoute module="parcerias"><DashboardLayout><Parcerias /></DashboardLayout></ProtectedRoute>} />
            <Route path="/parcerias/novo" element={<ProtectedRoute module="parcerias"><DashboardLayout><ParceriaEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/parcerias/:id" element={<ProtectedRoute module="parcerias"><DashboardLayout><ParceriaDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/parcerias/:id/editar" element={<ProtectedRoute module="parcerias"><DashboardLayout><ParceriaEdit /></DashboardLayout></ProtectedRoute>} />
            {/* Promoções */}
            <Route path="/promocoes" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><Promocoes /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/promocoes/novo" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><PromocaoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/promocoes/:id" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><PromocaoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/promocoes/:id/editar" element={<ProtectedRoute module="promocoes"><DashboardLayout><Suspense fallback={null}><PromocaoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            {/* Franqueados */}
            <Route path="/franqueados" element={<ProtectedRoute module="franqueados"><DashboardLayout><Franqueados /></DashboardLayout></ProtectedRoute>} />
            <Route path="/franqueados/:id" element={<ProtectedRoute module="franqueados"><FranqueadoDetail /></ProtectedRoute>} />
            <Route path="/franqueados/:id/editar" element={<ProtectedRoute module="franqueados"><FranqueadoEdit /></ProtectedRoute>} />
            <Route path="/franqueados/novo" element={<ProtectedRoute module="franqueados"><FranqueadoEdit /></ProtectedRoute>} />
            {/* Agendamentos */}
            <Route path="/agendamentos" element={<ProtectedRoute module="agendamentos"><Agendamentos /></ProtectedRoute>} />
            <Route path="/agendamentos/:id" element={<ProtectedRoute module="agendamentos"><AgendamentoDetail /></ProtectedRoute>} />
            <Route path="/agendamentos/:id/editar" element={<ProtectedRoute module="agendamentos"><AgendamentoEdit /></ProtectedRoute>} />
            <Route path="/agendamentos/novo" element={<ProtectedRoute module="agendamentos"><AgendamentoEdit /></ProtectedRoute>} />
            {/* Recrutamento (lazy loaded) */}
            <Route path="/recrutamento" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Recrutamento /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/vagas/:id" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><VagaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/vagas/:id/editar" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><VagaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/vagas/nova" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><VagaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/candidatos/:id" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><CandidatoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/candidatos/:id/editar" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><CandidatoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/candidatos/novo" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><CandidatoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/entrevistas/:id" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><EntrevistaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/entrevistas/:id/editar" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><EntrevistaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/recrutamento/entrevistas/nova" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><EntrevistaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            {/* WhatsApp */}
            <Route path="/whatsapp" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/conversas" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/conversas/:sessaoId" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/sessoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppSessoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/sessoes2" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppSessoes2 /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/status" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppStatus /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/automacoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppAutomacoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/configuracoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppConfiguracoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/relatorios" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppRelatorios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/respostas-rapidas" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppRespostasRapidas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/templates" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppTemplates /></DashboardLayout></ProtectedRoute>} />
            {/* Filas de Atendimento */}
            <Route path="/whatsapp/filas" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/filas/novo" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilaEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/filas/:id" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilaDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/filas/:id/editar" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppFilaEdit /></DashboardLayout></ProtectedRoute>} />
            {/* Chatbot IA - OpenAI */}
            <Route path="/whatsapp/bot-config" element={<ProtectedRoute module="chatbot"><DashboardLayout><WhatsAppBotConfig /></DashboardLayout></ProtectedRoute>} />
            {/* Agentes IA */}
            <Route path="/whatsapp/ai-agents" element={<ProtectedRoute module="whatsapp"><DashboardLayout><AIAgents /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/ai-agents/novo" element={<ProtectedRoute module="whatsapp"><DashboardLayout><AIAgentEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/ai-agents/:id/editar" element={<ProtectedRoute module="whatsapp"><DashboardLayout><AIAgentEdit /></DashboardLayout></ProtectedRoute>} />
            {/* WhatsApp Híbrido - Config, Providers, Routing, Custos, Templates, Logs */}
            <Route path="/whatsapp/hybrid-config" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppHybridConfig /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/providers" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppProviders /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/routing" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppRouting /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/custos" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppCustos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/meta-templates" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppMetaTemplates /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/routing-logs" element={<ProtectedRoute module="whatsapp" requireFranchiseAdmin><DashboardLayout><WhatsAppRoutingLogs /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/hybrid-stats" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppHybridStats /></DashboardLayout></ProtectedRoute>} />
            {/* Broadcast / Disparo em Massa */}
            <Route path="/whatsapp/broadcast" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcast /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/broadcast/novo" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcastEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/broadcast/:id" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcastDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/broadcast/:id/editar" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppBroadcastEdit /></DashboardLayout></ProtectedRoute>} />
            {/* Listas de Destinatários */}
            <Route path="/whatsapp/listas" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/listas/novo" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListaEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/listas/:id" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListaDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/listas/:id/editar" element={<ProtectedRoute module="broadcast"><DashboardLayout><WhatsAppListaEdit /></DashboardLayout></ProtectedRoute>} />
            {/* Grupos WhatsApp */}
            <Route path="/whatsapp/grupos" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/grupos/adicionar" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupoBulkAdd /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/grupos/operacoes" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupoOperacoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/grupos/:groupId" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppGrupoDetail /></DashboardLayout></ProtectedRoute>} />
            {/* Rotas antigas para compatibilidade */}
            <Route path="/whatsapp/chat" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/chat/:sessaoId" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppChat /></DashboardLayout></ProtectedRoute>} />
            <Route path="/whatsapp/dashboard" element={<ProtectedRoute module="whatsapp"><DashboardLayout><WhatsAppDashboard /></DashboardLayout></ProtectedRoute>} />

            {/* Meta Messenger & Instagram */}
            <Route path="/meta-messenger/config" element={<ProtectedRoute module="meta_messenger"><DashboardLayout><MetaMessengerConfig /></DashboardLayout></ProtectedRoute>} />
            <Route path="/meta-messenger/conversations" element={<ProtectedRoute module="meta_messenger"><DashboardLayout><MetaConversations /></DashboardLayout></ProtectedRoute>} />
            <Route path="/meta-messenger/chat/:conversationId" element={<ProtectedRoute module="meta_messenger"><DashboardLayout><MetaChat /></DashboardLayout></ProtectedRoute>} />

            {/* Chatbot */}
            <Route path="/chatbot" element={<ProtectedRoute module="chatbot"><DashboardLayout><Chatbot /></DashboardLayout></ProtectedRoute>} />
            {/* Marketing */}
            <Route path="/marketing" element={<ProtectedRoute module="marketing"><DashboardLayout><Marketing /></DashboardLayout></ProtectedRoute>} />
            <Route path="/marketing/templates" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingTemplates /></DashboardLayout></ProtectedRoute>} />
            <Route path="/marketing/campanhas" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingCampanhas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/marketing/assets" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingAssets /></DashboardLayout></ProtectedRoute>} />
            <Route path="/marketing/galeria" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingGaleria /></DashboardLayout></ProtectedRoute>} />
            <Route path="/marketing/analytics" element={<ProtectedRoute module="marketing"><DashboardLayout><MarketingAnalytics /></DashboardLayout></ProtectedRoute>} />
            {/* Formulários */}
            <Route path="/formularios" element={<ProtectedRoute module="formularios"><DashboardLayout><Formularios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/formularios/novo" element={<ProtectedRoute module="formularios"><DashboardLayout><FormularioNovo /></DashboardLayout></ProtectedRoute>} />
            <Route path="/formularios/:id" element={<ProtectedRoute module="formularios"><DashboardLayout><FormularioDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/formularios/:id/editar" element={<ProtectedRoute module="formularios"><DashboardLayout><FormularioEdit /></DashboardLayout></ProtectedRoute>} />
            {/* Admin */}
            <Route path="/servicos" element={<ProtectedRoute module="servicos"><DashboardLayout><ServicosRouter /></DashboardLayout></ProtectedRoute>} />
            <Route path="/servicos/novo" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><ServicoEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/servicos/pacotes/novo" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><PacoteEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/servicos/pacotes/:id" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><PacoteDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/servicos/pacotes/:id/editar" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><PacoteEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/servicos/:id" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><ServicoDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/servicos/:id/editar" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><ServicoEdit /></DashboardLayout></ProtectedRoute>} />

            {/* Precificação */}
            <Route path="/precificacao" element={<ProtectedRoute module="precificacao"><DashboardLayout><PrecificacaoDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/precificacao/concorrencia" element={<ProtectedRoute module="precificacao"><DashboardLayout><AnaliseConcorrencia /></DashboardLayout></ProtectedRoute>} />
            <Route path="/precificacao/concorrentes" element={<ProtectedRoute module="precificacao"><DashboardLayout><Concorrentes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/precificacao/concorrentes/novo" element={<ProtectedRoute module="precificacao"><DashboardLayout><ConcorrenteEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/precificacao/concorrentes/:id/editar" element={<ProtectedRoute module="precificacao"><DashboardLayout><ConcorrenteEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/precificacao/:id" element={<ProtectedRoute module="precificacao"><DashboardLayout><PrecificacaoDetail /></DashboardLayout></ProtectedRoute>} />
            {/* Usuários - acessível por franchise/tenant/platform admins */}
            <Route path="/usuarios" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/usuarios/novo" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/usuarios/:id" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/usuarios/:id/editar" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><ConfiguracoesIndex /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/minha-empresa" element={<ProtectedRoute module="configuracoes" ><DashboardLayout><MinhaEmpresa /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/diretorias" element={<ProtectedRoute module="diretorias" requireFranchiseAdmin><DashboardLayout><Diretorias /></DashboardLayout></ProtectedRoute>} />
            {/* Metas */}
            <Route path="/metas" element={<ProtectedRoute module="metas"><DashboardLayout><Metas /></DashboardLayout></ProtectedRoute>} />
            {/* Aprovações */}
            <Route path="/aprovacoes" element={<ProtectedRoute module="aprovacoes" requireFranchiseAdmin><DashboardLayout><Aprovacoes /></DashboardLayout></ProtectedRoute>} />
            {/* Automações */}
            <Route path="/automacoes" element={<ProtectedRoute module="automacoes" requireFranchiseAdmin><DashboardLayout><Automacoes /></DashboardLayout></ProtectedRoute>} />
            {/* API & Webhooks */}
            <Route path="/api-webhooks" element={<ProtectedRoute module="api_webhooks" requireAdmin><DashboardLayout><ApiWebhooks /></DashboardLayout></ProtectedRoute>} />
            {/* YESia */}
            <Route path="/yesia" element={<ProtectedRoute module="yesia"><DashboardLayout><YesIA /></DashboardLayout></ProtectedRoute>} />
            {/* Documentos */}
            <Route path="/documentos" element={<ProtectedRoute requireFranchiseAdmin module="documentos"><DashboardLayout><Documentos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/documentos/novo" element={<ProtectedRoute requireFranchiseAdmin module="documentos"><DocumentoEdit /></ProtectedRoute>} />
            <Route path="/documentos/:id" element={<ProtectedRoute requireFranchiseAdmin module="documentos"><DocumentoDetail /></ProtectedRoute>} />
            <Route path="/documentos/:id/editar" element={<ProtectedRoute requireFranchiseAdmin module="documentos"><DocumentoEdit /></ProtectedRoute>} />
            {/* Campanhas */}
            <Route path="/campanhas" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhasIndex /></DashboardLayout></ProtectedRoute>} />
            <Route path="/campanhas/novo" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhaEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/campanhas/:id" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhaDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/campanhas/:id/editar" element={<ProtectedRoute module="campanhas"><DashboardLayout><CampanhaEdit /></DashboardLayout></ProtectedRoute>} />

            {/* YESia IA */}
            <Route path="/ia" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAHome /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/config" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/agentes" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAAgents /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/agentes/novo" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAAgentEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/agentes/:id/editar" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAAgentEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/custos" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IATokenDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/knowledge" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAKnowledgeBase /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/memoria" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAMemory /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/treinamento" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IATraining /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/aprendizado" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IALearningJobs /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/analytics" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAAnalytics /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/proatividade" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><IAProactiveRules /></Suspense></DashboardLayout></ProtectedRoute>} />
            {/* Gestor de Tráfego */}
            <Route path="/ia/trafego" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrafficDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/trafego/campanhas" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdCampaigns /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/trafego/campanhas/novo" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdCampaignEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/trafego/campanhas/:id" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdCampaignDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/trafego/campanhas/:id/editar" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdCampaignEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/trafego/atribuicao" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AttributionReport /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/ia/trafego/criativos" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CreativeAnalysis /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Relatórios */}
            <Route path="/relatorios" element={<ProtectedRoute module="relatorios"><DashboardLayout><RelatoriosIndex /></DashboardLayout></ProtectedRoute>} />
            <Route path="/relatorios/ranking" element={<ProtectedRoute module="relatorios"><DashboardLayout><Ranking /></DashboardLayout></ProtectedRoute>} />
            {/* Atalho direto para /ranking - redireciona para ranking apropriado */}
            <Route path="/ranking" element={<ProtectedRoute module="relatorios"><DashboardLayout><Ranking /></DashboardLayout></ProtectedRoute>} />

            {/* Relatórios Diários e Ocupação */}
            <Route path="/relatorios/diarios" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RelatoriosDiarios /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/relatorios/ocupacao" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><OcupacaoSalas /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/relatorios/leads" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><LeadAnalytics /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/relatorios/leads/sem-resposta" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><LeadsSemResposta /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Auditorias */}
            <Route path="/auditorias" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Auditorias /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/auditorias/novo" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AuditoriaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/auditorias/:id" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AuditoriaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/auditorias/:id/editar" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AuditoriaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Tablet - Visão do Profissional */}
            <Route path="/tablet/fila" element={<ProtectedRoute module="tablet_atendimento"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TabletQueue /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/tablet/atendimento/:appointmentId" element={<ProtectedRoute module="tablet_atendimento"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TabletTreatmentView /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Sub-páginas de Configurações */}
            <Route path="/configuracoes/permissoes" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><Permissoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/modulos" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><Modulos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/modulos-crud" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><ModulosCrud /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/integracoes" element={<ProtectedRoute module="integracoes" requireFranchiseAdmin><DashboardLayout><Integracoes /></DashboardLayout></ProtectedRoute>} />

            {/* Multi-tenant: Empresas */}
            <Route path="/configuracoes/empresas" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><Empresas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/empresas/novo" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><EmpresaEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/empresas/:id" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><EmpresaDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/empresas/:id/editar" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><EmpresaEdit /></DashboardLayout></ProtectedRoute>} />

            {/* Multi-tenant: Franquias - franchise_admin pode ver/editar sua própria */}
            <Route path="/configuracoes/franquias" element={<ProtectedRoute module="franqueados" requireFranchiseAdmin><DashboardLayout><MTFranquias /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/franquias/novo" element={<ProtectedRoute module="franqueados" requireAdmin><DashboardLayout><MTFranquiaEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/franquias/:id" element={<ProtectedRoute module="franqueados" requireFranchiseAdmin><DashboardLayout><MTFranquiaDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/franquias/:id/editar" element={<ProtectedRoute module="franqueados" requireFranchiseAdmin><DashboardLayout><MTFranquiaEdit /></DashboardLayout></ProtectedRoute>} />

            {/* Multi-tenant: Usuários - acessível por franchise/tenant/platform admins */}
            <Route path="/configuracoes/usuarios" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/usuarios/novo" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/usuarios/:id" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/usuarios/:id/editar" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />

            {/* Multi-tenant: Dashboard Profiles - acessível por franchise/tenant/platform admins */}
            <Route path="/configuracoes/dashboard-profiles" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfiles /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/dashboard-profiles/novo" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfileEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/dashboard-profiles/:id" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfileDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/dashboard-profiles/:id/editar" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfileEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/dashboard-profiles/:profileId/boards/:boardId" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardBoardConfig /></DashboardLayout></ProtectedRoute>} />

            {/* Multi-tenant: Departamentos - acessível por franchise/tenant/platform */}
            <Route path="/configuracoes/departamentos" element={<ProtectedRoute module="departamentos"><DashboardLayout><Departamentos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/departamentos/novo" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/departamentos/:id" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/departamentos/:id/editar" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />
            {/* Atalho direto para departamentos */}
            <Route path="/departamentos" element={<ProtectedRoute module="departamentos"><DashboardLayout><Departamentos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/departamentos/novo" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/departamentos/:id" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/departamentos/:id/editar" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />

            {/* Multi-tenant: Equipes - acessível por franchise/tenant/platform */}
            <Route path="/configuracoes/equipes" element={<ProtectedRoute module="equipes"><DashboardLayout><Equipes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/equipes/novo" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/equipes/:id" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/equipes/:id/editar" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />
            {/* Atalho direto para equipes */}
            <Route path="/equipes" element={<ProtectedRoute module="equipes"><DashboardLayout><Equipes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/equipes/novo" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/equipes/:id" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/equipes/:id/editar" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />

            {/* Multi-tenant: Cargos e Permissões - franchise admin pode gerenciar cargos da sua unidade */}
            <Route path="/configuracoes/cargos" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Cargos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/cargos/:id/permissoes" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><CargoPermissoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/cofre-senhas" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/cofre-senhas/novo" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhasEdit /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/cofre-senhas/:id" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhasDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/cofre-senhas/:id/editar" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhasEdit /></DashboardLayout></ProtectedRoute>} />

            {/* Configurações - Jornada do Cliente */}
            <Route path="/configuracoes/notificacoes-agendamento" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><NotificacoesAgendamento /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/nps" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><NPSConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/auto-agendamento" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SelfSchedulingConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/salas" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Salas /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/salas/novo" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SalaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/salas/:id" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SalaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/salas/:id/editar" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SalaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/banners" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Banners /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/banners/novo" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><BannerEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/configuracoes/banners/:id/editar" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><BannerEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Estoque (lazy loaded) */}
            <Route path="/estoque" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/insumos" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueInsumos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/insumos/novo" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueInsumoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/insumos/:id" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueInsumoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/insumos/:id/editar" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueInsumoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/movimentacoes" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueMovimentacoes /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/movimentacoes/entrada" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueEntrada /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/movimentacoes/saida" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueSaida /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/consumos" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueConsumos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/vinculos" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueVinculos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/fornecedores" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueFornecedores /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/fornecedores/:id" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueFornecedorDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/fornecedores/:supplierId/tabela-precos/nova" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueTabelaPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/fornecedores/:supplierId/tabela-precos/:id" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueTabelaPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/estoque/cotacao" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EstoqueCotacao /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Vendas (lazy loaded) */}
            <Route path="/vendas" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><VendasDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/novo" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><VendaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/:id" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><VendaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/:id/editar" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><VendaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/tabela-precos" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TabelaPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/tabela-precos/:serviceId/editar" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TabelaPrecoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/comissoes" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Comissoes /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/comissoes/configuracao" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ComissaoConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/todas" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Vendas /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/relatorios" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RelatorioPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/tratamentos" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TreatmentPlans /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/vendas/tratamentos/:planId" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TreatmentPlanDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Financeiro (lazy loaded) */}
            <Route path="/financeiro" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FinanceiroDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/lancamentos" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Lancamentos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/receitas" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Receitas /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/despesas" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Despesas /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/lancamentos/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><LancamentoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/lancamentos/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><LancamentoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/contas" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Contas /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/contas/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ContaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/contas/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ContaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/categorias" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Categorias /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/relatorios" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FinanceiroRelatorios /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/recorrentes" element={<Navigate to="/financeiro/despesas?tab=recorrentes" replace />} />
            <Route path="/financeiro/recorrentes/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RecorrenteEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/recorrentes/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RecorrenteEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/folha" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Folha /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/folha/funcionario/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FolhaFuncionarioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/folha/funcionario/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FolhaFuncionarioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/folha/funcionario/:id" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FolhaFuncionarioDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/folha/:id" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FolhaDetalhe /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/conciliacao" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConciliacaoIndex /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/conciliacao/importar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConciliacaoImportar /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/conciliacao/:id" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConciliacaoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/fluxo-caixa" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FluxoCaixa /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/projecao" element={<ProtectedRoute module="projecao"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProjecaoIndex /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/projecao/importar" element={<ProtectedRoute module="projecao"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProjecaoImportar /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/financeiro/projecao/:id" element={<ProtectedRoute module="projecao"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProjecaoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Patrimônio - lazy loaded */}
            <Route path="/patrimonio" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PatrimonioDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/patrimonio/ativos" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PatrimonioIndex /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/patrimonio/novo" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PatrimonioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/patrimonio/categorias" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PatrimonioCategorias /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/patrimonio/relatorios" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PatrimonioRelatorios /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/patrimonio/:id/editar" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PatrimonioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/patrimonio/:id" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PatrimonioDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Produtividade MEI - lazy loaded */}
            <Route path="/produtividade" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Produtividade /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/produtividade/resumo" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProdutividadeResumo /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/produtividade/ponto" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CartaoPonto /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/produtividade/escala-impressao" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EscalaMensalPrint /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/produtividade/ponto/config" element={<ProtectedRoute requireFranchiseAdmin module="produtividade"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PontoConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/meu-ponto" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><MeuPonto /></Suspense>} />
            <Route path="/minha-presenca" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><MinhaPresenca /></Suspense>} />

            {/* Checklist Diário - lazy loaded */}
            <Route path="/checklist" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistTemplates /></Suspense></ProtectedRoute>} />
            <Route path="/checklist/novo" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistTemplateEdit /></Suspense></ProtectedRoute>} />
            <Route path="/checklist/:id" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistTemplateDetail /></Suspense></ProtectedRoute>} />
            <Route path="/checklist/:id/editar" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistTemplateEdit /></Suspense></ProtectedRoute>} />
            <Route path="/checklist/diario" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistDiario /></Suspense></ProtectedRoute>} />
            <Route path="/checklist/diario/gestor" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistDiarioGestor /></Suspense></ProtectedRoute>} />
            <Route path="/checklist/relatorios" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistRelatorios /></Suspense></ProtectedRoute>} />
            <Route path="/checklist/dashboard" element={<ProtectedRoute module="checklist"><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ChecklistDashboard /></Suspense></ProtectedRoute>} />

            {/* Tarefas (Delegação) - lazy loaded */}
            <Route path="/tarefas" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Tarefas /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/tarefas/novo" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TarefaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/tarefas/dashboard" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TarefasDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/tarefas/configuracoes" element={<ProtectedRoute requireFranchiseAdmin module="tarefas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TarefasConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/tarefas/:id" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TarefaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/tarefas/:id/editar" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TarefaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Processos e Procedimentos (SOPs) - lazy loaded */}
            <Route path="/processos/dashboard" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/processos" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPsList /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/processos/novo" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/processos/categorias" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPCategorias /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/processos/:id" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/processos/:id/editar" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/processos/execucao/:executionId" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPExecution /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/processos/:id/fluxo" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SOPFlow /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* FAQ - Perguntas Frequentes (lazy loaded) */}
            <Route path="/faq" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FAQList /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/faq/novo" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FAQEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/faq/dashboard" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FAQDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/faq/:id" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FAQDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/faq/:id/editar" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><FAQEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Treinamentos - Admin (lazy loaded) */}
            <Route path="/treinamentos" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/trilhas" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingTracks /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/trilhas/novo" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingTrackEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/trilhas/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingTrackDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/trilhas/:id/editar" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingTrackEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/trilhas/:trackId/modulos/novo" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingModuleEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/trilhas/:trackId/modulos/:id/editar" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingModuleEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/aulas/novo" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingLessonEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/treinamentos/aulas/:id/editar" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrainingLessonEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Treinamentos - Colaborador (lazy loaded) */}
            <Route path="/aprender" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><MeusTreinamentos /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/aprender/trilha/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TrackView /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/aprender/aula/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><LessonPlayer /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/aprender/quiz/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><QuizPlayer /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Gamificação (lazy loaded) */}
            <Route path="/gamificacao" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><GamificationDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/gamificacao/ranking" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><Leaderboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/gamificacao/conquistas" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><BadgesGallery /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/gamificacao/historico" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><XPHistory /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Onboarding - Nova Empresa */}
            <Route path="/onboarding/empresa" element={<ProtectedRoute requireAdmin><TenantOnboarding /></ProtectedRoute>} />

            {/* Portal Franquia */}
            <Route path="/portal-franquia" element={<ProtectedRoute module="franqueados"><DashboardLayout><FranquiaDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/leads" element={<ProtectedRoute module="leads"><DashboardLayout><FranquiaLeads /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/funil" element={<ProtectedRoute module="funil"><DashboardLayout><FranquiaFunil /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/metas" element={<ProtectedRoute module="metas"><DashboardLayout><FranquiaMetas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/configuracoes" element={<ProtectedRoute module="configuracoes"><DashboardLayout><FranquiaConfiguracoes /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/servicos" element={<ProtectedRoute module="servicos"><DashboardLayout><FranquiaServicos /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/formularios" element={<ProtectedRoute module="formularios"><DashboardLayout><FranquiaFormularios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/relatorios" element={<ProtectedRoute module="relatorios"><DashboardLayout><FranquiaRelatorios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/whatsapp" element={<ProtectedRoute module="whatsapp"><DashboardLayout><FranquiaWhatsApp /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/ranking" element={<ProtectedRoute module="ranking"><DashboardLayout><FranquiaRanking /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/usuarios" element={<ProtectedRoute module="usuarios"><DashboardLayout><FranquiaUsuarios /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/campanhas" element={<ProtectedRoute module="campanhas"><DashboardLayout><FranquiaCampanhas /></DashboardLayout></ProtectedRoute>} />
            <Route path="/portal-franquia/perfil" element={<ProtectedRoute module="franqueados"><DashboardLayout><FranquiaPerfil /></DashboardLayout></ProtectedRoute>} />

            {/* ═══════════════════════════════════════════ */}
            {/* IMOBILIÁRIO - 15 módulos                  */}
            {/* ═══════════════════════════════════════════ */}

            {/* Imóveis (CORE) */}
            <Route path="/imoveis/dashboard" element={<ProtectedRoute module="imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ImoveisDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis" element={<ProtectedRoute module="imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ImoveisLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/novo" element={<ProtectedRoute module="imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ImovelEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/:id" element={<ProtectedRoute module="imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ImovelDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/:id/editar" element={<ProtectedRoute module="imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ImovelEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/configuracoes" element={<ProtectedRoute module="imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ImovelConfiguracoes /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Edifícios */}
            <Route path="/edificios" element={<ProtectedRoute module="edificios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EdificiosLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/edificios/novo" element={<ProtectedRoute module="edificios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EdificioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/edificios/:id" element={<ProtectedRoute module="edificios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EdificioDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/edificios/:id/editar" element={<ProtectedRoute module="edificios"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EdificioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Construtoras */}
            <Route path="/construtoras" element={<ProtectedRoute module="construtoras"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConstrutorasLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/construtoras/novo" element={<ProtectedRoute module="construtoras"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConstrutoraEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/construtoras/:id" element={<ProtectedRoute module="construtoras"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConstrutoraDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/construtoras/:id/editar" element={<ProtectedRoute module="construtoras"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConstrutoraEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Proprietários */}
            <Route path="/proprietarios" element={<ProtectedRoute module="proprietarios_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProprietariosLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/proprietarios/novo" element={<ProtectedRoute module="proprietarios_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProprietarioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/proprietarios/:id" element={<ProtectedRoute module="proprietarios_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProprietarioDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/proprietarios/:id/editar" element={<ProtectedRoute module="proprietarios_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ProprietarioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Captação */}
            <Route path="/captacao" element={<ProtectedRoute module="captacao"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CaptadoresLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/captacao/novo" element={<ProtectedRoute module="captacao"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CaptadorEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/captacao/:id" element={<ProtectedRoute module="captacao"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CaptadorDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/captacao/:id/editar" element={<ProtectedRoute module="captacao"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CaptadorEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Corretores */}
            <Route path="/corretores" element={<ProtectedRoute module="corretores"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CorretoresLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/corretores/novo" element={<ProtectedRoute module="corretores"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CorretorEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/corretores/:id" element={<ProtectedRoute module="corretores"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CorretorDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/corretores/:id/editar" element={<ProtectedRoute module="corretores"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CorretorEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Clientes Imobiliários */}
            <Route path="/clientes-imoveis" element={<ProtectedRoute module="clientes_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClientesImoveisLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/clientes-imoveis/novo" element={<ProtectedRoute module="clientes_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClienteImovelEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/clientes-imoveis/:id" element={<ProtectedRoute module="clientes_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClienteImovelDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/clientes-imoveis/:id/editar" element={<ProtectedRoute module="clientes_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClienteImovelEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Consultas de Imóveis */}
            <Route path="/imoveis/consultas" element={<ProtectedRoute module="consultas_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConsultasImoveisLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/consultas/:id" element={<ProtectedRoute module="consultas_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ConsultaImovelDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Tabelas de Preço */}
            <Route path="/imoveis/tabelas-preco" element={<ProtectedRoute module="tabelas_preco"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TabelasPrecoLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/tabelas-preco/novo" element={<ProtectedRoute module="tabelas_preco"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TabelaPrecoImovelEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/tabelas-preco/:id/editar" element={<ProtectedRoute module="tabelas_preco"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TabelaPrecoImovelEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Rede Colaborativa */}
            <Route path="/imoveis/rede" element={<ProtectedRoute module="tabelas_rede"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RedeTabelasPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/rede/novo" element={<ProtectedRoute module="tabelas_rede"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RedeTabelaEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/rede/:id" element={<ProtectedRoute module="tabelas_rede"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RedeTabelaDetailPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/rede/:id/editar" element={<ProtectedRoute module="tabelas_rede"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RedeTabelaEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/rede/parcerias" element={<ProtectedRoute module="tabelas_rede"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RedeParceriasPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Portais Imobiliários */}
            <Route path="/imoveis/portais" element={<ProtectedRoute module="portais_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PortaisImoveisPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/portais/exportar" element={<ProtectedRoute module="portais_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PortalXmlExportPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Pedidos */}
            <Route path="/imoveis/pedidos" element={<ProtectedRoute module="pedidos_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PedidosImoveisLista /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/pedidos/:id" element={<ProtectedRoute module="pedidos_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PedidoImovelDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Email Marketing Imobiliário */}
            <Route path="/imoveis/email-marketing" element={<ProtectedRoute module="email_marketing_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><EmailCampaignsPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/email-marketing/novo" element={<ProtectedRoute module="email_marketing_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CampaignEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/email-marketing/:id/editar" element={<ProtectedRoute module="email_marketing_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CampaignEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Conteúdo Imobiliário */}
            <Route path="/imoveis/conteudo" element={<ProtectedRoute module="conteudo_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><NoticiasImoveisPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/conteudo/noticias/novo" element={<ProtectedRoute module="conteudo_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><NoticiaEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/conteudo/noticias/:id/editar" element={<ProtectedRoute module="conteudo_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><NoticiaEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/conteudo/paginas" element={<ProtectedRoute module="conteudo_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PaginasImoveisPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/conteudo/paginas/novo" element={<ProtectedRoute module="conteudo_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PaginaEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/conteudo/paginas/:id/editar" element={<ProtectedRoute module="conteudo_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PaginaEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Relatórios Imobiliários */}
            <Route path="/imoveis/relatorios" element={<ProtectedRoute module="relatorios_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><RelatoriosImoveisPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Propostas de Imóveis */}
            <Route path="/imoveis/propostas" element={<ProtectedRoute module="propostas_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PropostasImoveisPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/propostas/novo" element={<ProtectedRoute module="propostas_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PropostaImovelEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/propostas/:id" element={<ProtectedRoute module="propostas_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PropostaImovelDetailPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/propostas/:id/editar" element={<ProtectedRoute module="propostas_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PropostaImovelEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Contratos de Imóveis */}
            <Route path="/imoveis/contratos" element={<ProtectedRoute module="contratos_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ContratosImoveisPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/contratos/novo" element={<ProtectedRoute module="contratos_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ContratoImovelEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/contratos/:id" element={<ProtectedRoute module="contratos_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ContratoImovelDetailPage /></Suspense></DashboardLayout></ProtectedRoute>} />
            <Route path="/imoveis/contratos/:id/editar" element={<ProtectedRoute module="contratos_imoveis"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ContratoImovelEditPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Localizações */}
            <Route path="/configuracoes/localizacoes" element={<ProtectedRoute module="localizacoes"><DashboardLayout><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><LocalizacoesPage /></Suspense></DashboardLayout></ProtectedRoute>} />

            {/* Totem de Check-in (Público) */}
            <Route path="/totem" element={<Totem />} />
            <Route path="/totem/:slug" element={<Totem />} />

            {/* Totem de Ponto (Público - CLT) */}
            <Route path="/totem-ponto" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TotemPonto /></Suspense>} />

            {/* Totem de Presença (Público - MEI/Prestadores) */}
            <Route path="/totem-presenca" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TotemPresenca /></Suspense>} />

            {/* Portal da Influenciadora - Novas rotas /influenciadores/* */}
            <Route path="/influenciadores" element={<CadastroInfluenciadora />} />
            <Route path="/influenciadores/cadastro" element={<Navigate to="/influenciadores" replace />} />
            <Route path="/influenciadores/*" element={
              <InfluenciadoraAuthProvider>
                <Routes>
                  <Route path="login" element={<LoginInfluenciadora />} />
                  <Route path="onboarding" element={<OnboardingInfluenciadora />} />
                  <Route path="painel" element={
                    <InfluenciadoraProtectedRoute>
                      <PortalInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="perfil" element={
                    <InfluenciadoraProtectedRoute>
                      <MeuPerfilInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="valores" element={
                    <InfluenciadoraProtectedRoute>
                      <MeusValoresInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="indicacoes" element={
                    <InfluenciadoraProtectedRoute>
                      <MinhasIndicacoesInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="ganhos" element={
                    <InfluenciadoraProtectedRoute>
                      <MeusGanhosInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="permutas" element={
                    <InfluenciadoraProtectedRoute>
                      <MinhasPermutasInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="posts" element={
                    <InfluenciadoraProtectedRoute>
                      <MeusPostsInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="contrato" element={
                    <InfluenciadoraProtectedRoute>
                      <MeuContratoInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                  <Route path="promocoes" element={
                    <InfluenciadoraProtectedRoute>
                      <MinhasPromocoesInfluenciadora />
                    </InfluenciadoraProtectedRoute>
                  } />
                </Routes>
              </InfluenciadoraAuthProvider>
            } />

            {/* Redirects: rotas antigas /influenciadora/* → /influenciadores/* */}
            <Route path="/influenciadora/cadastro" element={<Navigate to="/influenciadores" replace />} />
            <Route path="/influenciadora/login" element={<Navigate to="/influenciadores/login" replace />} />
            <Route path="/influenciadora/portal" element={<Navigate to="/influenciadores/painel" replace />} />
            <Route path="/influenciadora/onboarding" element={<Navigate to="/influenciadores/onboarding" replace />} />
            {/* Manter rota pública de assinatura de contrato */}
            <Route path="/influenciadora/contrato/:contratoId/assinar" element={<InfluenciadoraContratoAssinatura />} />
            {/* Catch-all: qualquer outra rota antiga redireciona */}
            <Route path="/influenciadora/*" element={<Navigate to="/influenciadores" replace />} />

            {/* Cadastro público de parceiro (sem autenticação) */}
            <Route path="/parceiro/cadastro" element={<CadastroParceiro />} />

            {/* Portal do Parceiro (Self-Service com autenticação) */}
            <Route path="/parceiro/*" element={
              <ParceriaAuthProvider>
                <Routes>
                  <Route path="login" element={<LoginParceiro />} />
                  <Route path="portal" element={
                    <ParceriaProtectedRoute>
                      <PortalParceiro />
                    </ParceriaProtectedRoute>
                  } />
                  <Route path="indicacoes" element={
                    <ParceriaProtectedRoute>
                      <PortalParceiroIndicacoes />
                    </ParceriaProtectedRoute>
                  } />
                  <Route path="perfil" element={
                    <ParceriaProtectedRoute>
                      <PortalParceiro />
                    </ParceriaProtectedRoute>
                  } />
                  <Route path="beneficios" element={
                    <ParceriaProtectedRoute>
                      <PortalParceiro />
                    </ParceriaProtectedRoute>
                  } />
                  <Route path="relatorios" element={
                    <ParceriaProtectedRoute>
                      <PortalParceiroIndicacoes />
                    </ParceriaProtectedRoute>
                  } />
                  <Route path="ferramentas" element={
                    <ParceriaProtectedRoute>
                      <PortalParceiro />
                    </ParceriaProtectedRoute>
                  } />
                  {/* Rota catch-all: /parceiro/CODIGO → login pré-preenchido */}
                  <Route path=":codigo" element={<ParceiroCodigoRedirect />} />
                  <Route index element={<Navigate to="login" replace />} />
                </Routes>
              </ParceriaAuthProvider>
            } />

            {/* Formulário Público (Sem autenticação) */}
            <Route path="/form/:slug" element={<FormularioPublico />} />
            <Route path="/formulario/:slug" element={<FormularioPublico />} />
            {/* Auto-agendamento e NPS público */}
            <Route path="/agendar/:franchiseSlug" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AutoAgendamento /></Suspense>} />
            <Route path="/nps/:token" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><NPSPublico /></Suspense>} />
            <Route path="/trabalhe-conosco" element={<VagasPublicas />} />
            <Route path="/vagas" element={<VagasPublicas />} />

            {/* Site Público - Imóveis (Sem autenticação, para subdomínios de tenant) */}
            <Route path="/site" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><SiteHomePage /></Suspense>} />
            <Route path="/busca" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><BuscaImoveis /></Suspense>} />
            <Route path="/imovel/:slug" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><DetalheImovelPublico /></Suspense>} />
            <Route path="/sitemap.xml" element={<Suspense fallback={<div>Gerando sitemap...</div>}><SitemapXml /></Suspense>} />

            {/* Proposta Pública (Sem autenticação) */}
            <Route path="/proposta/:token" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PropostaPublicaPage /></Suspense>} />

            {/* Assinatura de Contrato (Sem autenticação) */}
            <Route path="/contrato-imovel/:token/assinar" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ContratoAssinaturaPage /></Suspense>} />


            {/* Portal do Corretor */}
            <Route path="/corretor/login" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><LoginCorretor /></Suspense>} />
            <Route path="/corretor/portal" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><PortalCorretor /></Suspense>} />
            <Route path="/corretor/imoveis" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CorretorImoveis /></Suspense>} />
            <Route path="/corretor/propostas" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CorretorPropostasPage /></Suspense>} />
            <Route path="/corretor/perfil" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><CorretorPerfilPage /></Suspense>} />

            {/* Portal Cliente Imobiliário */}
            <Route path="/cliente-imovel" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClienteImoveisDashboard /></Suspense>} />
            <Route path="/cliente-imovel/propostas" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClientePropostasPage /></Suspense>} />
            <Route path="/cliente-imovel/contratos" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClienteContratosPage /></Suspense>} />
            <Route path="/cliente-imovel/faturas" element={<Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><ClienteFaturasPage /></Suspense>} />

            {/* Loja Pública (Sem autenticação) */}
            <Route path="/loja" element={<LojaPublica />} />
            <Route path="/loja/:slug" element={<LojaProdutoPublico />} />


            {/* Portal do Cliente (Autenticação própria) */}
            <Route path="/cliente" element={<ClienteLogin />} />
            <Route path="/cliente/agendar/:franchiseSlug" element={<ClienteAgendar />} />
            <Route path="/cliente/agendar" element={<ClienteAgendar />} />
            <Route path="/cliente/*" element={
              <ClienteAuthProvider>
                <Routes>
                  <Route path="dashboard" element={
                    <ClienteProtectedRoute>
                      <ClienteDashboard />
                    </ClienteProtectedRoute>
                  } />
                  <Route path="agendamentos" element={
                    <ClienteProtectedRoute>
                      <ClienteAgendamentos />
                    </ClienteProtectedRoute>
                  } />
                  <Route path="servicos" element={
                    <ClienteProtectedRoute>
                      <ClienteServicos />
                    </ClienteProtectedRoute>
                  } />
                  <Route path="historico" element={
                    <ClienteProtectedRoute>
                      <ClienteHistorico />
                    </ClienteProtectedRoute>
                  } />
                  <Route path="perfil" element={
                    <ClienteProtectedRoute>
                      <ClientePerfil />
                    </ClienteProtectedRoute>
                  } />
                </Routes>
              </ClienteAuthProvider>
            } />

            <Route path="*" element={<NotFound />} />
              </Routes>
            </BrandingProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
