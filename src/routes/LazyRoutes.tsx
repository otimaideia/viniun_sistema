import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const LazySpinner = <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
const FullScreenSpinner = <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

// Estoque
const EstoqueDashboard = lazy(() => import("@/pages/estoque/EstoqueDashboard"));
const EstoqueInsumos = lazy(() => import("@/pages/estoque/EstoqueInsumos"));
const EstoqueInsumoEdit = lazy(() => import("@/pages/estoque/EstoqueInsumoEdit"));
const EstoqueInsumoDetail = lazy(() => import("@/pages/estoque/EstoqueInsumoDetail"));
const EstoqueMovimentacoes = lazy(() => import("@/pages/estoque/EstoqueMovimentacoes"));
const EstoqueEntrada = lazy(() => import("@/pages/estoque/EstoqueEntrada"));
const EstoqueConsumos = lazy(() => import("@/pages/estoque/EstoqueConsumos"));
const EstoqueVinculos = lazy(() => import("@/pages/estoque/EstoqueVinculos"));
const EstoqueFornecedores = lazy(() => import("@/pages/estoque/EstoqueFornecedores"));
const EstoqueSaida = lazy(() => import("@/pages/estoque/EstoqueSaida"));
const EstoqueFornecedorDetail = lazy(() => import("@/pages/estoque/EstoqueFornecedorDetail"));
const EstoqueTabelaPrecos = lazy(() => import("@/pages/estoque/EstoqueTabelaPrecos"));
const EstoqueCotacao = lazy(() => import("@/pages/estoque/EstoqueCotacao"));

// Vendas
const VendasDashboard = lazy(() => import("@/pages/vendas/VendasDashboard"));
const VendaEdit = lazy(() => import("@/pages/vendas/VendaEdit"));
const VendaDetail = lazy(() => import("@/pages/vendas/VendaDetail"));
const TabelaPrecos = lazy(() => import("@/pages/vendas/TabelaPrecos"));
const TabelaPrecoEdit = lazy(() => import("@/pages/vendas/TabelaPrecoEdit"));
const Comissoes = lazy(() => import("@/pages/vendas/Comissoes"));
const ComissaoConfig = lazy(() => import("@/pages/vendas/ComissaoConfig"));
const Vendas = lazy(() => import("@/pages/vendas/Vendas"));
const RelatorioPrecos = lazy(() => import("@/pages/vendas/RelatorioPrecos"));
const TreatmentPlans = lazy(() => import("@/pages/vendas/TreatmentPlans"));
const TreatmentPlanDetail = lazy(() => import("@/pages/vendas/TreatmentPlanDetail"));

// Processos e FAQ
const SOPsList = lazy(() => import("@/pages/processos/SOPsList"));
const SOPEdit = lazy(() => import("@/pages/processos/SOPEdit"));
const SOPDetail = lazy(() => import("@/pages/processos/SOPDetail"));
const SOPExecution = lazy(() => import("@/pages/processos/SOPExecution"));
const SOPDashboard = lazy(() => import("@/pages/processos/SOPDashboard"));
const SOPCategorias = lazy(() => import("@/pages/processos/SOPCategorias"));
const SOPFlow = lazy(() => import("@/pages/processos/SOPFlow"));
const FAQList = lazy(() => import("@/pages/processos/FAQList"));
const FAQEdit = lazy(() => import("@/pages/processos/FAQEdit"));
const FAQDetail = lazy(() => import("@/pages/processos/FAQDetail"));
const FAQDashboard = lazy(() => import("@/pages/processos/FAQDashboard"));

// Treinamentos
const TrainingDashboard = lazy(() => import("@/pages/treinamentos/TrainingDashboard"));
const TrainingTracks = lazy(() => import("@/pages/treinamentos/TrainingTracks"));
const TrainingTrackEdit = lazy(() => import("@/pages/treinamentos/TrainingTrackEdit"));
const TrainingTrackDetail = lazy(() => import("@/pages/treinamentos/TrainingTrackDetail"));
const TrainingModuleEdit = lazy(() => import("@/pages/treinamentos/TrainingModuleEdit"));
const TrainingLessonEdit = lazy(() => import("@/pages/treinamentos/TrainingLessonEdit"));
const MeusTreinamentos = lazy(() => import("@/pages/treinamentos/MeusTreinamentos"));
const TrackView = lazy(() => import("@/pages/treinamentos/TrackView"));
const LessonPlayer = lazy(() => import("@/pages/treinamentos/LessonPlayer"));
const QuizPlayer = lazy(() => import("@/pages/treinamentos/QuizPlayer"));

// Financeiro
const FinanceiroDashboard = lazy(() => import("@/pages/financeiro/FinanceiroDashboard"));
const Lancamentos = lazy(() => import("@/pages/financeiro/Lancamentos"));
const Receitas = lazy(() => import("@/pages/financeiro/Receitas"));
const Despesas = lazy(() => import("@/pages/financeiro/Despesas"));
const LancamentoEdit = lazy(() => import("@/pages/financeiro/LancamentoEdit"));
const Contas = lazy(() => import("@/pages/financeiro/Contas"));
const ContaEdit = lazy(() => import("@/pages/financeiro/ContaEdit"));
const Categorias = lazy(() => import("@/pages/financeiro/Categorias"));
const FinanceiroRelatorios = lazy(() => import("@/pages/financeiro/Relatorios"));
const RecorrenteEdit = lazy(() => import("@/pages/financeiro/RecorrenteEdit"));
const Folha = lazy(() => import("@/pages/financeiro/Folha"));
const FolhaFuncionarioEdit = lazy(() => import("@/pages/financeiro/FolhaFuncionarioEdit"));
const FolhaFuncionarioDetail = lazy(() => import("@/pages/financeiro/FolhaFuncionarioDetail"));
const FolhaDetalhe = lazy(() => import("@/pages/financeiro/FolhaDetalhe"));
const ConciliacaoIndex = lazy(() => import("@/pages/financeiro/ConciliacaoIndex"));
const ConciliacaoImportar = lazy(() => import("@/pages/financeiro/ConciliacaoImportar"));
const ConciliacaoDetail = lazy(() => import("@/pages/financeiro/ConciliacaoDetail"));
const FluxoCaixa = lazy(() => import("@/pages/financeiro/FluxoCaixa"));
const ProjecaoIndex = lazy(() => import("@/pages/financeiro/ProjecaoIndex"));
const ProjecaoImportar = lazy(() => import("@/pages/financeiro/ProjecaoImportar"));
const ProjecaoDetail = lazy(() => import("@/pages/financeiro/ProjecaoDetail"));

// Patrimonio
const PatrimonioDashboard = lazy(() => import("@/pages/patrimonio/PatrimonioDashboard"));
const PatrimonioIndex = lazy(() => import("@/pages/patrimonio/PatrimonioIndex"));
const PatrimonioDetail = lazy(() => import("@/pages/patrimonio/PatrimonioDetail"));
const PatrimonioEdit = lazy(() => import("@/pages/patrimonio/PatrimonioEdit"));
const PatrimonioCategorias = lazy(() => import("@/pages/patrimonio/PatrimonioCategorias"));
const PatrimonioRelatorios = lazy(() => import("@/pages/patrimonio/PatrimonioRelatorios"));

// Produtividade
const Produtividade = lazy(() => import("@/pages/produtividade/Produtividade"));
const ProdutividadeResumo = lazy(() => import("@/pages/produtividade/ProdutividadeResumo"));
const CartaoPonto = lazy(() => import("@/pages/produtividade/CartaoPonto"));
const EscalaMensalPrint = lazy(() => import("@/pages/produtividade/EscalaMensalPrint"));
const MeuPonto = lazy(() => import("@/pages/MeuPonto"));
const MinhaPresenca = lazy(() => import("@/pages/MinhaPresenca"));
const PontoConfig = lazy(() => import("@/pages/configuracoes/PontoConfig"));

// Checklist Diario
const ChecklistTemplates = lazy(() => import("@/pages/checklist/ChecklistTemplates"));
const ChecklistTemplateEdit = lazy(() => import("@/pages/checklist/ChecklistTemplateEdit"));
const ChecklistTemplateDetail = lazy(() => import("@/pages/checklist/ChecklistTemplateDetail"));
const ChecklistDiario = lazy(() => import("@/pages/checklist/ChecklistDiario"));
const ChecklistDiarioGestor = lazy(() => import("@/pages/checklist/ChecklistDiarioGestor"));
const ChecklistRelatorios = lazy(() => import("@/pages/checklist/ChecklistRelatorios"));
const ChecklistDashboard = lazy(() => import("@/pages/checklist/ChecklistDashboard"));

// Tarefas
const Tarefas = lazy(() => import("@/pages/tarefas/Tarefas"));
const TarefaEdit = lazy(() => import("@/pages/tarefas/TarefaEdit"));
const TarefaDetail = lazy(() => import("@/pages/tarefas/TarefaDetail"));
const TarefasDashboard = lazy(() => import("@/pages/tarefas/TarefasDashboard"));
const TarefasConfig = lazy(() => import("@/pages/tarefas/TarefasConfig"));

// Gamificacao
const GamificationDashboard = lazy(() => import("@/pages/gamificacao/GamificationDashboard"));
const Leaderboard = lazy(() => import("@/pages/gamificacao/Leaderboard"));
const BadgesGallery = lazy(() => import("@/pages/gamificacao/BadgesGallery"));
const XPHistory = lazy(() => import("@/pages/gamificacao/XPHistory"));

// YESia IA
const IAHome = lazy(() => import("@/pages/ia/IAHome"));
const IAConfig = lazy(() => import("@/pages/ia/IAConfig"));
const IAAgents = lazy(() => import("@/pages/ia/AIAgents"));
const IAAgentEdit = lazy(() => import("@/pages/ia/AIAgentEdit"));
const IATokenDashboard = lazy(() => import("@/pages/ia/AITokenDashboard"));
const IAKnowledgeBase = lazy(() => import("@/pages/ia/AIKnowledgeBase"));
const IAMemory = lazy(() => import("@/pages/ia/AIMemory"));
const IATraining = lazy(() => import("@/pages/ia/AITraining"));
const IALearningJobs = lazy(() => import("@/pages/ia/AILearningJobs"));
const IAAnalytics = lazy(() => import("@/pages/ia/AIAnalytics"));
const IAProactiveRules = lazy(() => import("@/pages/ia/AIProactiveRules"));
const TrafficDashboard = lazy(() => import("@/pages/ia/traffic/TrafficDashboard"));
const AdCampaigns = lazy(() => import("@/pages/ia/traffic/AdCampaigns"));
const AdCampaignEdit = lazy(() => import("@/pages/ia/traffic/AdCampaignEdit"));
const AdCampaignDetail = lazy(() => import("@/pages/ia/traffic/AdCampaignDetail"));
const AttributionReport = lazy(() => import("@/pages/ia/traffic/AttributionReport"));
const CreativeAnalysis = lazy(() => import("@/pages/ia/traffic/CreativeAnalysis"));

// Auditorias
const Auditorias = lazy(() => import("@/pages/Auditorias"));
const AuditoriaDetail = lazy(() => import("@/pages/AuditoriaDetail"));
const AuditoriaEdit = lazy(() => import("@/pages/AuditoriaEdit"));

// Relatorios lazy
const RelatoriosDiarios = lazy(() => import("@/pages/relatorios/RelatoriosDiarios"));
const OcupacaoSalas = lazy(() => import("@/pages/relatorios/OcupacaoSalas"));
const LeadAnalytics = lazy(() => import("@/pages/relatorios/LeadAnalytics"));
const LeadsSemResposta = lazy(() => import("@/pages/relatorios/LeadsSemResposta"));

// Tablet
const TabletQueue = lazy(() => import("@/pages/tablet/TabletQueue"));
const TabletTreatmentView = lazy(() => import("@/pages/tablet/TabletTreatmentView"));

export function LazyRoutes() {
  return (
    <>
      {/* Relatorios Diarios e Ocupacao */}
      <Route path="/relatorios/diarios" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={LazySpinner}><RelatoriosDiarios /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/relatorios/ocupacao" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={LazySpinner}><OcupacaoSalas /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/relatorios/leads" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={LazySpinner}><LeadAnalytics /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/relatorios/leads/sem-resposta" element={<ProtectedRoute module="relatorios"><DashboardLayout><Suspense fallback={LazySpinner}><LeadsSemResposta /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Auditorias */}
      <Route path="/auditorias" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={LazySpinner}><Auditorias /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/auditorias/novo" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={LazySpinner}><AuditoriaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/auditorias/:id" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={LazySpinner}><AuditoriaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/auditorias/:id/editar" element={<ProtectedRoute module="auditorias"><DashboardLayout><Suspense fallback={LazySpinner}><AuditoriaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Tablet */}
      <Route path="/tablet/fila" element={<ProtectedRoute module="tablet_atendimento"><DashboardLayout><Suspense fallback={LazySpinner}><TabletQueue /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/tablet/atendimento/:appointmentId" element={<ProtectedRoute module="tablet_atendimento"><DashboardLayout><Suspense fallback={LazySpinner}><TabletTreatmentView /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Estoque */}
      <Route path="/estoque" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/insumos" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueInsumos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/insumos/novo" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueInsumoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/insumos/:id" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueInsumoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/insumos/:id/editar" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueInsumoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/movimentacoes" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueMovimentacoes /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/movimentacoes/entrada" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueEntrada /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/movimentacoes/saida" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueSaida /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/consumos" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueConsumos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/vinculos" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueVinculos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/fornecedores" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueFornecedores /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/fornecedores/:id" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueFornecedorDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/fornecedores/:supplierId/tabela-precos/nova" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueTabelaPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/fornecedores/:supplierId/tabela-precos/:id" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueTabelaPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/estoque/cotacao" element={<ProtectedRoute module="estoque"><DashboardLayout><Suspense fallback={LazySpinner}><EstoqueCotacao /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Vendas */}
      <Route path="/vendas" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><VendasDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/novo" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><VendaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/:id" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><VendaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/:id/editar" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><VendaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/tabela-precos" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><TabelaPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/tabela-precos/:serviceId/editar" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><TabelaPrecoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/comissoes" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><Comissoes /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/comissoes/configuracao" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><ComissaoConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/todas" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><Vendas /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/relatorios" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><RelatorioPrecos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/tratamentos" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><TreatmentPlans /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/vendas/tratamentos/:planId" element={<ProtectedRoute module="vendas"><DashboardLayout><Suspense fallback={LazySpinner}><TreatmentPlanDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Financeiro */}
      <Route path="/financeiro" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><FinanceiroDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/lancamentos" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><Lancamentos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/receitas" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><Receitas /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/despesas" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><Despesas /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/lancamentos/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><LancamentoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/lancamentos/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><LancamentoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/contas" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><Contas /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/contas/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><ContaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/contas/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><ContaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/categorias" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><Categorias /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/relatorios" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><FinanceiroRelatorios /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/recorrentes" element={<Navigate to="/financeiro/despesas?tab=recorrentes" replace />} />
      <Route path="/financeiro/recorrentes/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><RecorrenteEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/recorrentes/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><RecorrenteEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/folha" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><Folha /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/folha/funcionario/novo" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><FolhaFuncionarioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/folha/funcionario/:id/editar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><FolhaFuncionarioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/folha/funcionario/:id" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><FolhaFuncionarioDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/folha/:id" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><FolhaDetalhe /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/conciliacao" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><ConciliacaoIndex /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/conciliacao/importar" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><ConciliacaoImportar /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/conciliacao/:id" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><ConciliacaoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/fluxo-caixa" element={<ProtectedRoute module="financeiro"><DashboardLayout><Suspense fallback={LazySpinner}><FluxoCaixa /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/projecao" element={<ProtectedRoute module="projecao"><DashboardLayout><Suspense fallback={LazySpinner}><ProjecaoIndex /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/projecao/importar" element={<ProtectedRoute module="projecao"><DashboardLayout><Suspense fallback={LazySpinner}><ProjecaoImportar /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/financeiro/projecao/:id" element={<ProtectedRoute module="projecao"><DashboardLayout><Suspense fallback={LazySpinner}><ProjecaoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Patrimonio */}
      <Route path="/patrimonio" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={LazySpinner}><PatrimonioDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/patrimonio/ativos" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={LazySpinner}><PatrimonioIndex /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/patrimonio/novo" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={LazySpinner}><PatrimonioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/patrimonio/categorias" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={LazySpinner}><PatrimonioCategorias /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/patrimonio/relatorios" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={LazySpinner}><PatrimonioRelatorios /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/patrimonio/:id/editar" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={LazySpinner}><PatrimonioEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/patrimonio/:id" element={<ProtectedRoute module="patrimonio"><DashboardLayout><Suspense fallback={LazySpinner}><PatrimonioDetail /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Produtividade */}
      <Route path="/produtividade" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={LazySpinner}><Produtividade /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/produtividade/resumo" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={LazySpinner}><ProdutividadeResumo /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/produtividade/ponto" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={LazySpinner}><CartaoPonto /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/produtividade/escala-impressao" element={<ProtectedRoute module="produtividade"><DashboardLayout><Suspense fallback={LazySpinner}><EscalaMensalPrint /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/produtividade/ponto/config" element={<ProtectedRoute requireFranchiseAdmin module="produtividade"><DashboardLayout><Suspense fallback={LazySpinner}><PontoConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/meu-ponto" element={<Suspense fallback={FullScreenSpinner}><MeuPonto /></Suspense>} />
      <Route path="/minha-presenca" element={<Suspense fallback={FullScreenSpinner}><MinhaPresenca /></Suspense>} />

      {/* Checklist Diario */}
      <Route path="/checklist" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistTemplates /></Suspense></ProtectedRoute>} />
      <Route path="/checklist/novo" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistTemplateEdit /></Suspense></ProtectedRoute>} />
      <Route path="/checklist/:id" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistTemplateDetail /></Suspense></ProtectedRoute>} />
      <Route path="/checklist/:id/editar" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistTemplateEdit /></Suspense></ProtectedRoute>} />
      <Route path="/checklist/diario" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistDiario /></Suspense></ProtectedRoute>} />
      <Route path="/checklist/diario/gestor" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistDiarioGestor /></Suspense></ProtectedRoute>} />
      <Route path="/checklist/relatorios" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistRelatorios /></Suspense></ProtectedRoute>} />
      <Route path="/checklist/dashboard" element={<ProtectedRoute module="checklist"><Suspense fallback={LazySpinner}><ChecklistDashboard /></Suspense></ProtectedRoute>} />

      {/* Tarefas */}
      <Route path="/tarefas" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={LazySpinner}><Tarefas /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/tarefas/novo" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={LazySpinner}><TarefaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/tarefas/dashboard" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={LazySpinner}><TarefasDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/tarefas/configuracoes" element={<ProtectedRoute requireFranchiseAdmin module="tarefas"><DashboardLayout><Suspense fallback={LazySpinner}><TarefasConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/tarefas/:id" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={LazySpinner}><TarefaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/tarefas/:id/editar" element={<ProtectedRoute module="tarefas"><DashboardLayout><Suspense fallback={LazySpinner}><TarefaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Processos e SOPs */}
      <Route path="/processos/dashboard" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/processos" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPsList /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/processos/novo" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/processos/categorias" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPCategorias /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/processos/:id" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/processos/:id/editar" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/processos/execucao/:executionId" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPExecution /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/processos/:id/fluxo" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><SOPFlow /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* FAQ */}
      <Route path="/faq" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><FAQList /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/faq/novo" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><FAQEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/faq/dashboard" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><FAQDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/faq/:id" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><FAQDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/faq/:id/editar" element={<ProtectedRoute module="processos"><DashboardLayout><Suspense fallback={LazySpinner}><FAQEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Treinamentos - Admin */}
      <Route path="/treinamentos" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/trilhas" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingTracks /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/trilhas/novo" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingTrackEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/trilhas/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingTrackDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/trilhas/:id/editar" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingTrackEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/trilhas/:trackId/modulos/novo" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingModuleEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/trilhas/:trackId/modulos/:id/editar" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingModuleEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/aulas/novo" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingLessonEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/treinamentos/aulas/:id/editar" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrainingLessonEdit /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Treinamentos - Colaborador */}
      <Route path="/aprender" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><MeusTreinamentos /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/aprender/trilha/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><TrackView /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/aprender/aula/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><LessonPlayer /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/aprender/quiz/:id" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><QuizPlayer /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* Gamificacao */}
      <Route path="/gamificacao" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><GamificationDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/gamificacao/ranking" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><Leaderboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/gamificacao/conquistas" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><BadgesGallery /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/gamificacao/historico" element={<ProtectedRoute module="treinamentos"><DashboardLayout><Suspense fallback={LazySpinner}><XPHistory /></Suspense></DashboardLayout></ProtectedRoute>} />

      {/* YESia IA */}
      <Route path="/ia" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><IAHome /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/config" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IAConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/agentes" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><IAAgents /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/agentes/novo" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IAAgentEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/agentes/:id/editar" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IAAgentEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/custos" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><IATokenDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/knowledge" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IAKnowledgeBase /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/memoria" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IAMemory /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/treinamento" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IATraining /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/aprendizado" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IALearningJobs /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/analytics" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IAAnalytics /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/proatividade" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><IAProactiveRules /></Suspense></DashboardLayout></ProtectedRoute>} />
      {/* Gestor de Trafego */}
      <Route path="/ia/trafego" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><TrafficDashboard /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/trafego/campanhas" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><AdCampaigns /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/trafego/campanhas/novo" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><AdCampaignEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/trafego/campanhas/:id" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><AdCampaignDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/trafego/campanhas/:id/editar" element={<ProtectedRoute module="ai_agents" requireAdmin><DashboardLayout><Suspense fallback={LazySpinner}><AdCampaignEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/trafego/atribuicao" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><AttributionReport /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/ia/trafego/criativos" element={<ProtectedRoute module="ai_agents"><DashboardLayout><Suspense fallback={LazySpinner}><CreativeAnalysis /></Suspense></DashboardLayout></ProtectedRoute>} />
    </>
  );
}
