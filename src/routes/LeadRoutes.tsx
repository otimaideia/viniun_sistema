import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Leads from "@/pages/Leads";
import LeadsDashboard from "@/pages/LeadsDashboard";
import LeadDetail from "@/pages/LeadDetail";
import LeadEdit from "@/pages/LeadEdit";
import Indicacoes from "@/pages/Indicacoes";
import IndicacaoDetail from "@/pages/IndicacaoDetail";
import FunilVendas from "@/pages/FunilVendas";
import FunilConfig from "@/pages/FunilConfig";
import FunilRelatorios from "@/pages/FunilRelatorios";

export function LeadRoutes() {
  return (
    <>
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
      {/* Indicacoes */}
      <Route path="/indicacoes" element={<ProtectedRoute module="leads"><DashboardLayout><Indicacoes /></DashboardLayout></ProtectedRoute>} />
      <Route path="/indicacoes/:id" element={<ProtectedRoute module="leads"><IndicacaoDetail /></ProtectedRoute>} />
    </>
  );
}
