import { Route, Routes, Navigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Parcerias (Admin)
import Parcerias from "@/pages/Parcerias";
import ParceriaDetail from "@/pages/ParceriaDetail";
import ParceriaEdit from "@/pages/ParceriaEdit";

// Portal do Parceiro (Self-Service)
import PortalParceiro from "@/pages/portal-parceiro/PortalParceiro";
import PortalParceiroIndicacoes from "@/pages/portal-parceiro/PortalParceiroIndicacoes";
import LoginParceiro from "@/pages/portal-parceiro/LoginParceiro";
import CadastroParceiro from "@/pages/portal-parceiro/CadastroParceiro";
import { ParceriaAuthProvider } from "@/contexts/ParceriaAuthContext";
import { ParceriaProtectedRoute } from "@/components/parceiro-portal";

/** Redireciona /parceiro/:codigo para /parceiro/login?codigo=:codigo */
function ParceiroCodigoRedirect() {
  const { codigo } = useParams<{ codigo: string }>();
  return <Navigate to={`/parceiro/login?codigo=${codigo || ''}`} replace />;
}

export function ParceriaRoutes() {
  return (
    <>
      {/* Parcerias Empresariais */}
      <Route path="/parcerias" element={<ProtectedRoute module="parcerias"><DashboardLayout><Parcerias /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parcerias/novo" element={<ProtectedRoute module="parcerias"><DashboardLayout><ParceriaEdit /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parcerias/:id" element={<ProtectedRoute module="parcerias"><DashboardLayout><ParceriaDetail /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parcerias/:id/editar" element={<ProtectedRoute module="parcerias"><DashboardLayout><ParceriaEdit /></DashboardLayout></ProtectedRoute>} />

      {/* Cadastro publico de parceiro (sem autenticacao) */}
      <Route path="/parceiro/cadastro" element={<CadastroParceiro />} />

      {/* Portal do Parceiro (Self-Service com autenticacao) */}
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
            {/* Rota catch-all: /parceiro/CODIGO -> login pre-preenchido */}
            <Route path=":codigo" element={<ParceiroCodigoRedirect />} />
            <Route index element={<Navigate to="login" replace />} />
          </Routes>
        </ParceriaAuthProvider>
      } />
    </>
  );
}
