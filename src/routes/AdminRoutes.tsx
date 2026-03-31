import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Usuarios
import Users from "@/pages/Users";
import UsuarioDetail from "@/pages/UsuarioDetail";
import UsuarioEdit from "@/pages/UsuarioEdit";
import MTUsuarios from "@/pages/configuracoes/Usuarios";
import MTUsuarioDetail from "@/pages/configuracoes/UsuarioDetail";
import MTUsuarioEdit from "@/pages/configuracoes/UsuarioEdit";

// Franqueados
import Franqueados from "@/pages/Franqueados";
import FranqueadoDetail from "@/pages/FranqueadoDetail";
import FranqueadoEdit from "@/pages/FranqueadoEdit";
import MinhaFranquia from "@/pages/MinhaFranquia";
import Franquia from "@/pages/Franquia";

// Agendamentos
import Agendamentos from "@/pages/Agendamentos";
import AgendamentoDetail from "@/pages/AgendamentoDetail";
import AgendamentoEdit from "@/pages/AgendamentoEdit";

// Servicos e Precificacao
import Servicos from "@/pages/Servicos";
import ServicosRouter from "@/pages/ServicosRouter";
import ServicoDetail from "@/pages/ServicoDetail";
import ServicoEdit from "@/pages/ServicoEdit";
import PacoteDetail from "@/pages/PacoteDetail";
import PacoteEdit from "@/pages/PacoteEdit";
import PrecificacaoDashboard from "@/pages/precificacao/PrecificacaoDashboard";
import PrecificacaoDetail from "@/pages/precificacao/PrecificacaoDetail";
import AnaliseConcorrencia from "@/pages/precificacao/AnaliseConcorrencia";
import Concorrentes from "@/pages/precificacao/Concorrentes";
import ConcorrenteEdit from "@/pages/precificacao/ConcorrenteEdit";

// Recrutamento (lazy loading)
const Recrutamento = lazy(() => import("@/pages/Recrutamento"));
const VagaDetail = lazy(() => import("@/pages/VagaDetail"));
const VagaEdit = lazy(() => import("@/pages/VagaEdit"));
const CandidatoDetail = lazy(() => import("@/pages/CandidatoDetail"));
const CandidatoEdit = lazy(() => import("@/pages/CandidatoEdit"));
const EntrevistaDetail = lazy(() => import("@/pages/EntrevistaDetail"));
const EntrevistaEdit = lazy(() => import("@/pages/EntrevistaEdit"));

// Novos Modulos
import Metas from "@/pages/Metas";
import Aprovacoes from "@/pages/Aprovacoes";
import Automacoes from "@/pages/Automacoes";
import ApiWebhooks from "@/pages/ApiWebhooks";
import YesIA from "@/pages/YesIA";

// Documentos
import Documentos from "@/pages/Documentos";
import DocumentoDetail from "@/pages/DocumentoDetail";
import DocumentoEdit from "@/pages/DocumentoEdit";

// Relatorios
import Ranking from "@/pages/relatorios/Ranking";
import RelatoriosIndex from "@/pages/relatorios/RelatoriosIndex";

// Onboarding
import TenantOnboarding from "@/pages/onboarding/TenantOnboarding";

const LazySpinner = <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

export function AdminRoutes() {
  return (
    <>
      {/* Minha Franquia */}
      <Route path="/minha-franquia" element={<ProtectedRoute module="franqueados"><MinhaFranquia /></ProtectedRoute>} />
      {/* Franquia */}
      <Route path="/franquia" element={<ProtectedRoute module="franqueados"><DashboardLayout><Franquia /></DashboardLayout></ProtectedRoute>} />
      <Route path="/franquia/:slug" element={<ProtectedRoute module="franqueados"><DashboardLayout><Franquia /></DashboardLayout></ProtectedRoute>} />
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
      {/* Servicos */}
      <Route path="/servicos" element={<ProtectedRoute module="servicos"><DashboardLayout><ServicosRouter /></DashboardLayout></ProtectedRoute>} />
      <Route path="/servicos/novo" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><ServicoEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/servicos/pacotes/novo" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><PacoteEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/servicos/pacotes/:id" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><PacoteDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/servicos/pacotes/:id/editar" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><PacoteEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/servicos/:id" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><ServicoDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/servicos/:id/editar" element={<ProtectedRoute module="servicos" requireFranchiseAdmin><DashboardLayout><ServicoEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Precificacao */}
      <Route path="/precificacao" element={<ProtectedRoute module="precificacao"><DashboardLayout><PrecificacaoDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/precificacao/concorrencia" element={<ProtectedRoute module="precificacao"><DashboardLayout><AnaliseConcorrencia /></DashboardLayout></ProtectedRoute>} />
      <Route path="/precificacao/concorrentes" element={<ProtectedRoute module="precificacao"><DashboardLayout><Concorrentes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/precificacao/concorrentes/novo" element={<ProtectedRoute module="precificacao"><DashboardLayout><ConcorrenteEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/precificacao/concorrentes/:id/editar" element={<ProtectedRoute module="precificacao"><DashboardLayout><ConcorrenteEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/precificacao/:id" element={<ProtectedRoute module="precificacao"><DashboardLayout><PrecificacaoDetail /></DashboardLayout></ProtectedRoute>} />
      {/* Usuarios - acessivel por franchise/tenant/platform admins */}
      <Route path="/usuarios" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarios /></DashboardLayout></ProtectedRoute>} />
      <Route path="/usuarios/novo" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/usuarios/:id" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/usuarios/:id/editar" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Metas */}
      <Route path="/metas" element={<ProtectedRoute module="metas"><DashboardLayout><Metas /></DashboardLayout></ProtectedRoute>} />
      {/* Aprovacoes */}
      <Route path="/aprovacoes" element={<ProtectedRoute module="aprovacoes" requireFranchiseAdmin><DashboardLayout><Aprovacoes /></DashboardLayout></ProtectedRoute>} />
      {/* Automacoes */}
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
      {/* Recrutamento (lazy loaded) */}
      <Route path="/recrutamento" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={LazySpinner}><Recrutamento /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/vagas/:id" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><VagaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/vagas/:id/editar" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><VagaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/vagas/nova" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><VagaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/candidatos/:id" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><CandidatoDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/candidatos/:id/editar" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><CandidatoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/candidatos/novo" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><CandidatoEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/entrevistas/:id" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><EntrevistaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/entrevistas/:id/editar" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><EntrevistaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/recrutamento/entrevistas/nova" element={<ProtectedRoute module="recrutamento"><DashboardLayout><Suspense fallback={null}><EntrevistaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      {/* Relatorios */}
      <Route path="/relatorios" element={<ProtectedRoute module="relatorios"><DashboardLayout><RelatoriosIndex /></DashboardLayout></ProtectedRoute>} />
      <Route path="/relatorios/ranking" element={<ProtectedRoute module="relatorios"><DashboardLayout><Ranking /></DashboardLayout></ProtectedRoute>} />
      <Route path="/ranking" element={<ProtectedRoute module="relatorios"><DashboardLayout><Ranking /></DashboardLayout></ProtectedRoute>} />
      {/* Onboarding */}
      <Route path="/onboarding/empresa" element={<ProtectedRoute requireAdmin><TenantOnboarding /></ProtectedRoute>} />
    </>
  );
}
