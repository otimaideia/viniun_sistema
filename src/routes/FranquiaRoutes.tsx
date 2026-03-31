import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Portal Franquia
import FranquiaDashboard from "@/pages/franquia/FranquiaDashboard";
import FranquiaLeads from "@/pages/franquia/FranquiaLeads";
import FranquiaFunil from "@/pages/franquia/FranquiaFunil";
import FranquiaMetas from "@/pages/franquia/FranquiaMetas";
import FranquiaConfiguracoes from "@/pages/franquia/FranquiaConfiguracoes";
import FranquiaServicos from "@/pages/franquia/FranquiaServicos";
import FranquiaFormularios from "@/pages/franquia/FranquiaFormularios";
import FranquiaRelatorios from "@/pages/franquia/FranquiaRelatorios";
import FranquiaWhatsApp from "@/pages/franquia/FranquiaWhatsApp";
import FranquiaRanking from "@/pages/franquia/FranquiaRanking";
import FranquiaUsuarios from "@/pages/franquia/FranquiaUsuarios";
import FranquiaCampanhas from "@/pages/franquia/FranquiaCampanhas";
import FranquiaPerfil from "@/pages/franquia/FranquiaPerfil";

export function FranquiaRoutes() {
  return (
    <>
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
    </>
  );
}
