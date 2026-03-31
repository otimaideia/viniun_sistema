import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import FormularioPublico from "@/pages/FormularioPublico";
import VagasPublicas from "@/pages/VagasPublicas";
import LojaPublica from "@/pages/LojaPublica";
import LojaProdutoPublico from "@/pages/LojaProdutoPublico";
import Totem from "@/pages/Totem";

// Portal do Cliente
import ClienteLogin from "@/pages/cliente/ClienteLogin";
import ClienteDashboard from "@/pages/cliente/ClienteDashboard";
import ClienteAgendamentos from "@/pages/cliente/ClienteAgendamentos";
import ClienteServicos from "@/pages/cliente/ClienteServicos";
import ClienteHistorico from "@/pages/cliente/ClienteHistorico";
import ClientePerfil from "@/pages/cliente/ClientePerfil";
import ClienteAgendar from "@/pages/cliente/ClienteAgendar";
import { ClienteAuthProvider } from "@/contexts/ClienteAuthContext";
import { ClienteProtectedRoute } from "@/components/cliente";

// Lazy-loaded pages
const NPSPublico = lazy(() => import("@/pages/nps/NPSPublico"));
const AutoAgendamento = lazy(() => import("@/pages/AutoAgendamento"));
const TotemPonto = lazy(() => import("@/pages/TotemPonto"));
const TotemPresenca = lazy(() => import("@/pages/TotemPresenca"));

const FullScreenSpinner = <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

export function PublicRoutes() {
  return (
    <>
      {/* Formulario Publico */}
      <Route path="/form/:slug" element={<FormularioPublico />} />
      <Route path="/formulario/:slug" element={<FormularioPublico />} />
      {/* Auto-agendamento e NPS publico */}
      <Route path="/agendar/:franchiseSlug" element={<Suspense fallback={FullScreenSpinner}><AutoAgendamento /></Suspense>} />
      <Route path="/nps/:token" element={<Suspense fallback={FullScreenSpinner}><NPSPublico /></Suspense>} />
      <Route path="/trabalhe-conosco" element={<VagasPublicas />} />
      <Route path="/vagas" element={<VagasPublicas />} />

      {/* Loja Publica */}
      <Route path="/loja" element={<LojaPublica />} />
      <Route path="/loja/:slug" element={<LojaProdutoPublico />} />

      {/* Totem de Check-in */}
      <Route path="/totem" element={<Totem />} />
      <Route path="/totem/:slug" element={<Totem />} />

      {/* Totem de Ponto (CLT) */}
      <Route path="/totem-ponto" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TotemPonto /></Suspense>} />

      {/* Totem de Presenca (MEI/Prestadores) */}
      <Route path="/totem-presenca" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><TotemPresenca /></Suspense>} />

      {/* Portal do Cliente */}
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
    </>
  );
}
