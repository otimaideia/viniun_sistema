import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Configuracoes
import ConfiguracoesIndex from "@/pages/configuracoes/ConfiguracoesIndex";
import Permissoes from "@/pages/configuracoes/Permissoes";
import Modulos from "@/pages/configuracoes/Modulos";
import ModulosCrud from "@/pages/configuracoes/ModulosCrud";
import Integracoes from "@/pages/configuracoes/Integracoes";

// Multi-tenant CRUD
import Empresas from "@/pages/configuracoes/Empresas";
import EmpresaDetail from "@/pages/configuracoes/EmpresaDetail";
import EmpresaEdit from "@/pages/configuracoes/EmpresaEdit";
import MTFranquias from "@/pages/configuracoes/Franquias";
import MTFranquiaDetail from "@/pages/configuracoes/FranquiaDetail";
import MTFranquiaEdit from "@/pages/configuracoes/FranquiaEdit";
import MTUsuarios from "@/pages/configuracoes/Usuarios";
import MTUsuarioDetail from "@/pages/configuracoes/UsuarioDetail";
import MTUsuarioEdit from "@/pages/configuracoes/UsuarioEdit";

// Multi-tenant: Dashboard Profiles
import DashboardProfiles from "@/pages/configuracoes/DashboardProfiles";
import DashboardProfileDetail from "@/pages/configuracoes/DashboardProfileDetail";
import DashboardProfileEdit from "@/pages/configuracoes/DashboardProfileEdit";
import DashboardBoardConfig from "@/pages/configuracoes/DashboardBoardConfig";

// Multi-tenant: Departamentos e Equipes
import Departamentos from "@/pages/configuracoes/Departamentos";
import DepartamentoDetail from "@/pages/configuracoes/DepartamentoDetail";
import DepartamentoEdit from "@/pages/configuracoes/DepartamentoEdit";
import Equipes from "@/pages/configuracoes/Equipes";
import EquipeDetail from "@/pages/configuracoes/EquipeDetail";
import EquipeEdit from "@/pages/configuracoes/EquipeEdit";

// Multi-tenant: Cargos e Permissoes
import Cargos from "@/pages/configuracoes/Cargos";
import CargoPermissoes from "@/pages/configuracoes/CargoPermissoes";

// Multi-tenant: Cofre de Senhas
import CofreSenhas from "@/pages/configuracoes/CofreSenhas";
import CofreSenhasDetail from "@/pages/configuracoes/CofreSenhasDetail";
import CofreSenhasEdit from "@/pages/configuracoes/CofreSenhasEdit";

// Diretorias
import Diretorias from "@/pages/configuracoes/Diretorias";

// Jornada do Cliente (lazy loading)
const NotificacoesAgendamento = lazy(() => import("@/pages/configuracoes/NotificacoesAgendamento"));
const NPSConfig = lazy(() => import("@/pages/configuracoes/NPSConfig"));
const SelfSchedulingConfig = lazy(() => import("@/pages/configuracoes/SelfSchedulingConfig"));
const Salas = lazy(() => import("@/pages/configuracoes/Salas"));
const SalaDetail = lazy(() => import("@/pages/configuracoes/SalaDetail"));
const SalaEdit = lazy(() => import("@/pages/configuracoes/SalaEdit"));
const Banners = lazy(() => import("@/pages/configuracoes/Banners"));
const BannerEdit = lazy(() => import("@/pages/configuracoes/BannerEdit"));

const LazySpinner = <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

export function ConfigRoutes() {
  return (
    <>
      <Route path="/configuracoes" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><ConfiguracoesIndex /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/diretorias" element={<ProtectedRoute module="diretorias" requireFranchiseAdmin><DashboardLayout><Diretorias /></DashboardLayout></ProtectedRoute>} />

      {/* Sub-paginas de Configuracoes */}
      <Route path="/configuracoes/permissoes" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><Permissoes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/modulos" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><Modulos /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/modulos-crud" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><ModulosCrud /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/integracoes" element={<ProtectedRoute module="integracoes" requireFranchiseAdmin><DashboardLayout><Integracoes /></DashboardLayout></ProtectedRoute>} />

      {/* Multi-tenant: Empresas */}
      <Route path="/configuracoes/empresas" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><Empresas /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/empresas/novo" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><EmpresaEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/empresas/:id" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><EmpresaDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/empresas/:id/editar" element={<ProtectedRoute module="configuracoes" requireAdmin><DashboardLayout><EmpresaEdit /></DashboardLayout></ProtectedRoute>} />

      {/* Multi-tenant: Franquias */}
      <Route path="/configuracoes/franquias" element={<ProtectedRoute module="franqueados" requireFranchiseAdmin><DashboardLayout><MTFranquias /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/franquias/novo" element={<ProtectedRoute module="franqueados" requireAdmin><DashboardLayout><MTFranquiaEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/franquias/:id" element={<ProtectedRoute module="franqueados" requireFranchiseAdmin><DashboardLayout><MTFranquiaDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/franquias/:id/editar" element={<ProtectedRoute module="franqueados" requireFranchiseAdmin><DashboardLayout><MTFranquiaEdit /></DashboardLayout></ProtectedRoute>} />

      {/* Multi-tenant: Usuarios */}
      <Route path="/configuracoes/usuarios" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarios /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/usuarios/novo" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/usuarios/:id" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/usuarios/:id/editar" element={<ProtectedRoute module="usuarios"><DashboardLayout><MTUsuarioEdit /></DashboardLayout></ProtectedRoute>} />

      {/* Multi-tenant: Dashboard Profiles */}
      <Route path="/configuracoes/dashboard-profiles" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfiles /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/dashboard-profiles/novo" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfileEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/dashboard-profiles/:id" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfileDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/dashboard-profiles/:id/editar" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardProfileEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/dashboard-profiles/:profileId/boards/:boardId" element={<ProtectedRoute module="dashboard" requireFranchiseAdmin><DashboardLayout><DashboardBoardConfig /></DashboardLayout></ProtectedRoute>} />

      {/* Multi-tenant: Departamentos */}
      <Route path="/configuracoes/departamentos" element={<ProtectedRoute module="departamentos"><DashboardLayout><Departamentos /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/departamentos/novo" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/departamentos/:id" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/departamentos/:id/editar" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Atalho direto para departamentos */}
      <Route path="/departamentos" element={<ProtectedRoute module="departamentos"><DashboardLayout><Departamentos /></DashboardLayout></ProtectedRoute>} />
      <Route path="/departamentos/novo" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/departamentos/:id" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/departamentos/:id/editar" element={<ProtectedRoute module="departamentos"><DashboardLayout><DepartamentoEdit /></DashboardLayout></ProtectedRoute>} />

      {/* Multi-tenant: Equipes */}
      <Route path="/configuracoes/equipes" element={<ProtectedRoute module="equipes"><DashboardLayout><Equipes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/equipes/novo" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/equipes/:id" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/equipes/:id/editar" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />
      {/* Atalho direto para equipes */}
      <Route path="/equipes" element={<ProtectedRoute module="equipes"><DashboardLayout><Equipes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/equipes/novo" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/equipes/:id" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/equipes/:id/editar" element={<ProtectedRoute module="equipes"><DashboardLayout><EquipeEdit /></DashboardLayout></ProtectedRoute>} />

      {/* Multi-tenant: Cargos e Permissoes */}
      <Route path="/configuracoes/cargos" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Cargos /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/cargos/:id/permissoes" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><CargoPermissoes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/cofre-senhas" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhas /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/cofre-senhas/novo" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhasEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/cofre-senhas/:id" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhasDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/cofre-senhas/:id/editar" element={<ProtectedRoute module="cofre_senhas" requireFranchiseAdmin><DashboardLayout><CofreSenhasEdit /></DashboardLayout></ProtectedRoute>} />

      {/* Configuracoes - Jornada do Cliente */}
      <Route path="/configuracoes/notificacoes-agendamento" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><NotificacoesAgendamento /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/nps" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><NPSConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/auto-agendamento" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><SelfSchedulingConfig /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/salas" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><Salas /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/salas/novo" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><SalaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/salas/:id" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><SalaDetail /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/salas/:id/editar" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><SalaEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/banners" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><Banners /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/banners/novo" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><BannerEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
      <Route path="/configuracoes/banners/:id/editar" element={<ProtectedRoute module="configuracoes" requireFranchiseAdmin><DashboardLayout><Suspense fallback={LazySpinner}><BannerEdit /></Suspense></DashboardLayout></ProtectedRoute>} />
    </>
  );
}
